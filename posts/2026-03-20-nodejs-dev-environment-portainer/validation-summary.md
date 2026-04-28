# Validation Summary: How to Set Up a Node.js Development Environment with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (stack management)
- Docker / Docker Compose
- Node.js (v18, v20, current)
- Express.js (v4.18.x)
- Nodemon (v3.x)
- Jest (v29.x)
- Node.js Inspector Protocol (port 9229)
- VS Code Node debug adapter

## Sources Consulted
- Node.js debugging docs — https://nodejs.org/en/docs/guides/debugging-getting-started/ (confirms `--inspect=[host:]port` syntax and default port 9229)
- Docker Compose file reference — https://docs.docker.com/compose/compose-file/
- Docker Hub `node` image tags — https://hub.docker.com/_/node (confirms `20-alpine`, `18-alpine`, `current-alpine`)
- Nodemon docs — https://github.com/remy/nodemon (confirms passing node flags such as `--inspect` before the script)
- Express 4.x API — https://expressjs.com/en/4x/api.html (confirms `app.listen(port, host, callback)` signature, `express.json()` middleware)
- VS Code Node.js debugging — https://code.visualstudio.com/docs/nodejs/nodejs-debugging (confirms `attach` request, `localRoot`/`remoteRoot`, `restart`)
- npm package registry entries for `express`, `nodemon`, `jest` (versions referenced are real, released versions)

## Issues Found
No technical issues found.

## Review Notes
- The Compose `version: "3.8"` field is accepted but is now considered obsolete by Docker Compose v2; modern examples typically omit the top-level version key. Leaving it in is not incorrect.
- The bind mount `./src:/app` implies the host's `./src` directory contains everything (including `package.json`), since `npm install` runs inside `/app`. The `// src/server.js` comment in the example is consistent with this layout, but readers expecting `package.json` at the project root may find the structure unconventional.
- For Docker Desktop on macOS/Windows, nodemon file watching across bind mounts sometimes requires the `-L` / `--legacy-watch` flag because of inotify event propagation. Not strictly an error — the example works on Linux hosts and modern Docker Desktop with virtiofs/gRPC-FUSE — but worth keeping in mind.
- Express 5.0 became stable in late 2024; the post sticks with Express 4.x, which remains widely used and supported. The pinned `^4.18.0` is fine but readers starting fresh projects may want to consider Express 5.
- Jest 30 is the latest major as of 2026; pinning `^29.0.0` is still valid and supported, just not the newest.
