# Validation Summary: How to Containerize a NestJS Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Docker Scout
- NestJS
- Node.js
- npm
- TypeScript
- PostgreSQL
- @nestjs/terminus

## Sources Consulted
- NestJS First Steps documentation: https://docs.nestjs.com/first-steps
- NestJS Terminus health checks documentation: https://docs.nestjs.com/recipes/terminus
- NestJS keep-alive connections FAQ: https://docs.nestjs.com/faq/keep-alive-connections
- NestJS configuration documentation: https://docs.nestjs.com/techniques/configuration
- npm prune documentation: https://docs.npmjs.com/cli/v11/commands/npm-prune/
- npm package metadata for @nestjs/core, @nestjs/cli, and @nestjs/terminus via the official npm registry
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose history and CLI versioning documentation: https://docs.docker.com/compose/intro/history/
- Docker build/tag documentation: https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Docker container run documentation: https://docs.docker.com/engine/containers/run/
- Docker Scout CVEs command documentation: https://docs.docker.com/reference/cli/docker/scout/cves/
- Node Docker Official Image documentation: https://hub.docker.com/_/node

## Issues Found
- The prerequisites listed Node.js 18+, but current NestJS documentation requires Node.js 20+ and current @nestjs/cli package metadata requires Node 20.11+. Updated the prerequisite to Node.js 20.11+.
- The prerequisites listed Docker Engine 20.10+ only, but the examples use modern Docker Compose syntax and behavior. Updated the prerequisite to Docker Engine with Docker Compose v2+.
- The Dockerfile used `npm prune --production`. Current npm documentation documents `--omit=dev` as the explicit flag for pruning dev dependencies. Updated the Dockerfile and optimization note to use `npm prune --omit=dev`.
- The Compose examples used the top-level `version: "3.8"` field. Docker's current Compose Specification treats `version` as obsolete and informative only. Removed the obsolete field from both Compose snippets.
- The development Dockerfile exposed port 9229 but ran `npm run start:dev`, which does not start the Node inspector in the default NestJS scripts. Updated the command to `npm run start:debug` so the debug port is actually used.
- The health controller injected `HttpHealthIndicator` without installing `@nestjs/axios`, importing `HttpModule`, or using the indicator. Removed the unused HTTP indicator injection and added the required `HealthModule` registration with `TerminusModule`.
- The graceful shutdown explanation overstated what NestJS does automatically. Updated it to explain Docker's SIGTERM/SIGKILL behavior and that NestJS invokes lifecycle hooks so providers can close resources.
- The security snippet claimed to drop capabilities and run read-only via Dockerfile comments, but those are runtime/container options, not effects of `USER` or `ENV`. Updated the comments to accurately describe the Dockerfile instructions shown.

## Review Notes
The tutorial is technically relevant and salvageable. The Dockerfile is still a general template; production apps that require static assets, generated ORM clients, native build dependencies, or writable runtime paths may need additional COPY steps, package installs, or volume/tmpfs configuration.
