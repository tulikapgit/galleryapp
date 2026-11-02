export interface DownloadPhotoSource {
  url: string;
  title: string;
}

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
  'image/bmp': 'bmp',
};

export function getPhotoFilename(title: string, mimeType: string): string {
  const type = mimeType.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(imageExtensions, type)) {
    throw new Error('This asset is not a supported photo.');
  }
  const extension = imageExtensions[type];
  const name = title.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 100) || 'photo';
  const safeName = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(name)
    ? `photo-${name}` : name;
  return `${safeName}.${extension}`;
}

export async function downloadPhoto(photo: DownloadPhotoSource): Promise<void> {
  const source = new URL(photo.url, window.location.href);
  if (!['http:', 'https:'].includes(source.protocol)) {
    throw new Error('This photo must use a local or HTTP(S) image URL.');
  }

  let response: Response;
  let blob: Blob;
  try {
    response = await fetch(source.href, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Photo unavailable (HTTP ${response.status}).`);
    }
    blob = await response.blob();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to fetch this photo. Check your connection; remote images must allow cross-origin downloads.');
    }
    throw error;
  }

  if (blob.size === 0) {
    throw new Error('This photo is empty or unavailable.');
  }
  const filename = getPhotoFilename(photo.title, blob.type);
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  try {
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Allow the browser to consume the URL before revoking it, even after unmount.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}
