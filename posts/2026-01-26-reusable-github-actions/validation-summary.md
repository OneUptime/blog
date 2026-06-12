# Validation Summary: How to Build Reusable GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Composite actions
- Reusable workflows
- JavaScript actions
- GitHub Marketplace publishing
- Docker Buildx GitHub Actions
- Node.js and npm

## Sources Consulted
- GitHub Docs: Metadata syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- GitHub Docs: Creating a composite action - https://docs.github.com/actions/creating-actions/creating-a-composite-action
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Workflow commands for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Publishing actions in GitHub Marketplace - https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace
- GitHub Blog Changelog: Deprecation of Node 20 on GitHub Actions runners - https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- actions/setup-node README - https://github.com/actions/setup-node
- Docker Docs: Docker Build GitHub Actions - https://docs.docker.com/build/ci/github-actions/
- Docker Docs: Manage tags and labels with GitHub Actions - https://docs.docker.com/build/ci/github-actions/manage-tags-labels/

## Issues Found
- Updated JavaScript action runtime from `node20` to `node24` because GitHub's current metadata examples use Node.js v24 and GitHub has started deprecating Node 20 on Actions runners.
- Updated GitHub-maintained action examples from `actions/checkout@v4` and `actions/setup-node@v4` to current `v6` examples, and changed tutorial Node.js example defaults from `20` to `24`.
- Updated Docker action examples from `docker/metadata-action@v5` and `docker/build-push-action@v5` to current `v6` examples.
- Corrected the "Composite Action with Shell Scripts" subsection because the example orchestrates third-party actions rather than running shell scripts.
- Corrected the conventional-commit version bump example so it detects `feat!:` and scoped `feat(scope)!:` subjects instead of only a literal `!` immediately after the commit hash.
- Added `contents: read` to the PR labeler workflow permissions so checkout still has repository read access after the job narrows `GITHUB_TOKEN` permissions.
- Corrected GitHub Marketplace requirements: `author` and branding are not required, while a public repository, a single root action metadata file, and a unique action name are required.
- Fixed the numeric input validation example so the code matches the "positive number" error message by rejecting `0`.

## Review Notes
The examples are technically valid tutorial snippets, but production workflows should also consider pinning third-party actions by full commit SHA for stronger supply-chain integrity and using `fetch-depth: 0` when examples depend on complete Git history.
