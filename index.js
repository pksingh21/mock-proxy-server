// index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000, // 1 minute
    max: process.env.RATE_LIMIT_MAX || 5, // limit each IP to 5 requests per windowMs
    statusCode: 429,
    message: 'Too many requests from this IP, please try again after a minute',
});
app.use('/github', limiter);

// Simple authentication
app.use('/github', (req, res, next) => {
    const apiKey = req.query.api_key;
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// Caching
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 300 }); // 5 minutes

app.get('/github/*', async (req, res) => {
    const url = `https://api.github.com/${req.params[0]}`;
    const cachedResponse = cache.get(url);

    if (cachedResponse) {
        console.log('cached response !!')
        return res.json(cachedResponse);
    }

    try {
        const response = await axios.get(url);
        cache.set(url, response.data);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

