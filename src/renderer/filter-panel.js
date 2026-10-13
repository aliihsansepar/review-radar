window.mountFilterPanel = function mountFilterPanel({ list, search, empty, refresh, onChange }) {
  let view = { orgs: [], loose: [], missing: [], shownCount: 0, truncated: false };
  const overrides = new Map();

  function selection() {
    const names = [...view.missing];
    for (const org of view.orgs) {
      for (const repo of org.repos) if (repo.selected) names.push(repo.nameWithOwner);
    }
    for (const repo of view.loose) if (repo.selected) names.push(repo.nameWithOwner);
    return [...new Set(names)];
  }

  function matches(text) {
    const query = search.value.trim().toLowerCase();
    return !query || text.toLowerCase().includes(query);
  }

  function commit(names) {
    return window.radar.saveFilter(names).then((next) => {
      if (next && Array.isArray(next.orgs)) {
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

  function toggleOrg(org) {
    overrides.delete(org.login);
    const names = new Set(selection());
    const clearing = org.state === 'all';
    for (const repo of org.repos) {
      if (clearing) names.delete(repo.nameWithOwner);
      else names.add(repo.nameWithOwner);
    }
    return commit([...names]);
  }

  function row(name, selected, className) {
    const label = document.createElement('label');
    label.className = className ? `filter-row ${className}` : 'filter-row';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = selected;
    box.addEventListener('change', () => toggle(name, box.checked));
    const text = document.createElement('span');
    text.textContent = name;
    label.append(box, text);
    return label;
  }

  function heading(text) {
    const element = document.createElement('div');
    element.className = 'filter-label';
    element.textContent = text;
    return element;
  }

  function orgGroup(org) {
    const query = search.value.trim().toLowerCase();
    const loginMatches = !query || org.login.toLowerCase().includes(query);
    const repos = loginMatches
      ? org.repos
      : org.repos.filter((repo) => repo.nameWithOwner.toLowerCase().includes(query));
    if (!loginMatches && repos.length === 0) return null;

    const expanded = overrides.has(org.login) ? overrides.get(org.login) : Boolean(query) || org.state !== 'none';
    const group = document.createElement('div');
    group.className = 'filter-group';

    const host = document.createElement('div');
    host.className = 'filter-org';
    const caret = document.createElement('button');
    caret.type = 'button';
    caret.className = 'filter-caret';
    caret.textContent = expanded ? '▾' : '▸';
    caret.setAttribute('aria-expanded', String(expanded));
    caret.addEventListener('click', () => {
      overrides.set(org.login, !expanded);
      draw();
    });

    const label = document.createElement('label');
    label.className = 'filter-row org';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = org.state === 'all';
    box.indeterminate = org.state === 'some';
    box.addEventListener('change', () => toggleOrg(org));
    const text = document.createElement('span');
    text.className = 'filter-name';
    text.textContent = org.login;
    const count = document.createElement('span');
    count.className = 'filter-count';
    count.textContent = `${org.repos.filter((repo) => repo.selected).length}/${org.repos.length}`;
    label.append(box, text, count);
    host.append(caret, label);
    group.append(host);

    if (expanded) {
      const children = document.createElement('div');
      children.className = 'filter-children';
      for (const repo of repos) children.append(row(repo.nameWithOwner, repo.selected));
      group.append(children);
    }
    return group;
  }

  function draw() {
    const nodes = [];
    const missing = view.missing.filter(matches);
    if (missing.length > 0) {
      const unreadable = view.ok === false;
      nodes.push(heading(unreadable ? 'Selected' : 'No longer available'));
      for (const name of missing) nodes.push(row(name, true, unreadable ? undefined : 'missing'));
    }
    const orgs = view.orgs.map(orgGroup).filter(Boolean);
    if (orgs.length > 0) {
      nodes.push(heading('Organizations'));
      nodes.push(...orgs);
    }
    const loose = view.loose.filter((repo) => matches(repo.nameWithOwner));
    if (loose.length > 0) {
      nodes.push(heading('Repositories'));
      for (const repo of loose) nodes.push(row(repo.nameWithOwner, repo.selected));
    }
    list.replaceChildren(...nodes);
    if (empty) {
      const message = view.error ? view.error : view.truncated ? 'Too many repositories to list — narrow with the search.' : '';
      empty.hidden = !message;
      empty.textContent = message;
    }
    if (onChange) onChange();
  }

  function load(refreshPool) {
    return window.radar.getFilterView(Boolean(refreshPool)).then((next) => {
      if (next && Array.isArray(next.orgs)) view = next;
      else if (next && next.error) view = { ...view, error: next.error };
      draw();
    });
  }

  search.addEventListener('input', draw);
  if (refresh) refresh.addEventListener('click', () => load(true));
  return { load };
};
