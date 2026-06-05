# Validation Summary: How to Containerize an AdonisJS Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AdonisJS v6
- Docker
- Docker Compose
- Node.js
- npm
- PostgreSQL
- TypeScript

## Sources Consulted
- AdonisJS v6 Installation: https://v6-docs.adonisjs.com/guides/getting-started/installation
- AdonisJS v6 TypeScript build process: https://v6-docs.adonisjs.com/guides/concepts/typescript-build-process
- AdonisJS v6 Deployment: https://v6-docs.adonisjs.com/guides/getting-started/deployment
- AdonisJS v6 Command reference: https://v6-docs.adonisjs.com/guides/references/commands
- AdonisJS v6 Encryption: https://v6-docs.adonisjs.com/guides/security/encryption
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- npm config documentation for production/omit: https://docs.npmjs.com/using-npm/config/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Node.js release schedule: https://github.com/nodejs/release

## Issues Found
- The post used Node.js 20 and `node:20-alpine` in the prerequisites and Dockerfiles. Node.js 20 reached end-of-life on April 30, 2026, so the examples now use Node.js 22 and `node:22-alpine`.
- The post described the AdonisJS production entry point as `server.js` and used `node server.js`. The current AdonisJS v6 build documentation runs the compiled HTTP server from `bin/server.js`, so the explanation, Docker `CMD`, and entrypoint script now use `node bin/server.js`.
- The post stated that the build `package.json` lists only production dependencies. AdonisJS copies `package.json` and the package manager lock file to `build`; production-only installation is done with npm after the build. The wording now reflects that.
- The production Dockerfile used `npm ci --production`. npm documents `production` as an alias for omitting dev dependencies and recommends `--omit=dev`, so the Dockerfile and optimization tips now use `npm ci --omit=dev`.
- The Compose snippets included the top-level `version: "3.8"` field. Docker Compose now treats `version` as obsolete and only informative, so the snippets now omit it.
- The prerequisite listed Docker Engine 20.10+ but the Compose example uses `depends_on.condition: service_healthy`, which is documented for Docker Compose v2.17+. The prerequisite now calls out Docker Compose v2.17+.
- The entrypoint insertion instructions did not say where to place the `COPY` and `chmod` lines. Because the Dockerfile later switches to `USER appuser`, the post now tells readers to add the script before the `USER appuser` instruction.

## Review Notes
The migration and seeding commands, APP_KEY generation command, AdonisJS route snippet, PostgreSQL Compose health check, and production `--force` migration guidance are consistent with official documentation. For production uploads, the post's local volume approach is technically valid for a single-host Compose deployment, but cloud object storage is usually preferred for multi-instance or ephemeral-platform deployments.
