# Validation Summary: Inspect and Run Intermediate Docker Stages Without Changing the Final Image

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Docker Engine and Docker CLI
- Docker Buildx and BuildKit
- Multi-stage Dockerfiles and named build targets
- Docker image and container inspection
- Docker local filesystem exporter
- Node.js 24 and npm

## Sources Consulted

- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker exporters overview](https://docs.docker.com/build/exporters/)
- [Docker local and tar exporters](https://docs.docker.com/build/exporters/local-tar/)
- [Docker guide to exporting binaries](https://docs.docker.com/build/building/export/)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker container run reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker container create reference](https://docs.docker.com/reference/cli/docker/container/create/)
- [Docker container copy reference](https://docs.docker.com/reference/cli/docker/container/cp/)
- [Docker container export reference](https://docs.docker.com/reference/cli/docker/container/export/)
- [Docker storage and writable container layers](https://docs.docker.com/engine/storage/)
- [Docker image inspect reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker image history reference](https://docs.docker.com/reference/cli/docker/image/history/)
- [Official Node image tags](https://hub.docker.com/_/node/tags)
- [npm ci documentation for npm 11](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm ls documentation for npm 11](https://docs.npmjs.com/cli/v11/commands/npm-ls/)
- [npm prune documentation for npm 11](https://docs.npmjs.com/cli/v11/commands/npm-prune/)

## Issues Found

- The post said all container writes go into a disposable container layer. Writes to bind mounts or volumes do not, so the text now specifically says that writes to the container's writable layer disappear with `--rm`.
- The post described `docker export` as inspecting the complete root filesystem without noting its volume behavior. The text now calls this the merged container filesystem and states that mounted volume contents are omitted, matching the Docker CLI reference.

## Review Notes

- The `--call=targets`, `--target`, `--load`, `--tag`, and `--output type=local` forms are current and were confirmed against Docker Buildx documentation and locally installed Docker 29.4.3 / Buildx 0.33.0 CLI help.
- Registry manifest inspection confirmed that both `node:24-bookworm` and `node:24-bookworm-slim` are current multi-platform official-image tags. The npm 11 documentation confirms `npm prune --omit=dev --ignore-scripts` is valid.
- The complete example build depends on application-specific files and behavior not included in the post: a compatible `package-lock.json`, an `npm run build` script, and `/src/dist/server.js` output.
