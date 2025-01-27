chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUBMIT_TO_GITHUB') {
    handleGitHubSubmission(message.payload);
  }
});

async function refreshInstallationToken(installationId) {
  const { githubToken } = await chrome.storage.local.get('githubToken');
  
  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  await chrome.storage.local.set({ githubToken: data.token });
  return data.token;
}

async function handleGitHubSubmission({ title, code }) {
  try {
    const { githubToken, installationId } = await chrome.storage.local.get(['githubToken', 'installationId']);
    if (!githubToken || !installationId) {
      throw new Error('Not authenticated with GitHub');
    }

    // Try to use existing token, if it fails, refresh it
    try {
      await createRepoIfNotExists(githubToken, 'leetcode-solutions');
    } catch (error) {
      if (error.status === 401) {
        const newToken = await refreshInstallationToken(installationId);
        await createRepoIfNotExists(newToken, 'leetcode-solutions');
      } else {
        throw error;
      }
    }

    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.js`;
    await createFileInRepo(githubToken, 'leetcode-solutions', fileName, code, title);
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