import type { RefObject, FormEvent } from 'react';
import { useState } from 'react';

import Button from './Button';

interface Props {
	dialogRef: RefObject<HTMLDialogElement>;
	birdName: string;
	onSave: (title: string, comment: string) => Promise<void>;
}

const AddNoteDialog = ({ dialogRef, birdName, onSave }: Props) => {
	const [title, setTitle] = useState('');
	const [comment, setComment] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string>();

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedTitle = title.trim();
		const trimmedComment = comment.trim();
		if (!trimmedTitle || !trimmedComment || saving) return;

		setSaving(true);
		setError(undefined);
		try {
			await onSave(trimmedTitle, trimmedComment);
			dialogRef.current?.close();
		} catch {
			setError('Your note could not be saved. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="add-note-title"
			onClose={() => {
				setTitle('');
				setComment('');
				setError(undefined);
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) dialogRef.current?.close();
			}}
			className="m-auto w-[min(480px,calc(100vw-32px))] max-w-none rounded-xl border border-line bg-white p-0 text-ink shadow-modal backdrop:bg-black/40"
		>
			<form onSubmit={submit}>
				<div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
					<h2 id="add-note-title" className="text-base font-semibold">
						Add a note
					</h2>
					<button
						type="button"
						onClick={() => dialogRef.current?.close()}
						aria-label="Close add note dialog"
						className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-layered focus-visible:outline-2 focus-visible:outline-brand"
					>
						×
					</button>
				</div>
				<div className="px-5 py-4">
					<p className="mb-3 text-sm text-ink-muted">
						Note for <span className="font-medium text-ink">{birdName}</span>
					</p>
					<label
						htmlFor="bird-note-title"
						className="mb-1.5 block text-sm font-medium text-ink"
					>
						Title
					</label>
					<input
						id="bird-note-title"
						autoFocus
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						maxLength={120}
						required
						placeholder="Give your note a title"
						className="mb-4 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-5 outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand/20"
					/>
					<label
						htmlFor="bird-note"
						className="mb-1.5 block text-sm font-medium text-ink"
					>
						Note
					</label>
					<textarea
						id="bird-note"
						value={comment}
						onChange={(event) => setComment(event.target.value)}
						maxLength={1000}
						rows={4}
						required
						placeholder="Write something to remember about this bird"
						className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm leading-5 outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand/20"
					/>
					<p className="mt-1 text-right text-xs text-ink-muted">
						{comment.length}/1000
					</p>
					{error && (
						<p role="alert" className="mt-2 text-sm text-red-700">
							{error}
						</p>
					)}
				</div>
				<div className="flex justify-end gap-2 border-t border-line px-5 py-3">
					<Button
						type="button"
						disabled={saving}
						onClick={() => dialogRef.current?.close()}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={!title.trim() || !comment.trim() || saving}
					>
						{saving ? 'Saving…' : 'Save note'}
					</Button>
				</div>
			</form>
		</dialog>
	);
};

export default AddNoteDialog;
