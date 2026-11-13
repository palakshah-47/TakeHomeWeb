import { NavLink, Outlet } from 'react-router-dom';

/** Sidebar on wide screens, a top bar on narrow ones. */
const Layout = () => (
	<div className="flex h-full flex-col lg:flex-row lg:gap-px">
		<aside className="shrink-0 border-b border-line bg-sidebar p-4 lg:w-[307px] lg:border-r lg:border-b-0">
			<div className="flex items-center justify-between gap-4 lg:flex-col lg:items-stretch lg:justify-start">
				<div>
					<p className="text-base leading-6 font-medium text-ink">The Birds App</p>
				</div>
				<nav aria-label="Main">
					<NavLink
						to="/"
						className="flex h-[37px] items-center rounded-lg bg-layered px-3 text-sm leading-[21px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand"
					>
						Home
					</NavLink>
				</nav>
			</div>
		</aside>
		<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
			<Outlet />
		</main>
	</div>
);

export default Layout;

