import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import './index.css';

const AdminRoot = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const session = localStorage.getItem('ghost_session');
        if (session) {
            const user = JSON.parse(session);
            if (user.isAdmin) {
                setCurrentUser(user);
            } else {
                localStorage.removeItem('ghost_session');
            }
        }
    }, []);

    if (!currentUser) {
        return <AdminLogin onAuthenticate={setCurrentUser} />;
    }

    return (
        <div className="h-screen bg-[var(--bg)] overflow-hidden">
            <AdminDashboard onClose={() => {
                localStorage.removeItem('ghost_session');
                setCurrentUser(null);
                window.location.reload();
            }} />
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AdminRoot />
    </React.StrictMode>,
);
