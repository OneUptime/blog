# Validation Summary: How to Cache Dependencies in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml` cache configuration)
- Node.js / npm
- Python / pip / venv
- Go modules
- Ruby / Bundler
- Java / Maven
- Mermaid diagrams

## Sources Consulted
- GitLab CI/CD YAML syntax reference — `cache` keyword: https://docs.gitlab.com/ee/ci/yaml/#cache
- GitLab caching dependencies guide: https://docs.gitlab.com/ee/ci/caching/
- GitLab `cache:key:files`, `cache:key:prefix`, `cache:policy`, `cache:fallback_keys` documentation: https://docs.gitlab.com/ee/ci/yaml/#cachekey
- GitLab `extends` keyword and merge behavior: https://docs.gitlab.com/ee/ci/yaml/#extends
- GitLab predefined variables (`CI_COMMIT_REF_SLUG`, `CI_PROJECT_DIR`, `CI_JOB_NAME`): https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- npm CLI docs (`npm ci`, `--cache`, `--prefer-offline`): https://docs.npmjs.com/cli/commands/npm-ci

## Issues Found
No technical issues found.

## Review Notes
- All `cache` keywords used are current and correctly spelled: `key`, `paths`, `policy`, `key:files`, `key:prefix`, `fallback_keys`, and the array form for multiple caches.
- `cache:key:files` accepts a maximum of two files. The composite-key example uses exactly two (`Gemfile.lock`, `package-lock.json`) and the complete example uses one each — both within the limit.
- `cache:policy` values (`pull`, `push`, `pull-push`) and the stated default (`pull-push`) are accurate.
- `cache:fallback_keys` (list form) is correct; it was introduced in GitLab 15.0. There is also a global `CACHE_FALLBACK_KEY` variable for single-key fallback, but the per-cache list form used here is the current recommended approach.
- The `extends` + single-hash `cache` override pattern in the "Complete Example" relies on GitLab's deep-merge behavior, which correctly merges the inherited `key`/`paths` with the per-job `policy`. This is valid.
- The Cache vs Artifacts comparison table accurately reflects that cache is best-effort and branch/global-scoped while artifacts are guaranteed and pipeline-scoped.
- Caveat (not an error): caching a Python `venv/` directory works but bakes in absolute paths, so it is somewhat fragile across runner environments; caching only the pip cache (`.pip-cache/`) and recreating the venv is often more robust. The post's approach is a commonly documented pattern and is acceptable.
- The "reduce pipeline execution time by 50% or more" figure is a reasonable, non-specific marketing-style claim rather than a precise technical assertion.
