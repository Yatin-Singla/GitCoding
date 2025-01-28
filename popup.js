import config from './config.js';

const CLIENT_ID = config.clientId;

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('github-login');
  const logoutButton = document.getElementById('logout');
  const loginSection = document.getElementById('login-section');
  const userSection = document.getElementById('user-section');
  const usernameSpan = document.getElementById('username');
  const statusDiv = document.getElementById('status');

  // Check if user is already logged in
  chrome.storage.local.get(['githubToken', 'username'], (result) => {
    if (result.githubToken && result.username) {
      showLoggedInState(result.username);
    }
  });

  loginButton.addEventListener('click', async () => {
    try {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect_uri=${encodeURIComponent('https://iehacfagnnclpijplhmaphjhcikioeop.chromiumapp.org/')}`;
      
      console.log('Launching auth flow with URL:', authUrl);
      
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      console.log('Received response URL:', responseUrl);

      const code = new URL(responseUrl).searchParams.get('code');
      if (!code) {
        throw new Error('No authorization code received');
      }
      
      // Exchange code for token using background service
      const tokenData = await chrome.runtime.sendMessage({
        type: 'EXCHANGE_CODE_FOR_TOKEN',
        code: code
      });

      if (tokenData.error) {
        throw new Error(tokenData.error);
      }

      const token = tokenData.access_token;
      const username = await getUserInfo(token);
      
      chrome.storage.local.set({ 
        githubToken: token,
        username: username
      });
      
      showLoggedInState(username);
      statusDiv.innerHTML = '<p class="success">Successfully logged in!</p>';
    } catch (error) {
      console.error('Authentication error:', error);
      statusDiv.innerHTML = `<p class="error">Authentication failed: ${error.message}</p>`;
    }
  });

  logoutButton.addEventListener('click', () => {
    chrome.storage.local.remove(['githubToken', 'username'], () => {
      showLoggedOutState();
      statusDiv.innerHTML = '<p>Logged out successfully</p>';
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
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    return data.login;
  }
}); 