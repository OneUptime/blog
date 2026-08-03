# Validation Summary: Node.js Multi-Stage Builds: Prune Dev Dependencies Without Script Reruns

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Node.js 24
- npm 11 (`npm ci`, `npm prune`, `npm ls`, lifecycle scripts, and script approvals)
- Docker multi-stage builds
- Docker BuildKit cache mounts
- Native Node.js addons
- npm workspaces

## Sources Consulted

- npm `ci` documentation — https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm `prune` documentation — https://docs.npmjs.com/cli/v11/commands/npm-prune/
- npm scripts and lifecycle-order documentation — https://docs.npmjs.com/cli/v11/using-npm/scripts/
- npm install-script approval documentation — https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/
- npm workspace documentation — https://docs.npmjs.com/cli/v11/using-npm/workspaces/
- Docker multi-stage build documentation — https://docs.docker.com/build/building/multi-stage/
- Docker cache optimization and cache-mount documentation — https://docs.docker.com/build/cache/optimize/
- Dockerfile reference for `COPY --from` and `COPY --chown` — https://docs.docker.com/reference/dockerfile/
- Official Node.js Docker image documentation — https://github.com/nodejs/docker-node
- Node.js release status and schedule — https://nodejs.org/en/about/previous-releases

## Issues Found

1. The fresh-install alternative described a second `npm ci` as a general security boundary and broadly said that it does not preserve install artifacts. `npm ci` automatically removes and reconstructs `node_modules`, but it does not remove artifacts that lifecycle scripts wrote elsewhere in the build stage. The wording now scopes the boundary and discarded artifacts specifically to `node_modules`.
2. The workspace guidance did not state that npm installs workspaces as links in `node_modules`. Copying only `node_modules` into the runtime stage can therefore retain links whose workspace targets were not copied. The guidance now requires the final stage to include the targets of retained workspace links.

## Review Notes

- `node:24-bookworm-slim` is a valid official image tag and Node.js 24 is an LTS release as of the validation date. The tag is floating; pinning an image digest is appropriate when byte-for-byte reproducibility is required.
- `npm prune --omit=dev --ignore-scripts` is valid in npm 11. `--omit=dev` removes dev dependencies from disk while retaining their lockfile resolution, and `--ignore-scripts` suppresses lifecycle execution for the prune operation.
- The `require("./dist/server.js")` smoke test is intentionally conditional. Projects whose entry point starts a server, needs runtime configuration, or cannot be synchronously loaded should use a dedicated self-test, as the post recommends.
- No deprecated Dockerfile syntax or npm flags were found.
