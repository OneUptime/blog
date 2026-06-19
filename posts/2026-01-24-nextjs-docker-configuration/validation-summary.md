# Validation Summary: How to Configure Next.js with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js
- Docker
- Docker Compose
- Docker BuildKit
- Node.js
- npm, Yarn, and pnpm
- Kubernetes
- TypeScript

## Sources Consulted
- Next.js Deploying documentation: https://nextjs.org/docs/app/getting-started/deploying
- Next.js `output: 'standalone'` documentation: https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
- Next.js instrumentation documentation: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
- Next.js Route Handlers documentation: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js environment variables documentation: https://nextjs.org/docs/pages/guides/environment-variables
- Official Next.js with-docker example: https://github.com/vercel/next.js/tree/canary/examples/with-docker
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Node.js Docker Official Image: https://hub.docker.com/_/node
- Docker Compose version and name top-level elements documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services and healthcheck documentation: https://docs.docker.com/reference/compose-file/services/
- Docker Build cache optimization documentation: https://docs.docker.com/build/cache/optimize/
- npm `ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- npm config documentation for deprecated `--only=production`: https://docs.npmjs.com/cli/v7/using-npm/config/
- Kubernetes probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The production multi-stage Dockerfile installed only production dependencies in the dependency stage, then reused those dependencies for `npm run build`. This can break standard Next.js builds because build tooling is commonly in `devDependencies`. Changed the dependency stage to install full dependencies.
- The multi-stage Dockerfile checked for `yarn.lock` and `pnpm-lock.yaml` but only copied npm package files before the install step. Updated the `COPY` instruction to include Yarn and pnpm lockfiles.
- The multi-stage Dockerfile used Yarn without enabling Corepack. Updated the Yarn branch to enable Corepack before running Yarn.
- The multi-stage Dockerfile installed with npm, Yarn, or pnpm but always built with `npm run build`. Updated the build step to use the package manager indicated by the lockfile.
- The runner image's Docker Compose healthcheck used `curl`, but the Alpine-based Node runtime image does not include `curl` by default. Added `apk add --no-cache curl` to the runner stage.
- The `next.config.js` example included `experimental.instrumentationHook`, which is no longer needed for current stable Next.js instrumentation. Removed the experimental option and kept a comment pointing to `instrumentation.js` or `instrumentation.ts`.
- The Docker Compose example used the obsolete top-level `version` property. Removed it so the example follows the current Compose Specification.
- The build process diagram showed `npm ci --production`, matching the same build-stage dependency problem. Updated it to `npm ci`.
- The caching example used deprecated `npm ci --only=production` and would omit build dependencies before running `npm run build`. Updated it to `npm ci`.
- The Dockerfile examples used `node:20-alpine`, but Node.js 20 is EOL as of the review date. Updated the examples to `node:24-alpine`, an active LTS line.

## Review Notes
- The Kubernetes manifest is structurally valid for a basic Deployment and Service, but production deployments should avoid mutable `latest` image tags and tune probe delays/resource limits to the specific application.
- The Docker examples assume a conventional Next.js app with `build`, `start`, and `dev` package scripts.
