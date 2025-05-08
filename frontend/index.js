import { initializeBlock } from '@airtable/blocks/ui';
import AutoUpdateApp from './AutoUpdateApp';
import {Home} from './Home';
import React, { useState } from 'react';


function App() {
    const [view, setView] = useState('home');

    if (view === 'auto-update') {
        return <AutoUpdateApp onBack={() => setView('home')} />;
    }

    return <Home onNavigate={setView} />;
}

initializeBlock(() => <App />);