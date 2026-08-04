# Fix Vanishing Multi-Stage Docker Caches in CI with BuildKit `mode=max`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Multi-Stage Builds, Build Cache, CI/CD, Buildx, Container Registry

Description: Preserve expensive intermediate-stage cache across ephemeral CI runners by importing and exporting a dedicated BuildKit registry cache in max mode.

---

A multi-stage image can build quickly on a developer laptop and still rebuild every compiler and dependency step in CI. The Dockerfile is often fine. The missing piece is that BuildKit's normal cache belongs to one builder, while many CI jobs start with a fresh machine and a fresh builder.

Pushing the final image is not the same as exporting every cache record. By default, the external cache uses `mode=min`, which keeps only cache needed for layers in the exported result. Build-only stages are exactly the layers most likely to be absent. `mode=max` exports cache for all build steps that BuildKit executes for the selected target, including intermediate stages.

## Recognize the Failure Mode

Suppose an application has a dependency stage, a compiler stage, and a small runtime stage:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /src/dist ./dist
COPY --from=dependencies /src/package.json /src/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
CMD ["node", "dist/server.js"]
```

On a persistent builder, the second build can reuse the `npm ci` and compile results. On an ephemeral runner, there is no local BuildKit state to reuse. Explicitly importing an inline cache embedded in `example.com/team/api:latest` may help with records associated with the final image, but merely pushing or pulling the image does not export or import a complete set of intermediate-stage records.

Confirm this by making build output explicit:

```bash
docker buildx build --progress=plain --target runtime .
```

Look for lines such as `CACHED [dependencies ...]`. If a new job downloads dependencies again even though the lock file is unchanged, inspect the CI builder and its cache import/export flags before rearranging the Dockerfile.

## Export a Dedicated Registry Cache

Use a registry cache reference separate from the application image reference:

```bash
docker buildx build \
  --file Dockerfile \
  --target runtime \
  --tag registry.example.com/acme/api:8f2c1d7 \
  --cache-from type=registry,ref=registry.example.com/acme/api-buildcache:main \
  --cache-to type=registry,ref=registry.example.com/acme/api-buildcache:main,mode=max \
  --push \
  .
```

These commands require a builder that supports the registry cache backend. The default `docker` driver supports it only when the containerd image store is enabled; otherwise, use the `docker-container` driver or another supported driver.

The two cache flags have different jobs:

- `--cache-from` imports cache records available at the start of this build;
- `--cache-to` exports records produced or reused by this build;
- `mode=max` belongs only on the exporter and includes intermediate build steps;
- `--push` publishes the application image, independently of the cache export.

If the cache reference does not exist on the first run, BuildKit reports that the import was unavailable and continues building. A successful build then creates the cache for later jobs.

The `inline` exporter is convenient because cache metadata travels with the output image, but Docker documents that inline cache supports only `min` mode. Use a backend that supports `max`, such as the registry backend, when build-only stages matter.

## Prevent Branches from Overwriting One Cache

Docker warns that a cache location should not be written twice because a later export overwrites the location. Concurrent branches should therefore export to distinct references while importing both their own cache and a stable default-branch cache:

```bash
docker buildx build \
  --tag registry.example.com/acme/api:feature-142 \
  --cache-from type=registry,ref=registry.example.com/acme/api-buildcache:feature-142 \
  --cache-from type=registry,ref=registry.example.com/acme/api-buildcache:main \
  --cache-to type=registry,ref=registry.example.com/acme/api-buildcache:feature-142,mode=max \
  --push \
  .
```

Sanitize a branch name before using it as an image tag. Do not let two parallel jobs export different cache graphs to the same reference. A typical policy is:

1. every branch imports its branch cache if present;
2. every branch also imports `main` as a fallback;
3. every branch exports only to its own cache reference;
4. retention rules remove old branch cache references.

`mode=max` trades registry storage and transfer time for more cache hits. Measure both. A large monorepo with many large stages in a target's dependency graph may need per-service cache scopes rather than one enormous cache.

## Keep the Dockerfile Cache-Friendly

An external cache cannot rescue a step whose inputs change every run. Preserve stable dependency layers by copying lock files before source code. Avoid dynamic timestamps in build arguments. BuildKit's cache key for a `RUN` instruction also does not automatically refresh merely because a remote package repository changed.

Cache mounts and exported layer cache solve different problems. A cache mount such as `/root/.npm` gives the package manager a cumulative download cache within the builder that owns it. The registry layer cache can let a fresh builder skip the entire `npm ci` instruction, but it does not transfer the cache mount's contents if that instruction must run again. Both can be useful, but a cache mount's contents are not copied into the image.

Never put credentials in `ARG`, `ENV`, or copied files to make cache access work. Docker notes that build arguments can appear in image history or provenance. Use BuildKit secret or SSH mounts for credentials, and authenticate the CI job to the registry before importing or exporting cache.

## Verify the Fix

Run the same build twice with the same inputs and a fresh builder on the second run. The test matters because reusing the same local builder can hide a broken remote-cache configuration.

```bash
docker buildx create --name cache-test-a --driver docker-container --use
docker buildx build \
  --cache-to type=registry,ref=registry.example.com/acme/api-buildcache:test,mode=max \
  --push --tag registry.example.com/acme/api:cache-test .

docker buildx create --name cache-test-b --driver docker-container --use
docker buildx build \
  --progress=plain \
  --cache-from type=registry,ref=registry.example.com/acme/api-buildcache:test \
  --load --tag api:cache-test .
```

The second log should show cache hits in dependency and compiler stages, not only in the final runtime stage. When it does, CI is reusing a remote BuildKit cache rather than accidentally relying on a runner's local disk.

## Official Documentation

- [Docker cache storage backends and cache modes](https://docs.docker.com/build/cache/backends/)
- [Docker registry cache backend](https://docs.docker.com/build/cache/backends/registry/)
- [Docker guide to optimizing build cache](https://docs.docker.com/build/cache/optimize/)
- [Docker BuildKit overview](https://docs.docker.com/build/buildkit/)
