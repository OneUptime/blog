# Validation Summary: How to Configure Code Formatting Automation

## Status

validated

## Post Type

Tutorial / Guide

## Technologies Covered

- Prettier
- ESLint flat config
- eslint-config-prettier and eslint-plugin-prettier
- TypeScript ESLint parser and plugin
- VS Code settings and extensions
- Husky
- lint-staged
- GitHub Actions
- Black
- isort
- Ruff
- Go gofmt and goimports
- EditorConfig
- Git blame ignore revisions

## Sources Consulted

- Prettier options and CI guidance: https://prettier.io/docs/options
- ESLint flat configuration files: https://eslint.org/docs/latest/use/configure/configuration-files
- eslint-config-prettier flat config guidance: https://github.com/prettier/eslint-config-prettier
- typescript-eslint package and flat config guidance: https://typescript-eslint.io/packages/typescript-eslint
- VS Code ESLint extension code actions on save: https://github.com/microsoft/vscode-eslint
- Husky get started and hook documentation: https://typicode.github.io/husky/get-started.html and https://typicode.github.io/husky/how-to.html
- lint-staged configuration and auto-staging behavior: https://github.com/lint-staged/lint-staged
- Black configuration and pre-commit integration: https://black.readthedocs.io/en/stable/usage_and_configuration/the_basics.html and https://black.readthedocs.io/en/stable/integrations/source_version_control.html
- isort Black profile and pre-commit integration: https://black.readthedocs.io/en/stable/guides/using_black_with_other_tools.html and https://isort.readthedocs.io/en/latest/configuration/pre-commit.html
- Ruff pre-commit integration: https://docs.astral.sh/ruff/integrations/
- goimports command documentation: https://pkg.go.dev/golang.org/x/tools/cmd/goimports
- EditorConfig project and specification: https://editorconfig.org/ and https://spec.editorconfig.org/

## Issues Found

- The ESLint installation command imported `@eslint/js` in the flat config example but did not install it as a direct development dependency. Added `@eslint/js` to the install command.
- The TypeScript ESLint example imported `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` but did not tell readers to install the TypeScript-related packages. Added the required install command for `typescript`, `@typescript-eslint/parser`, and `@typescript-eslint/eslint-plugin`.
- The Husky pre-commit hook used the legacy `_/husky.sh` bootstrap line. Current Husky documentation shows plain hook scripts under `.husky/`, so the hook now contains only `npx lint-staged`.
- The Python pre-commit example used older Black, isort, and Ruff hook revisions and the old Ruff hook ID. Updated the example to the current official Black pre-commit mirror, current isort hook version, and Ruff's current `ruff-check` hook ID.
- The Python pre-commit example ran Ruff with `--fix` after Black and isort. Ruff's documentation says fix mode should run before Black, isort, and other formatters because it may produce changes that need formatting. Reordered the hooks accordingly.
- The workflow diagram implied developers manually add formatted files after lint-staged changes. Current lint-staged automatically adds successful task modifications to the commit, so the diagram now says lint-staged updates the index.

## Review Notes

- The optional GitHub Actions job that commits formatting changes to pull requests is technically plausible, but in real repositories it may need explicit workflow permissions and will not work for every forked pull request setup.
- Version pins in pre-commit examples should be refreshed periodically with `pre-commit autoupdate`.
