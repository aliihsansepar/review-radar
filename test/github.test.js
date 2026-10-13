const test = require('node:test');
const assert = require('node:assert/strict');
const github = require('../src/main/github');

function stubFetch(pages) {
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const page = pages[body.variables.cursor ?? null];
    return {
      status: 200,
      ok: true,
      headers: { get: () => null, has: () => false },
      json: async () => ({ data: page }),
    };
  };
}

const page = (names, hasNextPage, endCursor) => ({
  viewer: {
    organizations: names.orgs ? { nodes: names.orgs.map((login) => ({ login })) } : { nodes: [] },
    repositories: {
      pageInfo: { hasNextPage, endCursor },
      nodes: names.repos.map((nameWithOwner) => ({ nameWithOwner })),
    },
  },
});

test('fetchRepoPool walks every page and collects orgs and repos', async () => {
  stubFetch({
    null: page({ orgs: ['acme'], repos: ['acme/web'] }, true, 'c1'),
    c1: page({ repos: ['me/tool'] }, false, null),
  });
  const pool = await github.fetchRepoPool('t');
  assert.deepEqual(pool.orgs, ['acme']);
  assert.deepEqual(pool.repos, ['acme/web', 'me/tool']);
  assert.equal(pool.truncated, false);
});

test('fetchRepoPool stops at maxPages and reports truncation', async () => {
  stubFetch({
    null: page({ repos: ['a/1'] }, true, 'c1'),
    c1: page({ repos: ['a/2'] }, true, 'c2'),
  });
  const pool = await github.fetchRepoPool('t', { maxPages: 2 });
  assert.deepEqual(pool.repos, ['a/1', 'a/2']);
  assert.equal(pool.truncated, true);
});
