// Lowercases and strips accents so "Pinguino" finds "Pingüino".
const normalize = (value: string) =>
	value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface Searchable {
	english_name: string;
	latin_name: string;
}

/** Keeps the birds whose English or Latin name contains every word of the query. */
export function filterBirds<T extends Searchable>(
	birds: T[],
	query: string
): T[] {
	const words = normalize(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return birds;

	return birds.filter((bird) => {
		const text = normalize(`${bird.english_name} ${bird.latin_name}`);
		return words.every((word) => text.includes(word));
	});
}
