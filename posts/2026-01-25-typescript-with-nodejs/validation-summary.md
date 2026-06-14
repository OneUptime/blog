# Validation Summary: How to Use TypeScript with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Node.js
- npm
- Express
- Docker
- JavaScript

## Sources Consulted
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/
- TypeScript module reference for Node.js module modes: https://www.typescriptlang.org/docs/handbook/modules/reference.html
- Node.js TypeScript documentation: https://nodejs.org/api/typescript.html
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Express 5.x API reference: https://expressjs.com/en/api/
- Express error handling guide: https://expressjs.com/en/guide/error-handling/
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Docker Node official image page: https://hub.docker.com/_/node

## Issues Found
- The Dockerfile used `node:18-alpine`. Node.js 18 is end-of-life as of the current review date, and the official Node.js release schedule lists supported production lines as Active LTS or Maintenance LTS. Changed both Docker stages to `node:lts-alpine`.
- The Dockerfile used `npm ci --only=production`. Current npm documentation uses the `omit` configuration for skipping dependency types on disk. Changed it to `npm ci --omit=dev`.
- The Express request augmentation example said TypeScript knows `req.user` exists after the auth middleware. The declaration only adds an optional `user?: User` property to `Request`; it does not prove that middleware populated it. Updated the comment to say TypeScript knows `req.user` is a valid Request property.

## Review Notes
- The CommonJS-oriented `tsconfig.json` is workable for a CommonJS Node.js project. For new projects that need native Node.js ES module behavior, TypeScript's `node18`, `node20`, or `nodenext` module modes are more accurate because they model Node.js's dual CommonJS/ESM behavior.
- Express 5 automatically forwards rejected promises from route handlers to `next()`. The `asyncHandler` wrapper remains valid, especially for Express 4-style code, but may be unnecessary in Express 5-only projects.
