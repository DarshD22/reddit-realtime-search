const express = require("express");
const snoowrap = require("snoowrap");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Configure Reddit API
const r = new snoowrap({
  userAgent: process.env.USERAGENT,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
});

// Fetch all subreddits related to a keyword
async function fetchSubreddits(keyword) {
  try {
    const subreddits = await r.searchSubreddits({ query: keyword });

    // Sort subreddits by active member count (descending order)
    const sortedSubreddits = subreddits.sort((a, b) => b.accounts_active - a.accounts_active);

    return sortedSubreddits.map((subreddit) => ({
      name: subreddit.display_name,
      description: subreddit.public_description,
      members: subreddit.accounts_active, // Include active member count
    }));
  } catch (error) {
    console.error("Error fetching subreddits:", error);
    return [];
  }
}

// Fetch all posts from a specific subreddit containing the keyword
async function fetchPostsFromSubreddit(subreddit, keyword, time) {
  try {
    const options = {
      query: keyword,
      sort: "relevance",
      time: time || "all", // Time filter
    };

    const posts = await r.getSubreddit(subreddit).search(options);

    // Sort posts by upvotes (descending order)
    const sortedPosts = posts.sort((a, b) => b.ups - a.ups);

    return sortedPosts.map((post) => ({
      id: post.id,
      subreddit: post.subreddit.display_name,
      title: post.title,
      selftext: post.selftext,
      url: `https://reddit.com${post.permalink}`,
      author: post.author.name,
      upvotes: post.ups, // Include upvotes for popularity
      created_utc: new Date(post.created_utc * 1000).toLocaleString(), // Convert timestamp
    }));
  } catch (error) {
    console.error(`Error fetching posts for subreddit ${subreddit}:`, error);
    return [];
  }
}

// API endpoint to fetch subreddits
app.post("/search-subreddits", async (req, res) => {
  const { keyword } = req.body;

  try {
    const subreddits = await fetchSubreddits(keyword);
    res.json(subreddits);
  } catch (error) {
    console.error("Error in /search-subreddits:", error);
    res.status(500).json({ error: "Error fetching subreddits" });
  }
});

// API endpoint to fetch posts
app.post("/search-posts", async (req, res) => {
  const { subreddits, keyword, time } = req.body;

  try {
    const allPosts = [];

    for (const subreddit of subreddits) {
      const posts = await fetchPostsFromSubreddit(subreddit, keyword, time);
      allPosts.push(...posts);
    }

    // Sort all posts by upvotes (descending order)
    allPosts.sort((a, b) => b.upvotes - a.upvotes);

    res.json(allPosts);
  } catch (error) {
    console.error("Error in /search-posts:", error);
    res.status(500).json({ error: "Error fetching posts" });
  }
});

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
