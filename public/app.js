const keywordInput = document.getElementById("keyword");
const searchSubredditsButton = document.getElementById("search-subreddits");
const subredditsContainer = document.getElementById("subreddits");
const postsContainer = document.getElementById("posts");
const timeFilter = document.getElementById("time-filter");
const fetchPostsButton = document.getElementById("fetch-posts");

let selectedSubreddits = [];

searchSubredditsButton.addEventListener("click", async () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    alert("Please enter a keyword!");
    return;
  }

  // Show loading message
  subredditsContainer.innerHTML = "Loading subreddits...";
  selectedSubreddits = []; // Clear previously selected subreddits
  postsContainer.innerHTML = "No posts loaded yet."; // Clear posts section

  try {
    // Fetch matching subreddits from the backend
    const response = await fetch("https://reddit-realtime-search.onrender.com/search-subreddits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) throw new Error("Failed to fetch subreddits.");

    const subreddits = await response.json();
    subredditsContainer.innerHTML = subreddits.length
      ? subreddits
          .map(
            (subreddit) => `
            <div class="subreddit" data-name="${subreddit.name}">
              <strong>${subreddit.name}</strong><br>
              <em>${subreddit.description}</em>
            </div>
          `
          )
          .join("")
      : "No subreddits found.";

    // Add click listeners to select subreddits
    document.querySelectorAll(".subreddit").forEach((element) =>
      element.addEventListener("click", () => {
        const subreddit = element.getAttribute("data-name");
        if (selectedSubreddits.includes(subreddit)) {
          selectedSubreddits = selectedSubreddits.filter((s) => s !== subreddit);
          element.classList.remove("selected");
        } else {
          selectedSubreddits.push(subreddit);
          element.classList.add("selected");
        }
      })
    );
  } catch (error) {
    subredditsContainer.innerHTML = "Failed to load subreddits. Please try again.";
    console.error(error);
  }
});

fetchPostsButton.addEventListener("click", async () => {
  if (!selectedSubreddits.length) {
    alert("Please select at least one subreddit!");
    return;
  }

  const keyword = keywordInput.value.trim();
  const time = timeFilter.value;

  // Show loading message
  postsContainer.innerHTML = "Loading posts...";

  try {
    // Fetch posts from selected subreddits
    const response = await fetch("https://reddit-realtime-search.onrender.com/search-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subreddits: selectedSubreddits,
        keyword,
        time,
      }),
    });

    if (!response.ok) throw new Error("Failed to fetch posts.");

    const posts = await response.json();
    postsContainer.innerHTML = posts.length
      ? posts
          .map(
            (post) => `
            <div class="post">
              <strong>${post.title}</strong> <em>(from r/${post.subreddit})</em><br>
              <em>by ${post.author} on ${new Date(post.created_utc * 1000).toLocaleString()}</em><br>
              <a href="${post.url}" target="_blank">Read more</a>
            </div>
          `
          )
          .join("")
      : "No posts found.";
  } catch (error) {
    postsContainer.innerHTML = "Failed to load posts. Please try again.";
    console.error(error);
  }
});
