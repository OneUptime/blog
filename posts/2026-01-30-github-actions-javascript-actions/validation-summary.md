# Validation Summary: How to Create GitHub Actions JavaScript Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions JavaScript actions
- GitHub Actions action metadata (`action.yml`)
- Node.js action runtimes
- `@actions/core`
- `@actions/github`
- Octokit REST and GraphQL APIs
- `@vercel/ncc`
- Jest
- GitHub Marketplace publishing

## Sources Consulted
- GitHub Docs: Creating a JavaScript action - https://docs.github.com/en/actions/tutorials/create-actions/create-a-javascript-action
- GitHub Docs: Metadata syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- GitHub Changelog: Deprecation of Node 20 on GitHub Actions runners - https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- GitHub Actions Toolkit `@actions/core` README - https://github.com/actions/toolkit/blob/main/packages/core/README.md
- npm package metadata for `@actions/github` - https://www.npmjs.com/package/@actions/github
- GitHub REST API docs: Issue comments - https://docs.github.com/rest/issues/comments
- `@vercel/ncc` README - https://github.com/vercel/ncc
- `actions/setup-node` README - https://github.com/actions/setup-node
- GitHub Docs: Publishing actions in GitHub Marketplace - https://docs.github.com/actions/creating-actions/publishing-actions-in-github-marketplace

## Issues Found
- The post said GitHub currently supports `node16` and `node20` for JavaScript actions and recommended `node20` for new actions. GitHub's current metadata reference lists `node20` and `node24`, and GitHub's changelog says Node 20 is being deprecated. Updated the metadata example and explanatory text to use `node24`.
- The post used exact startup-time numbers and said JavaScript actions work identically across all runner operating systems. GitHub's docs state that cross-platform compatibility depends on portable JavaScript and avoiding unavailable binaries, so the wording was changed to a qualitative comparison.
- The `action.yml` example omitted the `comment-tag` input even though the implementation reads it. Added the optional input with the same default used by the code.
- The `@actions/github` section claimed `getOctokit` returns a client with retry and throttling plugins. Current package metadata and dependencies show REST endpoint helpers and pagination support, but not retry or throttling plugins. Reworded the claim to describe the supported behavior.
- The Jest test attempted to `await require('./index')`, which does not await the async `run()` function. Updated the action example to expose `runPromise` and changed the test to await it after configuring mocks.
- The integration workflow used Node.js 20 for testing. Updated it to Node.js 24 and `actions/setup-node@v5` to align with the action runtime guidance.

## Review Notes
- The workflow example uses `pull-requests: write`, which is valid for creating issue comments on pull requests according to the REST API permissions docs. Workflows triggered from forked pull requests may still have restricted `GITHUB_TOKEN` permissions depending on repository settings.
