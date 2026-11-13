import type { ReactNode } from 'react';

interface Props {
	title: string;
	description?: string;
	action?: ReactNode;
}

/** Centered message for empty and error states. */
const StatusMessage = ({ title, description, action }: Props) => (
	<div
		role="status"
		className="flex flex-col items-center gap-2 px-6 py-16 text-center"
	>
		<p className="text-base leading-6 font-semibold text-ink">{title}</p>
		{description && (
			<p className="text-sm leading-[21px] text-ink-muted">{description}</p>
		)}
		{action && <div className="mt-2">{action}</div>}
	</div>
);

export default StatusMessage;
