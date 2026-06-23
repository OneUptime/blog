# Validation Summary: How to Set Up Linting Pipeline in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub Actions dependency caching
- GitHub code scanning SARIF upload
- ESLint
- Prettier
- TypeScript
- Ruff
- MyPy
- pre-commit
- Go and golangci-lint
- YAML and GitHub Actions workflow linting
- Monorepo path filtering with dorny/paths-filter

## Sources Consulted
- GitHub Actions workflow syntax and concurrency documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- actions/checkout README and releases: https://github.com/actions/checkout
- actions/setup-node README: https://github.com/actions/setup-node
- actions/setup-python README: https://github.com/actions/setup-python
- actions/cache README: https://github.com/actions/cache
- ESLint CLI documentation: https://eslint.org/docs/latest/use/command-line-interface
- ESLint flat configuration documentation: https://eslint.org/docs/latest/use/configure/configuration-files
- ESLint v10 release notes: https://eslint.org/blog/2026/02/eslint-v10.0.0-released/
- typescript-eslint getting started guide: https://typescript-eslint.io/getting-started/
- Prettier CLI documentation: https://prettier.io/docs/cli
- Ruff linter documentation: https://docs.astral.sh/ruff/linter/
- MyPy command-line documentation: https://mypy.readthedocs.io/en/stable/command_line.html
- pre-commit documentation: https://pre-commit.com/
- golangci-lint-action README: https://github.com/golangci/golangci-lint-action
- dorny/paths-filter README: https://github.com/dorny/paths-filter
- action-validator README: https://github.com/mpalmer/action-validator

## Issues Found
- The ESLint configuration example used legacy `.eslintrc.js` format. ESLint v10 has removed eslintrc support, so the snippet was updated to `eslint.config.mjs` flat config using `@eslint/js`, `typescript-eslint`, `eslint/config`, and `eslint-config-prettier/flat`.
- The SARIF upload example omitted required code scanning permissions and used an older `github/codeql-action/upload-sarif` major version. Added `security-events: write`, `actions: read`, and `contents: read`, updated the action to `upload-sarif@v4`, and added explicit no-save installation of `@microsoft/eslint-formatter-sarif`.
- Several GitHub Action examples used older major versions than the current official examples. Updated `actions/checkout`, `actions/setup-node`, `actions/setup-python`, `actions/setup-go`, `actions/cache`, and `golangci/golangci-lint-action` references to current major versions where they appeared in the post.
- The Go linting example pinned `go-version: '1.22'`, which is no longer a current Go version. Updated it to `go-version: stable` to match the current official golangci-lint-action example pattern.
- The SARIF explanation implied that annotations appear unconditionally. Updated it to note that code scanning must be enabled and required permissions must be available.

## Review Notes
- The ESLint `--ext`, `--cache`, `--cache-location`, and `--max-warnings 0` flags are still valid in current ESLint CLI documentation.
- Prettier `--check`, Ruff `check`, Ruff `format --check`, MyPy `--ignore-missing-imports`, and `pre-commit run --all-files` were verified against official documentation.
- The workflows were reviewed as snippets, not executed against a real repository, because they depend on each project's package manifests, linter configuration, and GitHub repository settings.
