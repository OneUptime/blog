# Validation Summary: How to Set Up Changelog Generation in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflows
- Conventional Commits
- release-please
- semantic-release
- Bash changelog generation scripts
- actions/github-script
- GitHub REST API releases
- commitlint
- peter-evans/create-pull-request
- npm versioning

## Sources Consulted
- Conventional Commits 1.0.0 specification: https://www.conventionalcommits.org/en/v1.0.0/
- release-please-action README: https://github.com/googleapis/release-please-action
- semantic-release GitHub Actions recipe: https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/ci-configurations/github-actions.md
- peter-evans/create-pull-request README: https://github.com/peter-evans/create-pull-request
- actions/github-script README: https://github.com/actions/github-script
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub REST API releases documentation: https://docs.github.com/en/rest/releases/releases
- commitlint rules reference: https://commitlint.js.org/reference/rules.html
- actions/checkout README: https://github.com/actions/checkout
- npm version documentation: https://docs.npmjs.com/cli/v8/commands/npm-version
- git describe documentation: https://git-scm.com/docs/git-describe

## Issues Found
- The Conventional Commits table treated `BREAKING CHANGE` as a commit type. Updated it to describe breaking changes as either a `!` marker or a `BREAKING CHANGE` footer, matching the specification.
- The release-please workflow was missing the documented `issues: write` permission and used the obsolete `package-name` action input with v4. Added `issues: write` and removed `package-name`.
- The semantic-release workflow did not request the GitHub token permissions needed for publishing GitHub releases and commenting on issues or pull requests. Added job permissions for `contents`, `issues`, and `pull-requests`.
- The create-pull-request examples did not declare the `contents: write` and `pull-requests: write` permissions required when default workflow permissions are restricted. Added the permissions to the relevant jobs.
- The custom changelog parser classified `feat!:` and similar breaking-change headers as features because it checked `feat` before breaking changes. Reordered and expanded the breaking-change detection.
- The version-bumping example failed when no tags existed because `git describe --tags --abbrev=0` was used directly inside the `git log` range. Added a no-tag fallback range.
- The version-bumping example only checked commit subjects for breaking-change footers and did not recognize `!` breaking-change headers. Updated the git log format and grep patterns.
- The github-script changelog example could throw when there were no commits in the selected range. Added an empty-output guard.
- The CHANGELOG here-doc in the version-bumping workflow used a quoted delimiter around variables that were meant to expand, which would write literal `$VERSION` and `$DATE`. Replaced it with `printf` for the header and a quoted here-doc only for the changelog body.
- The GitHub release example interpolated multiline release notes directly into JavaScript source, which can cause syntax errors or script injection issues. Passed release notes through environment variables and read them with `process.env`.
- The GitHub release example always generated a compare URL even when there was no previous tag. Added logic to omit the full changelog link when no previous tag exists.

## Review Notes
The post is technically relevant and current after the fixes. The custom changelog scripts remain simplified examples and do not cover every edge case handled by release-please or semantic-release, such as unusual commit delimiters or all Conventional Commit footer parsing cases.
