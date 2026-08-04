# Inspect and Run Intermediate Docker Stages Without Changing the Final Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Multi-Stage Builds, Debugging, Build Target, Dockerfile, Build Artifacts

Description: Export, run, or examine a named intermediate target under a separate local tag while leaving the production stage and default build result unchanged.

---

An intermediate Dockerfile stage is a complete filesystem snapshot, even when it is not the image you normally ship. Docker's `--target` flag lets you stop at that named stage and export it under a separate tag. You can then run a shell, copy artifacts out, or inspect metadata without moving or modifying the production stage.

## Give Debuggable Boundaries Names

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm AS dependencies
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM build AS debug
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl procps \
    && rm -rf /var/lib/apt/lists/*
CMD ["bash"]

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /src/dist ./dist
COPY --from=production-dependencies /src/package.json /src/package-lock.json ./
COPY --from=production-dependencies /src/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

`production` remains the last stage and therefore the default result when no target is supplied. `debug` is an opt-in branch that contains source, dependencies, and diagnostic tools.

List the available aliases with current Buildx:

```bash
docker buildx build -q --call=targets .
```

Then build only the debug target into the local image store:

```bash
docker buildx build \
  --target debug \
  --load \
  --tag example-api:build-debug \
  .
```

The local tag does not retag `example-api:production`, and later Dockerfile stages are not incorporated into it. Keep debug tags distinct and do not push them to a production repository because they may contain source code, package caches, symbols, or other material intentionally omitted from the final image.

## Run the Stage Interactively

Because this debug stage has Bash:

```bash
docker run --rm -it \
  --entrypoint /bin/bash \
  example-api:build-debug
```

Inside it, inspect the exact build output:

```bash
pwd
find /src/dist -maxdepth 3 -type f -print
node --version
npm ls --all
stat /src/dist/server.js
```

Pass only the runtime inputs needed to reproduce the issue. A build-stage image does not retain BuildKit secret or SSH mounts; those mounts exist only for the relevant `RUN` instruction.

If the target defines an entrypoint that gets in the way, `--entrypoint` replaces it for this container. Writes to the container's writable layer disappear with `--rm`; they do not alter the tagged image or Dockerfile.

## Inspect a Stage That Has No Shell

You can examine metadata without starting the image:

```bash
docker image inspect example-api:build-debug
docker image history --no-trunc example-api:build-debug
```

To retrieve one file, create a stopped container and copy from it:

```bash
container_id=$(docker create example-api:build-debug)
docker cp "$container_id":/src/dist/server.js ./server.js
docker rm "$container_id"
```

To inspect the merged container filesystem, excluding volume contents:

```bash
container_id=$(docker create example-api:build-debug)
docker export "$container_id" > build-debug-rootfs.tar
docker rm "$container_id"
tar -tf build-debug-rootfs.tar | less
```

`docker image history` shows layer commands and sizes, not a reliable per-file inventory. Container export gives the merged filesystem view and omits image configuration, layer history, and the contents of mounted volumes.

## Export Only Build Artifacts

When the goal is to inspect artifacts rather than run the builder, add a minimal output stage before the final `production` stage:

```dockerfile
FROM scratch AS artifacts
COPY --from=build /src/dist/ /
```

Export its root filesystem directly:

```bash
docker buildx build \
  --target artifacts \
  --output type=local,dest=./build-output \
  .
```

The local exporter writes the selected stage's filesystem to the destination instead of creating a runnable image. Keep the output stage limited to desired artifacts, or the exporter will reproduce the whole stage filesystem.

## Keep Production Unchanged by Construction

Use these guardrails:

- keep `production` as the final stage if a plain `docker build .` must produce it;
- branch debug from the stage that needs inspection, not from production;
- use a clearly local tag such as `:build-debug`;
- never add credentials to make the debug image convenient;
- build production explicitly with `--target production` in release CI;
- compare the production image's content and configured user in a separate test.

The debug target is part of the Dockerfile, but it is not part of the production image graph unless production inherits from it or copies from it. That separation gives developers rich diagnostics without shipping those tools.

## Official Documentation

- [Docker multi-stage builds and target stages](https://docs.docker.com/build/building/multi-stage/)
- [Docker Buildx build target and target listing](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker exporters overview](https://docs.docker.com/build/exporters/)
- [Docker guide to exporting binaries](https://docs.docker.com/build/building/export/)
- [Docker container copy command](https://docs.docker.com/reference/cli/docker/container/cp/)
