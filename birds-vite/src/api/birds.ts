import { gql } from '@apollo/client';

export interface BirdSummary {
	id: string;
	thumb_url: string;
	latin_name: string;
	english_name: string;
}

export interface BirdsData {
	birds: BirdSummary[];
}

export interface BirdNote {
	id: string;
	comment: string;
	timestamp: number;
}

export interface BirdDetail extends BirdSummary {
	image_url: string;
	notes: BirdNote[];
}

export interface BirdDetailData {
	bird: BirdDetail | null;
}

export interface AddNoteData {
	addNote: string | null;
}

export interface AddNoteVariables {
	birdId: string;
	comment: string;
	timestamp: number;
}

export const findBirdById = (
	birds: BirdSummary[],
	id: string | undefined
) => birds.find((bird) => bird.id === id);

export const BIRD_QUERY = gql`
	query Bird($id: ID!) {
		bird(id: $id) {
			id
			thumb_url
			image_url
			latin_name
			english_name
			notes {
				id
				comment
				timestamp
			}
		}
	}
`;

export const ADD_NOTE_MUTATION = gql`
	mutation AddNote($birdId: ID!, $comment: String!, $timestamp: Int!) {
		addNote(birdId: $birdId, comment: $comment, timestamp: $timestamp)
	}
`;

export const BIRDS_QUERY = gql`
	query Birds {
		birds {
			id
			thumb_url
			latin_name
			english_name
		}
	}
`;
