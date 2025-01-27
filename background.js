chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUBMIT_TO_GITHUB') {
    handleGitHubSubmission(message.payload);
  }
});

async function handleGitHubSubmission({ title, code }) {
  try {
    const { githubToken } = await chrome.storage.local.get('githubToken');
    if (!githubToken) {
      throw new Error('Not authenticated with GitHub');
    }

    // Create repo if it doesn't exist
    const repoName = 'leetcode-solutions';
    await createRepoIfNotExists(githubToken, repoName);

    // Create file in repo
    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.js`;
    await createFileInRepo(githubToken, repoName, fileName, code, title);
  } catch (error) {
    console.error('Failed to submit to GitHub:', error);
  }
}

async function createRepoIfNotExists(token, repoName) {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      description: 'My LeetCode solutions',
      private: false
    })
  });
  
  if (!response.ok && response.status !== 422) { // 422 means repo already exists
    throw new Error('Failed to create repository');
  }
}

async function createFileInRepo(token, repoName, fileName, content, commitMessage) {
  const { username } = await chrome.storage.local.get('username');
  
  const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${fileName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Solved: ${commitMessage}`,
      content: btoa(content)
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create file');
  }
} 