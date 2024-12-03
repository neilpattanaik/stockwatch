import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css'; // Add your CSS here

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">StockWatch</Link>
            </div>
            <div className="navbar-links">
                {user ? (
                    <>
                        <Link to="/">Dashboard</Link>
                        <button className="logout-button" onClick={handleLogout}>Sign Out</button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
