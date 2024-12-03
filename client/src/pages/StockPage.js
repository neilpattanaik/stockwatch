import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import './StockPage.css';

const socket = io('http://localhost:5001');

const StockPage = () => {
    const { user } = useContext(AuthContext);
    const { symbol } = useParams();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`http://localhost:5001/messages/${symbol}`);
                setMessages(res.data);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch messages.');
            }
        };

        fetchMessages();

        socket.on(`chat-${symbol}`, (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
        });

        return () => {
            socket.off(`chat-${symbol}`);
        };
    }, [symbol]);

    const sendMessage = () => {
        if (message.trim()) {
            socket.emit('message', { stock: symbol, user: user.username, content: message });
            setMessage('');
        }
    };

    useEffect(() => {
        if (window.TradingView) {
            new window.TradingView.widget({
                container_id: 'tradingview-widget',
                symbol: `NASDAQ:${symbol}`,
                interval: 'D',
                theme: 'dark',
                style: '1',
                locale: 'en',
                toolbar_bg: '#f1f3f6',
                enable_publishing: false,
                allow_symbol_change: true,
                width: '100%', // Set to fill the available width
                height: '400', // Set a specific height
            });
        }
    }, [symbol]);
    

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            symbol: `NASDAQ:${symbol}`,
            colorTheme: 'dark',
            isTransparent: false,
            largeChartUrl: '',
            displayMode: 'regular',
            width: '100%', // Set to fill the available width
            height: '200', // Set a specific height
            locale: 'en',
        });
    
        const container = document.getElementById('tradingview-company-profile');
        if (container) {
            container.innerHTML = ''; // Clear previous widget, if any
            container.appendChild(script);
        }
    }, [symbol]);
    

    return (
        <div className="stock-page">
            <header className="stock-header">
                <h1>{symbol} Stock</h1>
            </header>
            <div className="stock-grid">
                {/* TradingView Chart */}
                <div id="tradingview-widget" className="stock-chart"></div>
                
                {/* Company Profile Widget */}
                <div className="stock-info">
                    <div id="tradingview-company-profile" className="company-profile-widget"></div>
                </div>
                
                {/* Live Chat */}
                <div className="chat-section">
                    <h2>Live Chat</h2>
                    <div className="chat-box">
                        {messages.map((msg, index) => (
                            <p key={index}>
                                <b>{msg.user}: </b> {msg.content}
                            </p>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message"
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
            {error && <p className="error">{error}</p>}
        </div>
    );
};

export default StockPage;
