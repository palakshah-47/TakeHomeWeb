import { Link } from 'react-router-dom';

import type { BirdSummary } from '../api/birds';
import WatermarkedImage from './WatermarkedImage';

export const BirdCard = ({ bird }: { bird: BirdSummary }) => (
	<li className="relative flex flex-col gap-3 pb-3">
		<WatermarkedImage
			src={bird.thumb_url}
			alt=""
			className="aspect-video w-full"
		/>
		<div>
			<h2 className="text-base leading-6 font-medium text-ink">
				{/* The link stretches over the whole card; the image retry button sits above it. */}
				<Link
					to={`/birds/${bird.id}`}
					className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
				>
					{bird.english_name}
				</Link>
			</h2>
			<p className="text-sm leading-[21px] text-ink-muted">
				{bird.latin_name}
			</p>
		</div>
	</li>
);

export const BirdCardSkeleton = () => (
	<li aria-hidden className="flex animate-pulse flex-col gap-3 pb-3">
		<div className="aspect-video w-full rounded-lg bg-layered" />
		<div className="flex flex-col gap-2 pt-1">
			<div className="h-4 w-3/4 rounded bg-layered" />
			<div className="h-3.5 w-1/2 rounded bg-layered" />
		</div>
	</li>
);

export default BirdCard;
