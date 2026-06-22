# Validation Summary: How to Understand Global vs Local npm Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- npm CLI
- npm packages and package.json
- npx / npm exec
- Local and global package installation

## Sources Consulted
- npm install documentation: https://docs.npmjs.com/cli/v11/commands/npm-install/
- npm folders documentation: https://docs.npmjs.com/cli/v8/configuring-npm/folders/
- npm exec / npx documentation: https://docs.npmjs.com/cli/v11/commands/npm-exec/
- npm run documentation: https://docs.npmjs.com/cli/v11/commands/npm-run/
- npm link documentation for global prefix behavior: https://docs.npmjs.com/cli/v11/commands/npm-link/
- npm update documentation: https://docs.npmjs.com/cli/v11/commands/npm-update/
- Create React App documentation and deprecation notice: https://create-react-app.dev/docs/getting-started/
- Vite guide for create-vite: https://vite.dev/guide/
- ESLint version support: https://eslint.org/version-support/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- Local npm 10.9.4 command help/output for install, root, prefix, exec, list, outdated, and update behavior.

## Issues Found
- The post used `npm bin -g`, but modern npm does not include the `npm bin` command. Replaced it with `npm prefix -g` and clarified that global executables are in `<prefix>/bin` on macOS/Linux and `<prefix>` on Windows.
- The PATH example used `$(npm bin -g)`, which fails on current npm. Replaced it with `$(npm prefix -g)/bin` for macOS/Linux.
- The post recommended or demonstrated `create-react-app`, which is deprecated. Replaced those examples with `create-vite` / `npx create-vite@latest my-app --template react`.
- Version examples used outdated package lines for ESLint, Jest, TypeScript, and Express. Updated examples to current major versions where the post explicitly listed version ranges.

## Review Notes
The core explanation is technically correct: local installs go into project `node_modules`, local binaries are available through npm scripts and npx/npm exec, global executables depend on the global prefix being on PATH, and local dev tools are usually preferable for reproducible team and CI behavior.
