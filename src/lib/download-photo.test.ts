import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { downloadPhoto, getPhotoFilename } from './download-photo';

describe('getPhotoFilename', () => {
  it('sanitizes titles and derives the extension from the actual image type', () => {
    assert.equal(getPhotoFilename('../Café / sunset: "view"?', 'image/jpeg'), 'Cafe-sunset-view.jpg');
    assert.equal(getPhotoFilename('Photo.jpg', 'image/png'), 'Photo-jpg.png');
    assert.equal(getPhotoFilename('CON', 'image/webp'), 'photo-CON.webp');
    assert.equal(getPhotoFilename('🎉', 'image/png'), 'photo.png');
    assert.equal(getPhotoFilename('a'.repeat(200), 'image/png'), `${'a'.repeat(100)}.png`);
  });

  it('rejects non-photo and unsupported content types', () => {
    for (const type of ['text/html', 'image/svg+xml', '', 'constructor', '__proto__']) {
      assert.throws(() => getPhotoFilename('Photo', type), /not a supported photo/);
    }
  });
});

describe('downloadPhoto', () => {
  const photo = { url: '/photos/demo-photo.png', title: 'Astronaut Portrait' };
  const link = { href: '', download: '', click: mock.fn(), remove: mock.fn() };
  const revoke = mock.fn();
  let cleanup: () => void;
  let append: ReturnType<typeof mock.fn>;

  beforeEach(() => {
    link.click.mock.resetCalls();
    link.remove.mock.resetCalls();
    revoke.mock.resetCalls();
    append = mock.fn();
    Object.defineProperty(globalThis, 'window', {
      configurable: true, value: { location: { href: 'http://localhost/gallery' } },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true, value: { createElement: () => link, body: { appendChild: append } },
    });
    mock.method(URL, 'createObjectURL', () => 'blob:photo');
    mock.method(URL, 'revokeObjectURL', revoke);
    mock.method(globalThis, 'setTimeout', ((callback: () => void) => {
      cleanup = callback;
      return 0;
    }) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    mock.restoreAll();
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
  });

  it('fetches the selected source and initiates a named download with deferred cleanup', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      new Response(new Blob(['photo'], { type: 'image/png' })));
    await downloadPhoto(photo);
    assert.deepEqual(fetchMock.mock.calls[0].arguments, [
      'http://localhost/photos/demo-photo.png', { credentials: 'omit' },
    ]);
    assert.equal(link.download, 'Astronaut-Portrait.png');
    assert.equal(link.href, 'blob:photo');
    assert.equal(append.mock.callCount(), 1);
    assert.equal(link.click.mock.callCount(), 1);
    assert.equal(link.remove.mock.callCount(), 1);
    assert.equal(revoke.mock.callCount(), 0);
    cleanup();
    assert.equal(revoke.mock.calls[0].arguments[0], 'blob:photo');
  });

  it('surfaces HTTP errors and allows a subsequent retry', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));
    await assert.rejects(downloadPhoto(photo), /HTTP 404/);
    assert.equal(link.click.mock.callCount(), 0);
    fetchMock.mock.mockImplementation(async () =>
      new Response(new Blob(['photo'], { type: 'image/png' })));
    await downloadPhoto(photo);
    assert.equal(link.click.mock.callCount(), 1);
    cleanup();
  });

  it('explains network and cross-origin failures', async () => {
    mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
    await assert.rejects(downloadPhoto(photo), /connection.*cross-origin/);
    assert.equal(link.click.mock.callCount(), 0);
  });

  it('rejects empty images and HTML responses before creating a download', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      new Response(new Blob([], { type: 'image/png' })));
    await assert.rejects(downloadPhoto(photo), /empty or unavailable/);
    fetchMock.mock.mockImplementation(async () =>
      new Response('<html>Missing</html>', { headers: { 'Content-Type': 'text/html' } }));
    await assert.rejects(downloadPhoto(photo), /not a supported photo/);
    assert.equal(link.click.mock.callCount(), 0);
  });

  it('rejects non-HTTP sources without fetching', async () => {
    const fetchMock = mock.method(globalThis, 'fetch');
    await assert.rejects(downloadPhoto({ ...photo, url: 'javascript:alert(1)' }), /HTTP/);
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it('removes the link and revokes its URL even if clicking fails', async () => {
    mock.method(globalThis, 'fetch', async () =>
      new Response(new Blob(['photo'], { type: 'image/png' })));
    link.click.mock.mockImplementationOnce(() => { throw new Error('Click failed'); });
    await assert.rejects(downloadPhoto(photo), /Click failed/);
    assert.equal(link.remove.mock.callCount(), 1);
    cleanup();
    assert.equal(revoke.mock.callCount(), 1);
  });
});
