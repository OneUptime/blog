# Validation Summary: How to Configure Conventional Commits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Conventional Commits
- Git commit messages
- commitlint
- Husky
- Commitizen
- cz-conventional-changelog
- cz-customizable
- GitHub Actions
- GitHub squash merge settings
- amannn/action-semantic-pull-request

## Sources Consulted
- Conventional Commits 1.0.0 specification: https://www.conventionalcommits.org/en/v1.0.0/
- commitlint local setup guide: https://commitlint.js.org/guides/local-setup.html
- commitlint CLI reference: https://commitlint.js.org/reference/cli.html
- commitlint rules reference: https://commitlint.js.org/reference/rules.html
- Husky get started guide: https://typicode.github.io/husky/get-started.html
- Commitizen CLI README: https://github.com/commitizen/cz-cli
- cz-customizable README and example config: https://github.com/leoforfree/cz-customizable
- semantic-pull-request action README: https://github.com/amannn/action-semantic-pull-request
- GitHub Docs, configuring commit squashing: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests

## Issues Found
- The custom Commitizen adapter section used `cz-customizable` without installing it. Added `npm install --save-dev cz-customizable` before the `.cz-config.js` example.
- The Commitizen adapter path for `cz-customizable` was shown as `"cz-customizable"`, while the adapter documentation shows the package path form. Changed it to `"node_modules/cz-customizable"`.
- The semantic pull request workflow used `amannn/action-semantic-pull-request@v5`, while the current documented major version is `v6`. Updated the action reference to `@v6`.
- The GitHub squash merge setting label was imprecise. Updated the instructions to enable "Allow squash merging" and choose "Default to PR title for squash merge commits."

## Review Notes
The commitlint and Husky examples match the current commitlint Husky v9 setup guidance. The commitlint CI range using `--from` and `--to` is supported by the current CLI. The Conventional Commits examples and breaking-change syntax align with the 1.0.0 specification.
