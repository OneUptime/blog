# Validation Summary: How to Set Environment Variables in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Environment variables
- dotenv
- dotenv-expand
- cross-env
- envalid
- Zod
- TypeScript
- GitHub Actions
- Docker and Docker Compose
- Kubernetes Secrets
- Windows Command Prompt and PowerShell

## Sources Consulted
- Node.js process documentation: https://nodejs.org/api/process.html
- Node.js release schedule and supported versions: https://nodejs.org/en/about/previous-releases
- dotenv README: https://github.com/motdotla/dotenv
- dotenv-expand README: https://github.com/motdotla/dotenv-expand
- cross-env README: https://github.com/kentcdodds/cross-env
- envalid README: https://github.com/af/envalid
- Zod API documentation: https://zod.dev/api
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- GitHub Actions checkout README: https://github.com/actions/checkout
- Docker Compose environment variable documentation: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- PowerShell environment variable documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_environment_variables

## Issues Found
- The Windows Command Prompt "single command" example used `set PORT=3000 && node server.js`, which leaves the variable in the current Command Prompt session. Changed it to run through `cmd /C` for a command-scoped example and used quoted `set "NAME=value"` syntax for session variables.
- The PowerShell "single command" example set `$env:PORT` but did not remove it afterward, so the variable remained in the current session. Changed the example to set the variable, run Node, and remove it with `Remove-Item Env:PORT`.
- The envalid example referenced `env.isDevelopment`, but envalid's built-in development helper is `env.isDev`. Updated the exported property to use `env.isDev`.
- The Zod examples applied `.default()` after `.transform()`, which is incorrect for current Zod semantics because defaults short-circuit and must match the output type. Moved the defaults before the transforms so `PORT` and `DEBUG` parse to the intended number and boolean values.
- The GitHub Actions example used `actions/checkout@v3`, which is stale. Updated it to `actions/checkout@v7`, matching the current official README usage.
- The Dockerfile used `node:18-alpine`, but Node.js 18 is end-of-life as of April 30, 2025. Updated the base image to `node:24-alpine`, which is the current Active LTS line on June 20, 2026.
- The Dockerfile used `npm ci --production`. Updated it to `npm ci --omit=dev`, the current npm configuration form for omitting development dependencies.
- The Dockerfile comment said `ENV NODE_ENV=production` sets the value at runtime, not build time. Clarified that it provides a default runtime value that can be overridden by `docker run -e` or platform configuration.

## Review Notes
The rest of the examples are technically sound for a general Node.js configuration tutorial. Future improvements could mention Node.js built-in `.env` file support in newer releases, but adding that would be new content rather than a correction to the existing article.
