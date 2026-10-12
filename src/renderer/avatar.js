const AVATAR_COLORS = ['#a3896b', '#5a9fc7', '#6a9fd8', '#4fa3d9', '#7d6bd6', '#c77a5a', '#5aa37f', '#b0659e'];

function initials(login) {
  return (login || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
}

function avatarColor(login) {
  let hash = 0;
  for (const char of login || '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function createAvatar(login, avatarUrl) {
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.background = avatarColor(login);
  const fallback = document.createElement('span');
  fallback.textContent = initials(login);
  avatar.append(fallback);
  if (avatarUrl && avatarUrl.startsWith('https://avatars.githubusercontent.com/')) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}s=64`;
    img.addEventListener('load', () => {
      avatar.style.background = 'transparent';
      fallback.replaceWith(img);
    });
  }
  return avatar;
}
