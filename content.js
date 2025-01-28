import config from './config.js';

// Listen for successful submission
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.target.textContent.includes('Accepted')) {
      handleSuccessfulSubmission();
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

async function handleSuccessfulSubmission() {
  // Get problem details
  const problemTitle = document.querySelector('[data-cy="question-title"]').textContent;
  const code = await getSubmittedCode();
  
  // Send to background script to handle GitHub upload
  chrome.runtime.sendMessage({
    type: 'SUBMIT_TO_GITHUB',
    payload: {
      title: problemTitle,
      code: code
    }
  });
}

async function getSubmittedCode() {
  // This will need to be adjusted based on LeetCode's DOM structure
  const codeElement = document.querySelector('.CodeMirror-code');
  return codeElement ? codeElement.textContent : '';
} 