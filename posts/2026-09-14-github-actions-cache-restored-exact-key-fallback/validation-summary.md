# Validation Summary: GitHub Actions Cache Restored but cache-hit Is False: Fallback Keys

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
- [GitHub cache action v6 restore implementation](https://github.com/actions/cache/blob/v6/src/restoreImpl.ts)
- [GitHub cache action v6 output documentation](https://github.com/actions/cache/blob/v6/README.md#outputs)
- [GitHub dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub `actions/setup-node` documentation](https://github.com/actions/setup-node)
- [GitHub `actions/checkout` releases](https://github.com/actions/checkout/releases)
- [npm CLI v11 `npm ci` documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## Issues Found

- No technical error was found in the original three-outcome explanation. Conflicting prose in the cache-action documentation was resolved against the v6 implementation: a missing cache entry returns without setting `cache-hit`, so an empty output is possible. The post now cites that versioned implementation and preserves `!= 'true'` for both fallback restores and misses.

## Review Notes

- The `actions/checkout@v6`, `actions/setup-node@v6`, and `actions/cache/restore@v6`/`save@v6` references are valid as of the validation date.
- `package-manager-cache: false`, `cache-primary-key`, and `cache-matched-key` are valid inputs and outputs for the action versions shown.
- The recommendation to run `npm ci` after restoring `~/.npm` is correct because that cache contains package-manager download data rather than an installed `node_modules` tree.
