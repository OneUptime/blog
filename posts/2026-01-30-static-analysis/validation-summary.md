# Validation Summary: How to Implement Static Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ESLint (with `@typescript-eslint`)
- TypeScript
- Ruff (Python linter)
- mypy
- Bandit
- golangci-lint
- staticcheck
- SonarQube
- Semgrep
- CodeQL
- GitHub Actions
- GitLab CI
- pre-commit framework

## Sources Consulted
- Ruff configuration documentation: https://docs.astral.sh/ruff/configuration/
- Ruff release notes / breaking changes (0.2.0 lint section migration): https://docs.astral.sh/ruff/versioning/
- ESLint documentation (custom rules, plugins): https://eslint.org/docs/latest/extend/custom-rules
- typescript-eslint config docs: https://typescript-eslint.io/users/configs
- golangci-lint linters-settings (govet): https://golangci-lint.run/usage/linters/#govet
- Semgrep rule writing: https://semgrep.dev/docs/writing-rules/overview
- Semgrep CI / baseline-commit: https://semgrep.dev/docs/cli-reference
- pre-commit framework docs: https://pre-commit.com/
- GitHub Actions reference (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`)
- SonarQube New Code Definition docs: https://docs.sonarqube.org/latest/project-administration/defining-new-code/

## Issues Found

1. **Ruff `pyproject.toml` used the pre-0.2.0 layout.**
   Original code placed `select`, `ignore`, `per-file-ignores`, and `isort` directly under `[tool.ruff]`. As of Ruff 0.2.0 (Feb 2024), these lint-related settings were moved to `[tool.ruff.lint]`, `[tool.ruff.lint.per-file-ignores]`, and `[tool.ruff.lint.isort]`. The legacy form emits deprecation warnings and is no longer the recommended layout. Updated the example to use the current `[tool.ruff.lint]` structure (while keeping `target-version` and `line-length` at the top level, where they belong).

2. **`golangci-lint` `govet.check-shadowing` is deprecated.**
   The `check-shadowing: true` shorthand was deprecated in favor of explicitly enabling the `shadow` analyzer via `govet.enable: [shadow]`. Updated the `.golangci.yml` example accordingly.

## Review Notes

- The post uses ESLint's legacy `.eslintrc.js` configuration format. ESLint v9 (April 2024) made flat config (`eslint.config.js`) the default. The legacy format still works (via `@eslint/eslintrc` compatibility or older ESLint v8), so the examples remain valid for many real-world projects, but a future revision could mention the flat-config migration.
- Similarly, the `@typescript-eslint/recommended-requiring-type-checking` preset was renamed to `@typescript-eslint/recommended-type-checked` in typescript-eslint v6. The legacy name still resolves for compatibility but a future update could modernize this.
- The `returntocorp/semgrep-action@v1` GitHub Action still functions, but Semgrep's recommended modern approach is to run `semgrep ci` directly inside a workflow step (as the GitLab example already does). Not a correctness issue.
- The custom ESLint rule example assumes the `eslint-plugin-local-rules` package is installed and wired up; the post mentions registering `'local-rules'` as a plugin but does not show installing the package. This is a minor omission rather than an inaccuracy.
- The `ruff-pre-commit` rev pin `v0.1.9` is an older release (late 2023). It still works but readers should bump it to a current Ruff version for the latest rule coverage.
- All shell commands (`pip install`, `npm install`, `go install`, `semgrep --config`, `pre-commit install`, `eslint --cache`, `ruff check --add-noqa`, `semgrep --baseline-commit`, `golangci-lint run --new-from-rev`) were verified against current CLI documentation and are accurate.
