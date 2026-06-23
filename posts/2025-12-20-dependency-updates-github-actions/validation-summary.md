# Validation Summary: How to Set Up Dependency Updates in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Dependabot (`dependabot.yml`)
- Renovate bot (`renovate.json`)
- GitHub Actions workflows
- `dependabot/fetch-metadata` action
- `peter-evans/create-pull-request` action
- `actions/github-script` action
- npm (`npm outdated`, `npm audit`, `npm update`, `npm ci`)
- Python `pip-tools` (`pip-compile`)
- Go modules (`go get`, `go mod tidy`)
- GitHub Actions cron scheduling

## Sources Consulted
- GitHub Dependabot configuration reference — https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
- Dependabot `reviewers` option removal changelog (May 2025) — https://github.blog/changelog/2025-08-08-dependabot-reviewers-configuration-option-is-replaced-by-code-owners/
- Renovate configuration options — https://docs.renovatebot.com/configuration-options/
- Renovate full config presets (`config:recommended` replacing `config:base`) — https://docs.renovatebot.com/presets-config/
- Renovate issue #23326 (replace `config:base` with `config:recommended`) — https://github.com/renovatebot/renovate/issues/23326
- Renovate group presets (`group:recommended`) — https://docs.renovatebot.com/presets-group/
- Renovate string pattern matching (`matchPackageNames` glob/regex) — https://docs.renovatebot.com/string-pattern-matching/
- peter-evans/create-pull-request releases (v8 current) — https://github.com/peter-evans/create-pull-request/releases

## Issues Found
1. **Renovate `config:base` is deprecated** — The `extends` array used `"config:base"`, which Renovate deprecated in favor of `"config:recommended"`. The config validator now warns and auto-migrates it. Changed `"config:base"` to `"config:recommended"`.
2. **Renovate `matchPackagePatterns` is deprecated** — The two `packageRules` entries used `matchPackagePatterns`, which Renovate deprecated in favor of `matchPackageNames` (which now supports exact, glob, and regex matching). Migrated `"matchPackagePatterns": ["eslint"]` to `"matchPackageNames": ["/eslint/"]` and `"matchPackagePatterns": ["jest", "@types/jest"]` to `"matchPackageNames": ["/jest/", "/@types/jest/"]`, using regex delimiters to preserve the original substring-matching behavior.
3. **Dependabot `reviewers` option was removed** — The `dependabot.yml` npm entry used the `reviewers` key, which GitHub removed on May 20, 2025 (replaced by CODEOWNERS). Removed the `reviewers` block and added a short comment pointing readers to use a CODEOWNERS file instead.

## Review Notes
- `peter-evans/create-pull-request@v8` is the current major version, so all references to it are correct (no change needed).
- All GitHub Actions referenced are at current major versions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, `actions/setup-go@v5`, `actions/github-script@v7`, and `dependabot/fetch-metadata@v2`.
- The Renovate `reviewers` option (`"reviewers": ["team:maintainers"]`) is unaffected — only Dependabot's `reviewers` option was removed, so the Renovate config is left as-is.
- The Dependabot auto-merge workflow correctly relies on `dependabot/fetch-metadata` outputs (`update-type`) and uses `gh pr merge --auto --squash` / `gh pr review --approve`, which is the GitHub-recommended pattern.
- Cron expressions, `npm`/`jq` pipelines, and the multi-language update jobs are syntactically and semantically correct.
- Minor non-blocking caveat (left as written): `npm audit fix --force` can introduce breaking changes by upgrading across major versions; the post already runs tests afterward, which mitigates this, and the surrounding text frames it as a force-fix fallback.
