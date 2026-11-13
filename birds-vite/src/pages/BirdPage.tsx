import { useMutation, useQuery } from '@apollo/client';
import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
	ADD_NOTE_MUTATION,
	BIRD_QUERY,
	type AddNoteData,
	type AddNoteVariables,
	type BirdDetailData,
} from '../api/birds';
import AddNoteDialog from '../components/AddNoteDialog';
import BirdImageDialog from '../components/BirdImageDialog';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import StatusMessage from '../components/StatusMessage';
import WatermarkedImage from '../components/WatermarkedImage';
import { parseNoteContent, serializeNoteContent } from '../lib/notes';
import { fromApiTimestamp, toApiTimestamp } from '../lib/timestamps';

const BirdPage = () => {
	const { id } = useParams();
	const imageDialogRef = useRef<HTMLDialogElement>(null);
	const noteDialogRef = useRef<HTMLDialogElement>(null);
	const { data, loading, error, refetch } = useQuery<BirdDetailData, { id: string }>(BIRD_QUERY, {
		variables: { id: id ?? '' },
		skip: !id,
	});
	const [addNote] = useMutation<AddNoteData, AddNoteVariables>(ADD_NOTE_MUTATION, {
		refetchQueries: [{ query: BIRD_QUERY, variables: { id: id ?? '' } }],
		awaitRefetchQueries: true,
	});

	const bird = data?.bird;
	const saveNote = async (title: string, body: string) => {
		if (!id) throw new Error('Bird ID is required to save a note.');
		await addNote({
			variables: {
				birdId: id,
				comment: serializeNoteContent(title, body),
				timestamp: toApiTimestamp(new Date()),
			},
		});
	};

	let content;
	if (!data && loading) {
		content = <StatusMessage title="Loading bird details" />;
	} else if (!data && error) {
		content = (
			<StatusMessage
				title="We couldn't load this bird"
				description="Check your connection and try again."
				action={<Button onClick={() => void refetch()}>Try again</Button>}
			/>
		);
	} else if (!bird) {
		content = (
			<StatusMessage
				title="We couldn't find that bird"
				action={
					<Link
						to="/"
						className="text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-brand"
					>
						Back to birds
					</Link>
				}
			/>
		);
	} else {
		const notes = [...bird.notes].sort((first, second) => second.timestamp - first.timestamp);
		content = (
			<div className="grid w-full max-w-[528px] gap-6 p-4 sm:p-6">
				<div className="relative h-fit w-full max-w-[480px]">
					<WatermarkedImage
						src={bird.image_url}
						alt={`${bird.english_name} (${bird.latin_name})`}
						className="aspect-[16/10] w-full"
						priority={10}
					/>
					<button
						type="button"
						onClick={() => imageDialogRef.current?.showModal()}
						aria-label={`Zoom image of ${bird.english_name}`}
						className="absolute right-3 bottom-3 z-10 rounded-lg border border-white/60 bg-white/95 px-3 py-2 text-sm font-semibold text-ink shadow-ui hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
					>
						Zoom image
					</button>
				</div>
				<div className="min-w-0">
					<section aria-labelledby="bird-notes-heading" className="mt-6">
						<div className="flex items-center justify-between gap-3">
							<h2
								id="bird-notes-heading"
								className="text-2xl leading-7 font-semibold text-ink"
							>
								Notes
							</h2>
							<span className="text-sm text-ink-muted">
								{notes.length} {notes.length === 1 ? 'note' : 'notes'}
							</span>
						</div>
						{notes.length > 0 ? (
							<ul className="mt-3 divide-y divide-line border-t border-line">
								{notes.map((note) => {
									const content = parseNoteContent(note.comment);
									const noteDate = fromApiTimestamp(note.timestamp);
									return (
										<li key={note.id} className="flex items-start gap-3 py-3">
											<WatermarkedImage
												src={bird.thumb_url}
												alt={`${bird.english_name} thumbnail`}
												className="size-12 shrink-0"
												compact
											/>
											<div className="min-w-0">
												{content.title && (
													<h3 className="text-sm leading-5 font-semibold text-ink">
														{content.title}
													</h3>
												)}
												<p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-ink">
													{content.body}
												</p>
												<time
													dateTime={noteDate.toISOString()}
													className="mt-1 block text-xs text-ink-muted"
												>
													{noteDate.toLocaleString()}
												</time>
											</div>
										</li>
									);
								})}
							</ul>
						) : (
							<p className="mt-3 border-y border-line py-4 text-sm text-ink-muted">
								No notes yet. Add one to remember something about this bird.
							</p>
						)}
					</section>
					<section aria-labelledby="bird-details-heading">
						<h2
							id="bird-notes-heading"
							className="text-2xl leading-7 font-semibold text-ink mt-1.5"
						>
							In Other Languages
						</h2>
						<dl className="mt-3 divide-y divide-line border-y border-line">
							<div className="py-3">
								<dt className="text-sm text-ink-muted">Latin</dt>
								<dd className="mt-1 text-base text-ink italic">
									{bird.latin_name}
								</dd>
							</div>
						</dl>
					</section>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageHeader
				actions={
					bird && (
						<Button
							variant="primary"
							onClick={() => noteDialogRef.current?.showModal()}
						>
							Add note
						</Button>
					)
				}
			>
				<Link
					to="/"
					className="text-ink/50 focus-visible:outline-2 focus-visible:outline-brand"
				>
					Birds
				</Link>
				<span aria-hidden="true"> / </span>
				{bird?.english_name ?? 'Bird details'}
			</PageHeader>
			<div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
			{bird && (
				<BirdImageDialog
					dialogRef={imageDialogRef}
					src={bird.image_url}
					alt={`${bird.english_name} (${bird.latin_name})`}
				/>
			)}
			{bird && (
				<AddNoteDialog
					dialogRef={noteDialogRef}
					birdName={bird.english_name}
					onSave={saveNote}
				/>
			)}
		</>
	);
};

export default BirdPage;
