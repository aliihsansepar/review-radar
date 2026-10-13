window.mountFilterPanel = function mountFilterPanel({ list, search, empty, refresh, onChange }) {
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

  function row(text, selected, className, value) {
    const label = document.createElement('label');
    label.className = className ? `filter-row ${className}` : 'filter-row';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = selected;
    box.addEventListener('change', () => toggle(value ?? text, box.checked));
    const span = document.createElement('span');
    span.textContent = text;
    label.append(box, span);
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

    const host = document.createElement('div');
    host.className = 'filter-owner';
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
    label.className = 'filter-row org';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = group.state === 'all';
    box.indeterminate = group.state === 'some';
    box.addEventListener('change', () => toggleGroup(group));
    const text = document.createElement('span');
    text.className = 'filter-name';
    text.textContent = group.owner;
    const count = document.createElement('span');
    count.className = 'filter-count';
    count.textContent = `${group.repos.filter((repo) => repo.selected).length}/${group.repos.length}`;
    label.append(box, text, count);
    host.append(caret, label);
    wrapper.append(host);

    if (expanded) {
      const children = document.createElement('div');
      children.className = 'filter-children';
      for (const repo of repos) children.append(row(repo.name, repo.selected, undefined, repo.nameWithOwner));
      wrapper.append(children);
    }
    return wrapper;
  }

  function draw() {
    const nodes = [];
    const missing = view.missing.filter(matches);
    if (missing.length > 0) {
      const unreadable = view.ok === false;
      nodes.push(heading(unreadable ? 'Selected' : 'No longer available'));
      for (const name of missing) nodes.push(row(name, true, unreadable ? undefined : 'missing'));
    }
    const built = view.groups.map((group) => ({ group, node: ownerGroup(group) })).filter((item) => item.node);
    const orgNodes = built.filter((item) => item.group.isOrg).map((item) => item.node);
    const ownerNodes = built.filter((item) => !item.group.isOrg).map((item) => item.node);
    if (orgNodes.length > 0) {
      nodes.push(heading('Organizations'));
      nodes.push(...orgNodes);
    }
    if (ownerNodes.length > 0) {
      nodes.push(heading('Owners'));
      nodes.push(...ownerNodes);
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
      if (next && Array.isArray(next.groups)) view = next;
      else if (next && next.error) view = { ...view, error: next.error };
      draw();
    });
  }

  search.addEventListener('input', draw);
  if (refresh) refresh.addEventListener('click', () => load(true));
  return { load };
};
