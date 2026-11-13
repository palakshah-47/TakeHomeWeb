import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'secondary' | 'primary';
}

const base =
	'relative inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] leading-4 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed';

const variants = {
	secondary: 'border-line-ui bg-white text-navy shadow-ui',
	primary:
		'border-brand bg-brand text-white shadow-primary ring-1 ring-white/30 ring-inset disabled:opacity-50',
};

const Button = ({
	variant = 'secondary',
	type = 'button',
	className = '',
	...props
}: Props) => (
	<button
		type={type}
		className={`${base} ${variants[variant]} ${className}`}
		{...props}
	/>
);

export default Button;
