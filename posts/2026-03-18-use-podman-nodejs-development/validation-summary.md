# Validation Summary: How to Use Podman for Node.js Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Node.js
- npm
- Express
- Next.js
- Docker/Containerfile syntax
- Compose
- MongoDB
- Jest
- Node.js inspector

## Sources Consulted
- Podman volume mounts: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman Compose wrapper behavior: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman build behavior and `Containerfile` support: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Node.js official Docker image variants: https://github.com/nodejs/docker-node
- Node.js release status and EOL schedule: https://nodejs.org/en/about/previous-releases
- npm `install`: https://docs.npmjs.com/cli/v11/commands/npm-install/
- npm `ci`: https://docs.npmjs.com/cli/v8/commands/npm-ci/
- npm lockfile behavior: https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json
- Next.js CLI (`next dev`, `--webpack`): https://nextjs.org/docs/app/api-reference/cli/next
- Next.js Turbopack defaults: https://nextjs.org/docs/pages/api-reference/turbopack
- Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Express 4 API: https://expressjs.com/en/4x/api.html
- Node.js inspector security guidance: https://nodejs.org/en/docs/inspector/
- VS Code Node.js remote attach path mapping: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
- Watchpack polling environment variable: https://www.npmjs.com/package/watchpack

## Issues Found
- The post recommended `node:20` as the primary base image and labeled Node 18 and Node 20 as current LTS test targets. As of 2026-05-07, Node 20 and Node 18 are EOL in the official Node.js release schedule. I updated the main examples to `node:24` and changed the version-matrix examples to Node 22 LTS, Node 24 LTS, and Node 25 Current.
- The development and test examples used `npm ci` even though the post never created a `package-lock.json`. Per npm docs, `npm ci` requires an existing lockfile. I changed the affected examples to `npm install` so the workflows work as written.
- The Next.js section paired `WATCHPACK_POLLING=true` with plain `next dev`. Current Next.js uses Turbopack by default, while `WATCHPACK_POLLING` is part of a webpack/watchpack polling workflow. I updated the container command to `next dev --webpack` and clarified why.
- The Compose section used `podman-compose` directly and included the obsolete top-level `version: "3.8"` field. Current Podman documents `podman compose` as the supported entrypoint, and current Compose docs mark the top-level `version` element obsolete. I updated the commands to `podman compose`, renamed the example file to `compose.yaml`, removed the obsolete `version` field, and noted that `podman compose` requires an installed Compose provider.
- The production image example did not match the earlier Express sample application. The sample app has no `build` script and no `dist/server.js`, so the published production `Containerfile` would fail. I replaced it with a working multi-stage image for the demonstrated `server.js` app.
- The debugging section exposed `--inspect=0.0.0.0:9229` without the security caveat documented by Node.js. I added a brief warning that this should only be exposed on a trusted local machine.
- The introduction and base-image guidance made a few absolute claims that were stronger than the official docs support. I softened those claims to keep the tone intact while making them technically accurate.

## Review Notes
- The post is Linux-oriented because it uses `:Z` SELinux relabeling on bind mounts. Podman documents different volume behavior for remote clients on macOS and Windows.
- Next.js documentation now recommends local development over Docker on macOS and Windows when performance matters. The article's Docker workflow is still technically valid, but it is not always the fastest option on those platforms.
