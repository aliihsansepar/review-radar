const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo,read:org&description=Review%20Radar';

const form = document.getElementById('form');
const tokenInput = document.getElementById('token');
const connectButton = document.getElementById('connect');
const errorText = document.getElementById('error');
const ghSection = document.getElementById('gh-section');
const tokenSection = document.getElementById('token-section');
const ghButton = document.getElementById('gh-connect');
let ghLabel = ghButton.textContent;

function showError(message) {
  errorText.hidden = !message;
  errorText.textContent = message ?? '';
  tokenInput.setAttribute('aria-invalid', String(Boolean(message)));
}

function showTokenForm() {
  showError(null);
  ghSection.hidden = true;
  tokenSection.hidden = false;
  connectButton.hidden = false;
  tokenInput.focus();
}

function showGhOption(login) {
  ghLabel = login ? `Continue as @${login}` : 'Continue with GitHub CLI';
  ghButton.textContent = ghLabel;
  ghSection.hidden = false;
  ghButton.focus();
}

tokenInput.addEventListener('input', () => {
  connectButton.disabled = tokenInput.value.trim() === '';
  showError(null);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (tokenSection.hidden || tokenInput.value.trim() === '') return;
  connectButton.disabled = true;
  tokenInput.disabled = true;
  connectButton.textContent = 'Connecting…';
  const result = await window.radar.connect(tokenInput.value);
  if (result.ok) return;
  showError(result.error);
  connectButton.textContent = 'Connect';
  connectButton.disabled = false;
  tokenInput.disabled = false;
  tokenInput.focus();
});

ghButton.addEventListener('click', async () => {
  showError(null);
  ghButton.disabled = true;
  ghButton.textContent = 'Connecting…';
  const result = await window.radar.connectGh();
  if (result.ok) return;
  showError(result.error);
  ghButton.textContent = ghLabel;
  ghButton.disabled = false;
});

document.getElementById('use-token').addEventListener('click', (event) => {
  event.preventDefault();
  showTokenForm();
});

document.getElementById('create-token').addEventListener('click', (event) => {
  event.preventDefault();
  window.radar.openUrl(TOKEN_URL);
});

document.getElementById('quit').addEventListener('click', () => window.radar.quit());

window.radar
  .ghAccount()
  .catch(() => null)
  .then((account) => (account ? showGhOption(account.login) : showTokenForm()));
