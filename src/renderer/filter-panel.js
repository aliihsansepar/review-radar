window.mountFilterPanel = function mountFilterPanel({ list, search, empty, refresh, chips, summary, clear, onChange }) {
  let view = { groups: [], missing: [], shownCount: 0, truncated: false };
  const overrides = new Map();

  function selection() {
    const names = [...view.missing];
    for (const group of view.groups) {
      for (const repo of group.repos) if (repo.selected) names.push(repo.nameWithOwner);
    }
    return [...new Set(names)];
  }

  function matches(text) {
    const query = search.value.trim().toLowerCase();
    return !query || text.toLowerCase().includes(query);
  }

  function commit(names) {
    return window.radar.saveFilter(names).then((next) => {
      if (next && Array.isArray(next.groups)) {
        view = next;
        draw();
      } else if (next && next.error && empty) {
        empty.hidden = false;
        empty.textContent = next.error;
      }
    });
  }

  function toggle(name, selected) {
    const names = new Set(selection());
    if (selected) names.add(name);
    else names.delete(name);
    return commit([...names]);
  }

  function toggleGroup(group) {
    overrides.delete(group.owner);
    const names = new Set(selection());
    const clearing = group.state === 'all';
    for (const repo of group.repos) {
      if (clearing) names.delete(repo.nameWithOwner);
      else names.add(repo.nameWithOwner);
    }
    return commit([...names]);
  }

  function repoRow(repo, className) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = repo.selected;
    box.addEventListener('change', () => toggle(repo.nameWithOwner, box.checked));
    const label = document.createElement('label');
    label.className = className ? `filter-row ${className}` : 'filter-row';
    const text = document.createElement('span');
    text.className = 'filter-name';
    text.textContent = repo.name ?? repo.nameWithOwner;
    label.append(box, text);
    return label;
  }

  function heading(text) {
    const element = document.createElement('div');
    element.className = 'filter-label';
    element.textContent = text;
    return element;
  }

  function ownerGroup(group) {
    const query = search.value.trim().toLowerCase();
    const ownerMatches = !query || group.owner.toLowerCase().includes(query);
    const repos = ownerMatches
      ? group.repos
      : group.repos.filter((repo) => repo.nameWithOwner.toLowerCase().includes(query));
    if (!ownerMatches && repos.length === 0) return null;

    const expanded = overrides.has(group.owner)
      ? overrides.get(group.owner)
      : Boolean(query) || group.state !== 'none';
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-group';

    const team = document.createElement('div');
    team.className = 'filter-team';
    const caret = document.createElement('button');
    caret.type = 'button';
    caret.className = 'filter-caret';
    caret.textContent = expanded ? '▾' : '▸';
    caret.setAttribute('aria-expanded', String(expanded));
    caret.addEventListener('click', () => {
      overrides.set(group.owner, !expanded);
      draw();
    });

    const label = document.createElement('label');
    label.className = 'filter-row owner';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = group.state === 'all';
    box.indeterminate = group.state === 'some';
    box.addEventListener('change', () => toggleGroup(group));
    const avatar = createAvatar(group.owner, group.avatarUrl);
    avatar.classList.add('filter-avatar');
    const name = document.createElement('span');
    name.className = 'filter-name';
    name.textContent = group.owner;
    const badge = document.createElement('span');
    badge.className = group.isOrg ? 'filter-badge' : 'filter-badge user';
    badge.textContent = group.isOrg ? 'org' : 'user';
    const count = document.createElement('span');
    count.className = 'filter-count';
    count.textContent = `${group.repos.filter((repo) => repo.selected).length}/${group.repos.length}`;
    label.append(box, avatar, name, badge, count);
    team.append(caret, label);
    wrapper.append(team);

    if (expanded) {
      const children = document.createElement('div');
      children.className = 'filter-children';
      for (const repo of repos) children.append(repoRow(repo));
      wrapper.append(children);
    }
    return wrapper;
  }

  function chipFor(name) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chip';
    button.title = name;
    const text = document.createElement('span');
    text.textContent = name.split('/')[1] ?? name;
    const cross = document.createElement('span');
    cross.className = 'filter-chip-x';
    cross.textContent = '✕';
    button.append(text, cross);
    button.addEventListener('click', () => toggle(name, false));
    return button;
  }

  function draw() {
    const nodes = [];
    const missing = view.missing.filter(matches);
    if (missing.length > 0) {
      const unreadable = view.ok === false;
      nodes.push(heading(unreadable ? 'Selected' : 'No longer available'));
      for (const name of missing) nodes.push(repoRow({ nameWithOwner: name, selected: true }, unreadable ? undefined : 'missing'));
    }
    nodes.push(...view.groups.map(ownerGroup).filter(Boolean));
    list.replaceChildren(...nodes);

    const names = selection();
    if (chips) {
      chips.replaceChildren(...names.map(chipFor));
      chips.hidden = names.length === 0;
    }
    if (summary) {
      const total = view.groups.reduce((count, group) => count + group.repos.length, 0);
      summary.textContent = total > 0 ? `${names.length} of ${total} repositories shown` : '';
    }
    if (clear) clear.hidden = names.length === 0;

    if (empty) {
      const message = view.error ? view.error : view.truncated ? 'Too many repositories to list — narrow with the search.' : '';
      empty.hidden = !message;
      empty.textContent = message;
    }
    if (onChange) onChange();
  }

  function load(refreshPool) {
    return window.radar.getFilterView(Boolean(refreshPool)).then((next) => {
      if (next && Array.isArray(next.groups)) view = next;
      else if (next && next.error) view = { ...view, error: next.error };
      draw();
    });
  }

  search.addEventListener('input', draw);
  if (refresh) refresh.addEventListener('click', () => load(true));
  if (clear) clear.addEventListener('click', () => commit([]));
  return { load };
};
