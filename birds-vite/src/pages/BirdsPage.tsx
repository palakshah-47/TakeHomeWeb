import { useQuery } from '@apollo/client';
import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { BIRDS_QUERY, type BirdsData } from '../api/birds';
import BirdCard, { BirdCardSkeleton } from '../components/BirdCard';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import StatusMessage from '../components/StatusMessage';
import { filterBirds } from '../lib/search';

const gridClass =
	'grid grid-cols-2 gap-4 p-4 sm:grid-cols-[repeat(auto-fill,168px)] sm:gap-6 sm:p-6';

const BirdsPage = () => {
	const { data, loading, refetch } = useQuery<BirdsData>(BIRDS_QUERY, {
		notifyOnNetworkStatusChange: true,
	});
	const [params, setParams] = useSearchParams();

	// The search lives in the URL so it survives going to a bird and coming back.
	const query = params.get('q') ?? '';
	const deferredQuery = useDeferredValue(query);
	const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true });

	const birds = data?.birds;
	const visible = useMemo(
		() => (birds ? filterBirds(birds, deferredQuery) : []),
		[birds, deferredQuery],
	);

	let content;
	if (!birds && loading) {
		content = (
			<ul aria-busy aria-label="Loading birds" className={gridClass}>
				{Array.from({ length: 8 }, (_, index) => (
					<BirdCardSkeleton key={index} />
				))}
			</ul>
		);
	} else if (!birds) {
		content = (
			<StatusMessage
				title="We couldn't load the birds"
				description="Check your connection and try again."
				action={<Button onClick={() => void refetch()}>Try again</Button>}
			/>
		);
	} else if (birds.length === 0) {
		content = <StatusMessage title="There are no birds yet" />;
	} else if (visible.length === 0) {
		content = (
			<StatusMessage
				title={`No birds match "${deferredQuery.trim()}"`}
				description="Try a different name."
				action={<Button onClick={() => setQuery('')}>Clear search</Button>}
			/>
		);
	} else {
		content = (
			<ul className={gridClass}>
				{visible.map((bird) => (
					<BirdCard key={bird.id} bird={bird} />
				))}
			</ul>
		);
	}

	return (
		<>
			<PageHeader>Birds</PageHeader>
			<div className="shrink-0 border-b border-line px-4 pt-4 pb-[15px] sm:px-6 sm:pt-6 sm:pb-[23px]">
				<SearchInput value={query} onChange={setQuery} />
			</div>
			<p aria-live="polite" className="sr-only">
				{birds ? `${visible.length} birds` : ''}
			</p>
			<div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
		</>
	);
};

export default BirdsPage;

