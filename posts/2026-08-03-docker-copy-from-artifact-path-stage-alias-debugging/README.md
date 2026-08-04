# `COPY --from` Artifact Not Found: Path and Stage-Alias Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, Multi-Stage Builds, COPY, BuildKit, Troubleshooting, Build Artifacts

Description: Diagnose missing multi-stage artifacts by checking source-root paths, stage aliases, build outputs, temporary mounts, ignore rules, and target dependencies in a repeatable order.

---

A failing `COPY --from` is usually a namespace problem rather than a Docker cache problem. The source is read from a different filesystem, its path is resolved from that filesystem's root, and the value after `--from=` can refer to a stage, named context, or external image.

Start from the exact failing instruction and prove three things: BuildKit selected the intended source, the artifact exists in that source's committed filesystem, and the source path resolves from `/` and is spelled exactly as produced.

## Use a Minimal Known-Good Shape

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN mkdir -p /out && go build -o /out/service ./cmd/service

FROM debian:bookworm-slim AS runtime
COPY --from=build /out/service /usr/local/bin/service
ENTRYPOINT ["/usr/local/bin/service"]
```

The final `COPY` reads `/out/service` from the root filesystem of the stage named `build`. The runtime stage's `WORKDIR`, if it has one, does not change how that source path is resolved.

## 1. Confirm the Stage Alias

Name stages and copy by name, not by numeric position:

```dockerfile
FROM golang:1.25-bookworm AS build
# ...
FROM debian:bookworm-slim AS runtime
COPY --from=build /out/service /usr/local/bin/service
```

Numeric references such as `--from=0` work, but adding or reordering a `FROM` can silently point them at a different stage. An alias remains attached to the intended stage.

A misspelled alias can produce a confusing registry error. When no stage or named context matches a `--from` value, the builder can treat it as an image reference and try to resolve it externally. A message about pull access for a name that should have been local is a strong signal to compare the `AS build` and `--from=build` spellings.

## 2. Resolve the Source from `/`, Not `WORKDIR`

This common Dockerfile fails:

```dockerfile
FROM node:24-bookworm-slim AS build
WORKDIR /workspace
COPY . .
RUN npm ci && npm run build

FROM nginx:1.29-alpine
COPY --from=build /dist /usr/share/nginx/html
```

If the build tool writes `dist` under its current directory, the actual source is `/workspace/dist`, not `/dist`:

```dockerfile
COPY --from=build /workspace/dist/ /usr/share/nginx/html/
```

Do not infer the output path from the repository layout. Check the compiler or bundler configuration and print the directory after the build.

## 3. Inspect the Source Stage Directly

Build and tag the stage that should contain the artifact:

```bash
docker build --target build --tag service:build-debug --load .
docker run --rm --entrypoint=/bin/sh service:build-debug -c \
  'pwd; find /out /workspace -maxdepth 3 -type f -print 2>/dev/null'
```

This does not alter the Dockerfile's final stage or production tag. It turns the intermediate snapshot into a runnable image for inspection. If the builder image lacks a shell, add a temporary named debug stage based on a compatible image and copy the suspected output into it.

You can also fail at the producer with a precise assertion:

```dockerfile
RUN npm run build \
    && test -d /workspace/dist \
    && find /workspace/dist -maxdepth 2 -type f -print
```

This places the error beside the command that should have created the artifact rather than at a later `COPY`.

## 4. Check Whether the Output Was Written into a Temporary Mount

Files written only inside a build mount do not necessarily enter the stage filesystem. For example, changes made to a bind mount are discarded when the `RUN` finishes:

```dockerfile
RUN --mount=type=bind,source=.,target=/src,rw \
    make -C /src output=/src/dist/service
COPY --from=build /src/dist/service /out/service
```

The compiler wrote into the mounted context at `/src`. Docker's cache optimization documentation states that writes to a `RUN` bind mount are not persisted in the final image or build cache. Write the artifact outside the mount:

```dockerfile
RUN --mount=type=bind,source=.,target=/src \
    mkdir -p /out && make -C /src output=/out/service
```

The same design rule applies to cache and secret mounts: treat mounted locations as temporary inputs or caches, not as the final destination for an artifact you plan to copy.

## 5. Check the Build Context and `.dockerignore`

`.dockerignore` controls which host files enter the build context. It does not directly filter files already produced inside a stage, but it can prevent a source file or configuration file from reaching the producer:

```bash
docker buildx build --progress=plain --no-cache --target build .
```

Inspect the relevant `COPY` from the context and the ignore patterns. A local `dist/` directory being ignored is normally correct if the stage generates it. Ignoring a required compiler configuration or workspace package is not.

Dockerfile-specific ignore files can also take precedence over the root `.dockerignore`. If the build uses `-f docker/build.Dockerfile`, check for `docker/build.Dockerfile.dockerignore`.

## 6. Distinguish Source and Destination Semantics

The source must exist in the selected stage. The destination belongs to the current stage:

```dockerfile
FROM alpine:3.23 AS runtime
WORKDIR /app
COPY --from=build /out/service ./bin/service
```

Here `/out/service` is absolute in `build`; `./bin/service` is relative to `/app` in `runtime`. For clarity in production images, absolute destination paths usually make reviews easier.

Docker disregards a trailing slash on a source path, but a trailing slash on the destination is significant. To copy the contents of a directory into a destination directory, make the destination intent explicit:

```dockerfile
COPY --from=build /workspace/dist/ /usr/share/nginx/html/
```

If multiple sources are used, Docker requires the destination to be a directory ending in `/`.

## 7. Confirm the Selected Target Depends on the Producer

BuildKit executes only stages needed by the selected target. A `COPY --from=build` creates a dependency, so the producer runs. If a stage is skipped, inspect whether the target actually references it or inherits from it. Building some other sibling target will not populate state for the final target as a side effect.

Use plain progress output to see the graph:

```bash
docker buildx build --progress=plain --target runtime .
```

Avoid papering over the issue with `--no-cache`. Cache invalidation can make a producer rerun, but it cannot correct the wrong alias, root-relative path, or temporary mount destination.

## Official Documentation

- [Docker multi-stage builds and named stages](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile COPY reference](https://docs.docker.com/reference/dockerfile/#copy)
- [Docker build context and Dockerfile-specific ignore files](https://docs.docker.com/build/building/context/)
- [Docker cache optimization and temporary bind mounts](https://docs.docker.com/build/cache/optimize/)
