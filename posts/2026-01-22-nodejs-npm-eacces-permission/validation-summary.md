# Validation Summary: How to Fix npm ERR! Error: EACCES Permission Denied

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Node.js
- npm and npx
- nvm
- Linux and macOS shell commands
- Windows Command Prompt and PowerShell
- Homebrew
- Docker

## Sources Consulted
- npm Docs: Resolving EACCES permissions errors when installing packages globally - https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/
- npm CLI docs: npm config - local `npm help config` for npm 10.9.4
- npm CLI docs: npm cache - local `npm help cache` for npm 10.9.4
- npm CLI docs: npm exec / npx - local `npm help exec` and https://docs.npmjs.com/cli/v8/commands/npx
- npm Docs: .npmrc - https://docs.npmjs.com/cli/v11/configuring-npm/npmrc/
- nvm official README - https://github.com/nvm-sh/nvm
- Node.js Releases - https://nodejs.org/en/about/previous-releases
- Node.js Docker official image README - https://github.com/nodejs/docker-node/blob/master/README.md
- Node.js Docker image best practices - https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md
- Docker Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Homebrew documentation and homepage - https://docs.brew.sh/FAQ and https://brew.sh/
- React documentation: Sunsetting Create React App - https://react.dev/blog/2025/02/14/sunsetting-create-react-app

## Issues Found
- The first solution was labeled "Recommended", but current npm EACCES documentation recommends reinstalling npm with a Node version manager as the preferred approach. Removed the heading's recommendation label while leaving the solution intact.
- The nvm install command used `v0.39.0`, which is outdated. Updated both nvm install snippets to the current documented `v0.40.5` install URL.
- The `npx typescript@4.5 --version` example does not work with current npm because npm cannot infer one executable from the TypeScript package. Replaced it with `npx --package typescript@4.5 tsc --version`, which was verified locally.
- The Create React App example used deprecated tooling. Replaced it with a current Vite initializer example using `npx create-vite@latest my-app`.
- The cache permission fix changed ownership of `~/.npm` even when npm's configured cache could be elsewhere. Updated it to use `$(npm config get cache)` and numeric user/group IDs.
- The Homebrew permission fix hard-coded Intel macOS paths and included broad ownership of `/usr/local/Cellar`. Replaced it with `brew doctor` and a prefix-aware npm global modules path.
- The Windows prefix snippet was labeled as PowerShell but used Command Prompt environment variable syntax. Changed the code fence and surrounding text to Command Prompt.
- The Docker example used `node:18`, which is end-of-life as of the 2026-06-20 review date, and manually created a user even though the official Node image already provides the `node` user. Updated the example to `node:24` and used the built-in non-root `node` user.

## Review Notes
The remaining `chown`-based fixes are technically valid for controlled environments but should be used carefully because changing ownership of shared system prefixes can affect other tools. Prefer nvm or a user npm prefix for developer machines.
