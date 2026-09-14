# Validation Summary: Version Immutable GitHub Actions Cache Keys Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- GitHub Actions
- `actions/cache@v6`
- `actions/setup-node`
- Node.js 24
- npm and `npm ci`
- YAML workflow configuration

## Sources Consulted

- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Official actions/cache repository and v6 usage documentation](https://github.com/actions/cache)
- [Official actions/cache update workaround](https://github.com/actions/cache/blob/main/tips-and-workarounds.md#update-a-cache)
- [Official actions/cache caching strategies](https://github.com/actions/cache/blob/main/caching-strategies.md)
- [Official actions/setup-node documentation](https://github.com/actions/setup-node#caching-global-packages-data)
- [GitHub CLI `gh cache list` reference](https://cli.github.com/manual/gh_cache_list)
- [GitHub documentation for managing caches](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manage-caches)
- [npm CLI v11 `npm ci` documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## Issues Found

- The post warned against enabling a second cache in setup-node, but current setup-node versions can automatically enable npm caching when `package.json` declares npm in `packageManager` or `devEngines.packageManager`. Updated the guidance to specify `package-manager-cache: false` when the standalone `actions/cache` step owns the same npm cache directory.

## Review Notes

- The `actions/cache@v6` examples, GitHub expression syntax, cache immutability explanation, restore-key ordering, unique run key strategy, matrix-writer warning, and npm `node_modules` distinction are consistent with current official documentation.
- The examples intentionally use a human-managed `v4` cache-policy namespace; this is distinct from the action release (`actions/cache@v6`) and GitHub's internal cache version metadata.
