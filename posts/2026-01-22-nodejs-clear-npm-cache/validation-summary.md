# Validation Summary: How to Clear npm Cache and Fix Related Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Node.js
- npm CLI
- npx
- GitHub Actions
- GitLab CI
- Docker BuildKit
- Yarn
- pnpm
- Verdaccio

## Sources Consulted
- npm CLI `npm cache` documentation: https://docs.npmjs.com/cli/v10/commands/npm-cache/
- npm CLI configuration documentation: https://docs.npmjs.com/cli/v10/using-npm/config/
- npm CLI `npm install`, `npm ci`, `npm pack`, and `npx` local help from npm 10.9.4
- GitHub Actions setup-node documentation: https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md
- GitHub Actions Node.js workflow documentation: https://docs.github.com/actions/guides/building-and-testing-nodejs
- Docker Build cache documentation: https://docs.docker.com/build/cache/optimize/
- Node.js End-of-Life documentation: https://nodejs.org/en/about/eol
- Node.js 18 EOL announcement: https://nodejs.org/en/blog/announcements/node-18-eol-support

## Issues Found
- The Windows npm cache path used `%AppData%/npm-cache`; official npm docs list `%LocalAppData%\npm-cache`. Updated the path.
- The post described `npm install --prefer-offline` as forcing offline installation. npm docs state `--prefer-offline` can still request missing data from the server; true offline mode is `--offline`. Updated the command and summary wording.
- The post described `npm install --prefer-online` as forcing fresh downloads. npm docs describe it as forcing staleness checks and looking for updates immediately, not bypassing cache entirely. Updated the wording.
- The GitHub Actions and Docker examples used Node.js 18 and older action versions. Node.js 18 is EOL as of April 30, 2025, so the examples were updated to Node.js 24 and current setup-node/checkout versions.
- The offline preparation example used `npm pack` to download and cache packages. While `npm pack` does fetch to cache, `npm cache add` is the direct command for adding packages to the local cache. Updated the example.
- The comment "npm global cache and packages" implied `~/.npm` contains global packages. npm global packages live under the configured prefix, while `~/.npm` is the cache directory on POSIX systems. Updated the comment.

## Review Notes
- The npm cache is self-healing and clearing it is usually unnecessary except for disk reclamation or installer debugging. The post already mentions verification and cache cleaning, but future revisions could emphasize `npm cache verify` as the first step before destructive cleanup.
- The GitLab CI snippet caches `node_modules/`, which can be valid but is often less portable than caching npm's package cache with lockfile-based keys. This is an optimization concern rather than a correctness issue.
