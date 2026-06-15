# Validation Summary: How to Configure Pre-commit Hooks for Code Quality

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git hooks
- pre-commit framework
- Husky
- lint-staged
- ESLint
- Prettier
- Black
- isort
- Ruff
- Go hooks
- Terraform hooks
- ShellCheck
- GitHub Actions

## Sources Consulted
- Git hooks documentation: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
- pre-commit official documentation: https://pre-commit.com/
- Husky official documentation: https://typicode.github.io/husky/get-started.html
- Husky hook setup documentation: https://typicode.github.io/husky/how-to.html
- Prettier pre-commit documentation: https://prettier.io/docs/precommit
- pre-commit/action README: https://github.com/pre-commit/action
- pre-commit/pre-commit-hooks manifest: https://github.com/pre-commit/pre-commit-hooks
- astral-sh/ruff-pre-commit manifest: https://github.com/astral-sh/ruff-pre-commit
- pre-commit/mirrors-eslint README: https://github.com/pre-commit/mirrors-eslint
- pre-commit/mirrors-prettier README: https://github.com/pre-commit/mirrors-prettier
- dnephin/pre-commit-golang manifest: https://github.com/dnephin/pre-commit-golang
- antonbabenko/pre-commit-terraform manifest: https://github.com/antonbabenko/pre-commit-terraform
- shellcheck-py/shellcheck-py manifest: https://github.com/shellcheck-py/shellcheck-py

## Issues Found
- The Husky example used the older `_/husky.sh` sourcing pattern. Current Husky v9 documentation shows hook files as direct shell scripts without sourcing that helper, and Husky has marked the old lines for removal before v10. Updated the `.husky/pre-commit` example to run `npx lint-staged` directly.
- The Hook Stages example used deprecated pre-commit stage aliases `commit` and `push`. Current pre-commit documentation uses hook names such as `pre-commit` and `pre-push`. Updated the stage values accordingly.
- The GitHub Actions example used `pre-commit/action@v3.0.0`, while the official README documents `v3.0.1`. Updated the action version to `v3.0.1`.
- The JavaScript/TypeScript Prettier example used `pre-commit/mirrors-prettier`, which is archived. Replaced it with a local `npx prettier --write` pre-commit hook, matching the current local-hook pattern used elsewhere in the post.

## Review Notes
- The examples pin several older hook and tool versions. The tags and hook IDs were verified, and pinning older versions is valid for reproducibility, but future maintenance should include periodic `pre-commit autoupdate`.
- `pre-commit/action` is still usable, but its README says the action is maintenance-only and generally recommends `pre-commit.ci` for more features.
- YAML and JSON snippets parse successfully. The five `.pre-commit-config.yaml` snippets validate successfully with `pre-commit 4.6.0`; the GitHub Actions workflow snippet was parsed as YAML but skipped for `pre-commit validate-config` because it is not a pre-commit config.
