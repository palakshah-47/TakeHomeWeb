import { useEffect, useRef, useState } from 'react';

import { useWatermarkedImage } from '../hooks/useWatermarkedImage';

interface Props {
	src: string;
	alt: string;
	className?: string;
	/** Higher numbers are loaded first. Use it for the main image on a page. */
	priority?: number;
	/** Small images only show a retry icon when loading fails. */
	compact?: boolean;
}

const FadeInImage = ({ url, alt }: { url: string; alt: string }) => {
	const [shown, setShown] = useState(false);

	return (
		<img
			src={url}
			alt={alt}
			draggable={false}
			onLoad={() => setShown(true)}
			className={`absolute inset-0 size-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${
				shown ? 'opacity-100' : 'opacity-0'
			}`}
		/>
	);
};

const Skeleton = () => (
	<div aria-hidden className="absolute inset-0 overflow-hidden bg-layered">
		<div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.6),transparent)] motion-reduce:animate-none" />
	</div>
);

const RetryIcon = () => (
	<svg
		aria-hidden
		viewBox="0 0 24 24"
		className="size-5"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M21 12a9 9 0 1 1-3-6.7" />
		<path d="M21 4v5h-5" />
	</svg>
);

/**
 * Shows a bird image after it has been watermarked.
 * Loads only when close to the viewport and cancels the request if it scrolls
 * far away before finishing. Shows a skeleton while loading and a retry
 * button if loading fails.
 */
const WatermarkedImage = ({
	src,
	alt,
	className = '',
	priority = 0,
	compact = false,
}: Props) => {
	const ref = useRef<HTMLDivElement>(null);
	const [near, setNear] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		if (typeof IntersectionObserver === 'undefined') {
			setNear(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => setNear(entry?.isIntersecting ?? false),
			{ rootMargin: '300px' }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const { status, url, retry } = useWatermarkedImage(src, {
		enabled: near,
		priority,
	});

	return (
		<div
			ref={ref}
			className={`relative overflow-hidden rounded-lg bg-layered ${className}`}
		>
			{status !== 'loaded' && status !== 'error' && <Skeleton />}

			{status === 'error' && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-muted">
					{/* z-10 keeps the button above a card's stretched link. */}
					<button
						type="button"
						onClick={retry}
						aria-label="Retry loading image"
						className="relative z-10 flex items-center gap-1.5 rounded-md p-1 text-[13px] font-semibold hover:bg-layered focus-visible:outline-2 focus-visible:outline-brand"
					>
						<RetryIcon />
						{!compact && <span>Retry</span>}
					</button>
					{!compact && <span className="text-xs">Couldn't load image</span>}
				</div>
			)}

			{url && <FadeInImage key={url} url={url} alt={alt} />}
		</div>
	);
};

export default WatermarkedImage;
