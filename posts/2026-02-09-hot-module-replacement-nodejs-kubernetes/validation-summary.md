# Validation Summary: How to Use Hot Module Replacement for Node.js Applications Running in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Kubernetes Deployments, Services, and volumes
- Syncthing
- Telepresence
- DevSpace
- nodemon
- chokidar
- Express
- WebSocket file synchronization

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Telepresence CLI reference: https://telepresence.io/docs/reference/cli/telepresence
- Telepresence volume mount reference: https://telepresence.io/docs/2.19/reference/volume
- Telepresence client installation documentation: https://telepresence.io/docs/install/client/
- DevSpace installation documentation: https://www.devspace.sh/docs/getting-started/installation
- DevSpace configuration reference: https://www.devspace.sh/docs/configuration/reference
- nodemon README: https://github.com/remy/nodemon/blob/main/README.md
- Express Router documentation: https://expressjs.com/en/guide/routing/
- Express 5 Router API: https://expressjs.com/en/5x/api/router/
- Syncthing Docker README: https://github.com/syncthing/syncthing/blob/main/README-Docker.md
- Syncthing configuration documentation: https://docs.syncthing.net/users/config
- Node.js release schedule: https://github.com/nodejs/release
- Node.js EOL information: https://nodejs.org/en/about/eol

## Issues Found
- Updated the Kubernetes app image from `node:18-alpine` to `node:22-alpine` because Node.js 18 is end-of-life as of 2026, while Node.js 22 remains an LTS release.
- Added the missing `spec.selector` and matching pod template labels to the Telepresence Deployment example because `apps/v1` Deployments require an explicit selector that matches the pod template labels.
- Corrected the Telepresence install commands to use the current Telepresence OSS Homebrew formula and GitHub release binary URL.
- Corrected the Telepresence explanation: `--mount` mounts pod volumes on the workstation and intercepts service traffic to a local process; it does not sync local source code into the running container.
- Replaced the brittle DevSpace install command with the official direct latest-release download command.
- Removed the invalid `autoReload` block from the DevSpace v2beta1 example and clarified that file sync plus `npm run dev`/nodemon handles process reload.
- Removed a JavaScript-style comment from the `nodemon.json` block so the fenced JSON example is valid JSON.
- Corrected the custom sync deployment instructions because `kubectl port-forward` forwards local traffic to a pod, not pod traffic back to the workstation. The post now requires a reachable workstation endpoint via Telepresence or a secure tunnel.
- Reworked the Express module-reload example to avoid editing `app._router.stack`; the original filter would not remove routers mounted with `app.use('/api', routes)` and depended on private Express internals.
- Added Syncthing setup and exposure notes, including pairing the sidecar with the local instance, configuring `/app`, exposing UDP sync traffic, and securing the UI.

## Review Notes
- The examples are development-only patterns and should not be used as production deployment patterns.
- The custom WebSocket sync example is intentionally minimal and still lacks production-grade concerns such as authentication, deletion race handling, binary file support, conflict resolution, and path traversal hardening.
- Verified edited JSON and JavaScript snippets with local parsing checks, YAML snippets with PyYAML, and whitespace with `git diff --check`.
