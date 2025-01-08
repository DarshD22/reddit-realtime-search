const socket = io.connect('https://reddit-realtime-search.onrender.com');
const form = document.getElementById('search-form');
const postsContainer = document.getElementById('posts-container');

form.addEventListener('submit', (event) => {
    event.preventDefault();
    const subreddit = document.getElementById('subreddit').value.trim();
    const keywords = document.getElementById('keywords').value.split(',').map(kw => kw.trim());

    if (!subreddit || keywords.length === 0) {
        alert('Please enter a subreddit and at least one keyword.');
        return;
    }

    postsContainer.innerHTML = '<p class="loading-message">Loading posts...</p>';
    socket.emit('subscribe', { subreddit, keywords });
});

socket.on('posts', (posts) => {
    postsContainer.innerHTML = '';
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p>No posts found matching the keywords.</p>';
        return;
    }

    posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');
        postDiv.innerHTML = `
            <h3><a href="${post.url}" target="_blank">${post.title}</a></h3>
            <p>${post.selftext}</p>
            <p><strong>Author:</strong> ${post.author}</p>
        `;
        postsContainer.appendChild(postDiv);
    });
});

socket.on('connect', () => console.log('Connected to server.'));
socket.on('disconnect', () => console.log('Disconnected from server.'));
