interface Props {
	value: string;
	onChange: (value: string) => void;
}

const SearchIcon = () => (
	<svg
		aria-hidden
		viewBox="0 0 24 24"
		className="size-6 shrink-0 text-ink-muted"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<circle cx="11" cy="11" r="7.5" />
		<path d="m20.5 20.5-4.2-4.2" />
	</svg>
);

const SearchInput = ({ value, onChange }: Props) => (
	<div className="flex h-12 items-center gap-3 rounded-lg bg-field px-4 focus-within:ring-2 focus-within:ring-brand/40">
		<SearchIcon />
		<input
			type="search"
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Escape') onChange('');
			}}
			placeholder="Search for birds"
			aria-label="Search for birds"
			autoComplete="off"
			spellCheck={false}
			className="min-w-0 flex-1 bg-transparent text-base leading-6 text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
		/>
	</div>
);

export default SearchInput;
