import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import BirdPage from './pages/BirdPage';
import BirdsPage from './pages/BirdsPage';
import NotFoundPage from './pages/NotFoundPage';

const App = () => (
	<Routes>
		<Route element={<Layout />}>
			<Route index element={<BirdsPage />} />
			<Route path="birds/:id" element={<BirdPage />} />
			<Route path="*" element={<NotFoundPage />} />
		</Route>
	</Routes>
);

export default App;
