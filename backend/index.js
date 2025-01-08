const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const snoowrap = require('snoowrap');
require('dotenv').config();
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store active subscriptions and their intervals
let activeSubscriptions = {};

// Configure snoowrap (Reddit API)
const r = new snoowrap({
    userAgent: process.env.USERAGENT,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
});

// Fetch posts from subreddit with keyword filtering
async function fetchSubredditPosts(subreddit, keywords) {
    try {
        const posts = await r.getSubreddit(subreddit).getNew({ limit: 50 });
        return posts.filter(post =>
            keywords.some(keyword =>
                post.title.toLowerCase().includes(keyword.toLowerCase()) ||
                post.selftext.toLowerCase().includes(keyword.toLowerCase())
            )
        ).map(post => ({
            id: post.id,
            title: post.title,
            selftext: post.selftext,
            url: `https://reddit.com${post.permalink}`,
            author: post.author.name,
        }));
    } catch (error) {
        console.error('Error fetching subreddit posts:', error);
        return [];
    }
}

// Real-time communication
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('subscribe', async ({ subreddit, keywords }) => {
        console.log(`Subscribed to ${subreddit} with keywords: ${keywords}`);

        // Clear previous subscription's interval if exists
        if (activeSubscriptions[socket.id]) {
            clearInterval(activeSubscriptions[socket.id].interval);
            console.log(`Cleared previous subscription for ${subreddit}`);
        }

        // Fetch and emit posts for the current subscription
        const posts = await fetchSubredditPosts(subreddit, keywords);
        socket.emit('posts', posts);

        // Set up periodic updates for the current subscription
        const interval = setInterval(async () => {
            const updatedPosts = await fetchSubredditPosts(subreddit, keywords);
            socket.emit('posts', updatedPosts);
        }, 10000); // 10 seconds

        // Store the subscription and its interval
        activeSubscriptions[socket.id] = { subreddit, keywords, interval };

        socket.on('disconnect', () => {
            console.log('Client disconnected');
            clearInterval(activeSubscriptions[socket.id]?.interval); // Clear the interval when disconnected
            delete activeSubscriptions[socket.id]; // Remove subscription data
        });
    });
});

// Serve static frontend
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
