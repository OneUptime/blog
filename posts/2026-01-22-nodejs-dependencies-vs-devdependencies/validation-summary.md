# Validation Summary: How to Understand dependencies vs devDependencies in package.json

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- npm
- package.json
- dependencies
- devDependencies
- peerDependencies
- optionalDependencies
- TypeScript
- Babel
- PostCSS and Sass
- React and Vite
- Prisma

## Sources Consulted
- npm Docs: package.json, dependencies, devDependencies, peerDependencies, optionalDependencies - https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- npm Docs: npm install command and save flags - https://docs.npmjs.com/cli/v11/commands/npm-install/
- npm Docs: npm ci command and omit behavior - https://docs.npmjs.com/cli/v9/commands/npm-ci/
- npm Docs: npm ls/list command and depth behavior - https://docs.npmjs.com/cli/v11/commands/npm-ls/
- npm Docs: specifying dependencies and devDependencies - https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/
- Babel Docs: @babel/plugin-transform-runtime and @babel/runtime dependency guidance - https://babeljs.io/docs/babel-plugin-transform-runtime/
- NestJS Docs: Prisma setup showing prisma CLI as a development dependency and @prisma/client as a dependency - https://docs.nestjs.com/recipes/prisma
- Vite Docs: Getting started and React templates - https://vite.dev/guide/

## Issues Found
- The post listed `prisma` as an "Always dependencies" runtime database package. This is inaccurate for common Prisma usage: the `prisma` package is the CLI and is typically a development dependency, while runtime application code imports `@prisma/client`. Changed the runtime example to `@prisma/client`, added `prisma` to the devDependencies example, and updated the summary table.
- The frontend section said most packages are devDependencies because frontend apps are bundled. This was too broad and could lead readers to put imported application packages in devDependencies even when the build environment installs production dependencies only. Reworded it to say build tools are devDependencies, while imported app packages usually stay in dependencies, with a caveat for static builds.
- The package publishing section said consumers must install peer dependencies themselves. That is outdated for npm v7 and later, which installs peer dependencies by default. Updated the wording to distinguish modern npm behavior from npm v3 through v6 warnings.

## Review Notes
- `npm install --production` and `npm ci --production` remain accepted, but npm's current docs describe the underlying behavior in terms of `--omit=dev`. A future refresh could prefer `--omit=dev` in examples for clarity.
- All JSON snippets in the post were parsed successfully after the edits.
