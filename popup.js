const APP_ID = 'YOUR_GITHUB_APP_ID';
const CLIENT_ID = 'YOUR_GITHUB_APP_CLIENT_ID';

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
      // Start device flow with GitHub App
      const deviceCodeResponse = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          scope: 'repo' // You can be more specific with permissions
        })
      });

      const deviceData = await deviceCodeResponse.json();
      
      statusDiv.innerHTML = `
        <p>Please visit: <a href="${deviceData.verification_uri}" target="_blank">${deviceData.verification_uri}</a></p>
        <p>And enter code: <strong>${deviceData.user_code}</strong></p>
        <p>Waiting for authentication...</p>
      `;

      const token = await pollForToken(deviceData.device_code, deviceData.interval);
      
      // Get installation ID for the authenticated user
      const installations = await fetch('https://api.github.com/user/installations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }).then(res => res.json());

      const installationId = installations.installations[0]?.id;
      
      if (!installationId) {
        throw new Error('Please install the GitHub App first');
      }

      // Get installation token
      const installationToken = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }).then(res => res.json());

      const username = await getUserInfo(installationToken.token);
      
      chrome.storage.local.set({ 
        githubToken: installationToken.token,
        username: username,
        installationId: installationId
      });
      
      showLoggedInState(username);
      statusDiv.innerHTML = '<p class="success">Successfully logged in!</p>';
    } catch (error) {
      statusDiv.innerHTML = `<p class="error">Authentication failed: ${error.message}</p>`;
    }
  });

  logoutButton.addEventListener('click', () => {
    chrome.storage.local.remove(['githubToken', 'username'], () => {
      showLoggedOutState();
      statusDiv.innerHTML = '<p>Logged out successfully</p>';
    });
  });

  async function pollForToken(deviceCode, interval) {
    const pollInterval = (interval || 5) * 1000; // Convert to milliseconds

    while (true) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const data = await response.json();
      
      if (data.error === 'authorization_pending') {
        continue;
      }

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (data.access_token) {
        return data.access_token;
      }
    }
  }

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