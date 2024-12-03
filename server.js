const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

server.listen(5001, () => {
    console.log('Server is running on port 5001');
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// MongoDB Schemas and Models
const { Schema, model } = require('mongoose');

const WatchlistSchema = new Schema({
    user: String,
    stocks: [String],
});

const MessageSchema = new Schema({
    stock: String,
    user: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const Watchlist = model('Watchlist', WatchlistSchema);
const Message = model('Message', MessageSchema);
const User = model('User', UserSchema);

// Middleware to Authenticate Token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post(
    '/auth/register',
    [
        body('username').isLength({ min: 3 }),
        body('password').isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const newUser = new User({ username, password: hashedPassword });
            await newUser.save();
            res.status(201).json({ message: 'User registered successfully' });
        } catch (err) {
            res.status(400).json({ error: 'Username already exists' });
        }
    }
);

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });

    res.json({ token, username: user.username });
});



app.get('/watchlist', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        let watchlist = await Watchlist.findOne({ user: userId });

        if (!watchlist) {
            // Create an empty watchlist for the new user
            watchlist = new Watchlist({ user: userId, stocks: [] });
            await watchlist.save();
        }

        res.status(200).json(watchlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching watchlist' });
    }
});


app.post('/watchlist/add', authenticateToken, async (req, res) => {
    const { stock } = req.body;
    const userId = req.user.id;

    try {
        let watchlist = await Watchlist.findOne({ user: userId });
        if (!watchlist) {
            watchlist = new Watchlist({ user: userId, stocks: [stock] });
        } else if (!watchlist.stocks.includes(stock)) {
            watchlist.stocks.push(stock);
        }
        await watchlist.save();
        res.status(200).json(watchlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating watchlist' });
    }
});

app.post('/watchlist/remove', authenticateToken, async (req, res) => {
    const { stock } = req.body;
    const userId = req.user.id;

    try {
        const watchlist = await Watchlist.findOne({ user: userId });
        if (watchlist) {
            watchlist.stocks = watchlist.stocks.filter(s => s !== stock);
            await watchlist.save();
        }
        res.status(200).json(watchlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating watchlist' });
    }
});


// Messages Route (Still Public)
app.get('/messages/:stock', async (req, res) => {
    const messages = await Message.find({ stock: req.params.stock });
    res.send(messages);
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', async (data) => {
        const { stock, user, content } = data;
        const message = new Message({ stock, user, content });
        await message.save();

        io.emit(`chat-${stock}`, message); // Emit message to all clients subscribed to the stock
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});
