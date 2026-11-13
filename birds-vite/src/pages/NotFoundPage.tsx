import { Link } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import StatusMessage from '../components/StatusMessage';

const NotFoundPage = () => (
	<>
		<PageHeader>Page not found</PageHeader>
		<StatusMessage
			title="We couldn't find that page"
			action={
				<Link to="/" className="text-sm font-semibold text-brand">
					Back to birds
				</Link>
			}
		/>
	</>
);

export default NotFoundPage;
