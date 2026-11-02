'use client';

import { useId, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadPhoto, DownloadPhotoSource } from '@/lib/download-photo';

interface PhotoDownloadButtonProps {
  photo: DownloadPhotoSource;
}

export function PhotoDownloadButton({ photo }: PhotoDownloadButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitiated, setIsInitiated] = useState(false);
  const pendingRef = useRef(false);
  const feedbackId = useId();

  const handleDownload = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsPending(true);
    setError(null);
    setIsInitiated(false);
    try {
      await downloadPhoto(photo);
      setIsInitiated(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to download this photo.');
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isPending}
        aria-label={`${error ? 'Retry download of' : 'Download'} ${photo.title}`}
        aria-busy={isPending}
        aria-describedby={feedbackId}
        className="min-h-11 min-w-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-wait"
      >
        {isPending
          ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          : <Download aria-hidden="true" className="h-4 w-4" />}
      </button>
      <div id={feedbackId} className="absolute top-full right-0 mt-2 w-56 max-w-[70vw]">
        <p role="status" className="sr-only">
          {isPending ? `Preparing download of ${photo.title}.` : isInitiated ? `Download initiated for ${photo.title}.` : ''}
        </p>
        {error && (
          <p role="alert" className="rounded-lg bg-white dark:bg-slate-800 p-3 text-sm text-red-700 dark:text-red-300 shadow-lg">
            {photo.title}: {error} Use the download button to retry.
          </p>
        )}
      </div>
    </>
  );
}
