# Validation Summary: How to Use dotenv for Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- dotenv
- Environment variables
- Joi
- Zod
- TypeScript
- Docker and Docker Compose
- npm

## Sources Consulted
- dotenv README / official package documentation: https://github.com/motdotla/dotenv
- Node.js environment variables documentation: https://nodejs.org/api/environment_variables.html
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Joi API documentation: https://joi.dev/api/
- Zod API documentation: https://zod.dev/api
- Zod 4 migration guide: https://zod.dev/v4/changelog
- Docker CLI run documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose environment variable documentation: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/

## Issues Found
- The Dockerfile used `node:18-alpine`. Node.js 18 is End-of-Life as of the Node.js release schedule, so the example was updated to `node:24-alpine`, an active LTS line as of the validation date.
- The Dockerfile used `npm ci --only=production`. npm documents `--omit=dev` for omitting development dependencies, so the command was updated to `npm ci --omit=dev`.
- The Zod example used `z.string().transform(Number).default('3000')`. In Zod 4, defaults after transforms must match the output type, and coercion is the clearer current API for environment variables. This was changed to `z.coerce.number().int().default(3000)`.
- The Zod example used `z.string().url()`, which still works but is deprecated in Zod 4 in favor of top-level string format validators. This was changed to `z.url()`.
- The Zod boolean example used a string transform with a string default. This was updated to `z.stringbool().default(false)`, which is the current Zod API for parsing boolean-like environment variable strings.

## Review Notes
The remaining dotenv loading patterns, Joi validation example, TypeScript declaration example, Docker Compose `env_file` usage, and `docker run --env-file` command are technically valid. The production guidance to use platform secret management instead of committed `.env` files is sound, though some teams may still use runtime env files with appropriate operational controls.
