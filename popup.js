const CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const REDIRECT_URI = chrome.identity.getRedirectURL();

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('github-login');
  const logoutButton = document.getElementById('logout');
  const loginSection = document.getElementById('login-section');
  const userSection = document.getElementById('user-section');
  const usernameSpan = document.getElementById('username');

  // Check if user is already logged in
  chrome.storage.local.get(['githubToken', 'username'], (result) => {
    if (result.githubToken && result.username) {
      showLoggedInState(result.username);
    }
  });

  loginButton.addEventListener('click', async () => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
    
    try {
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });
      
      const code = new URL(responseUrl).searchParams.get('code');
      // Exchange code for token (this should be done through your backend)
      // For demo purposes, assuming we got the token
      const token = 'sample_token';
      const username = await getUserInfo(token);
      
      chrome.storage.local.set({ 
        githubToken: token,
        username: username
      });
      
      showLoggedInState(username);
    } catch (error) {
      showError('Authentication failed');
    }
  });

  logoutButton.addEventListener('click', () => {
    chrome.storage.local.remove(['githubToken', 'username'], () => {
      showLoggedOutState();
    });
  });

  function showLoggedInState(username) {
    loginSection.style.display = 'none';
    userSection.style.display = 'block';
    usernameSpan.textContent = username;
  }

  function showLoggedOutState() {
    loginSection.style.display = 'block';
    userSection.style.display = 'none';
    usernameSpan.textContent = '';
  }

  async function getUserInfo(token) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.login;
  }
}); 