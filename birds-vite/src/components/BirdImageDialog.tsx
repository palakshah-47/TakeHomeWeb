import type { RefObject } from 'react';
import { useState } from 'react';

import { useWatermarkedImage } from '../hooks/useWatermarkedImage';
import Button from './Button';

interface Props {
	dialogRef: RefObject<HTMLDialogElement>;
	src: string;
	alt: string;
}

const BirdImageDialog = ({ dialogRef, src, alt }: Props) => {
	const [zoom, setZoom] = useState(1);
	const { status, url, retry } = useWatermarkedImage(src);

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="image-dialog-title"
			onClose={() => setZoom(1)}
			onClick={(event) => {
				if (event.target === event.currentTarget) dialogRef.current?.close();
			}}
			className="m-auto max-h-[92dvh] w-[min(960px,calc(100vw-32px))] max-w-none overflow-hidden rounded-xl border border-line bg-white p-0 text-ink shadow-modal backdrop:bg-black/60"
		>
			<div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
				<h2 id="image-dialog-title" className="text-base font-semibold">
					Bird image
				</h2>
				<button
					type="button"
					onClick={() => dialogRef.current?.close()}
					className="rounded-md px-2 py-1 text-sm font-semibold text-ink-muted hover:bg-layered focus-visible:outline-2 focus-visible:outline-brand"
				>
					Close
				</button>
			</div>
			<div className="max-h-[70dvh] min-h-48 overflow-auto bg-[#111820] p-3 sm:p-5">
				{url ? (
					<img
						src={url}
						alt={alt}
						draggable={false}
						style={{ width: `${zoom * 100}%` }}
						className="mx-auto h-auto max-w-none"
					/>
				) : status === 'error' ? (
					<div className="flex min-h-48 flex-col items-center justify-center gap-3 text-white">
						<p role="status">Couldn't load this image.</p>
						<Button onClick={retry}>Try again</Button>
					</div>
				) : (
					<div
						aria-busy="true"
						aria-label="Loading bird image"
						className="min-h-48 animate-pulse bg-white/10"
					/>
				)}
			</div>
			<div className="flex items-center justify-center gap-3 border-t border-line px-4 py-3">
				<Button
					aria-label="Zoom out"
					disabled={zoom <= 1}
					onClick={() => setZoom((current) => Math.max(1, current - 0.25))}
				>
					−
				</Button>
				<output aria-live="polite" className="min-w-12 text-center text-sm">
					{Math.round(zoom * 100)}%
				</output>
				<Button
					aria-label="Zoom in"
					disabled={zoom >= 3}
					onClick={() => setZoom((current) => Math.min(3, current + 0.25))}
				>
					+
				</Button>
				<Button
					disabled={zoom === 1}
					onClick={() => setZoom(1)}
					className="ml-2"
				>
					Reset
				</Button>
			</div>
		</dialog>
	);
};

export default BirdImageDialog;
