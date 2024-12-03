import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const Watchlist = () => {
    const { user } = useContext(AuthContext);
    const [stocks, setStocks] = useState([]);
    const [newStock, setNewStock] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWatchlist = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5001/watchlist', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setStocks(res.data.stocks || []);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch watchlist.');
            }
        };

        fetchWatchlist();
    }, []);

    useEffect(() => {
        stocks.forEach((stock) => {
            const container = document.getElementById(`widget-${stock}`);
            if (container && !container.hasChildNodes()) {
                const script = document.createElement('script');
                script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
                script.async = true;
                script.innerHTML = JSON.stringify({
                    symbol: `NASDAQ:${stock}`,
                    width: '100%',
                    colorTheme: 'dark',
                    isTransparent: false,
                    locale: 'en',
                });
                container.appendChild(script);
            }
        });
    }, [stocks]);

    const addStock = async () => {
        if (!newStock) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                'http://localhost:5001/watchlist/add',
                { stock: newStock },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStocks(res.data.stocks);
            setNewStock('');
        } catch (err) {
            console.error(err);
            setError('Failed to add stock.');
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Welcome, {user?.username}</h1>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Add stock symbol (e.g., AAPL)"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                    />
                    <button onClick={addStock}>Add</button>
                </div>
            </header>
            <div className="stock-list">
                {stocks.map((stock) => (
                    <div className="stock-widget" key={stock}>
                        <Link to={`/stock/${stock}`} className="widget-overlay"></Link>
                        <div id={`widget-${stock}`} className="single-ticker-widget"></div>
                    </div>
                ))}
            </div>
            {error && <p className="error">{error}</p>}
        </div>
    );
};

export default Watchlist;
