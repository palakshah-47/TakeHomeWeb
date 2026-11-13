import type { ReactNode } from 'react';

interface Props {
	children: ReactNode;
	/** Shown on the right, for example a button. */
	actions?: ReactNode;
}

const PageHeader = ({ children, actions }: Props) => (
	<header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-4 pt-4 pb-[15px] sm:px-6">
		<h1 className="min-w-0 text-2xl leading-10 font-bold tracking-title text-ink sm:text-[32px]">
			{children}
		</h1>
		{actions}
	</header>
);

export default PageHeader;
