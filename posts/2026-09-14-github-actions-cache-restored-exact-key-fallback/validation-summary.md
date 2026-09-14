# Validation Summary: GitHub Actions Says “Cache Restored” but `cache-hit` Is False: Exact Keys vs `restore-keys`

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- GitHub Actions
- `actions/cache` restore and save actions
- `actions/setup-node`
- npm dependency caching
- `npm ci`
- YAML workflow configuration

## Sources Consulted

- [GitHub `actions/cache` documentation](https://github.com/actions/cache)
- [GitHub standalone cache restore action documentation](https://github.com/actions/cache/tree/main/restore)
- [GitHub cache restore action metadata](https://github.com/actions/cache/blob/main/restore/action.yml)
- [GitHub dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub `actions/setup-node` documentation](https://github.com/actions/setup-node)
- [GitHub `actions/checkout` releases](https://github.com/actions/checkout/releases)
- [npm CLI v11 `npm ci` documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## Issues Found

- The post said that a complete cache miss can produce an empty `cache-hit` string. The current `actions/cache` and standalone restore-action documentation specifies `'false'` for both a non-exact restore and a cache miss. Updated the explanation accordingly while preserving `!= 'true'` as the safe condition for all non-exact outcomes.

## Review Notes

- The `actions/checkout@v6`, `actions/setup-node@v6`, and `actions/cache/restore@v6`/`save@v6` references are current and valid as of the validation date.
- `package-manager-cache: false`, `cache-primary-key`, and `cache-matched-key` are valid inputs and outputs for the action versions shown.
- The recommendation to run `npm ci` after restoring `~/.npm` is correct because that cache contains package-manager download data rather than an installed `node_modules` tree.
