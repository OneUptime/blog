# Why Does Docker Ignore the Layer Cache in CI? A Cache-Invalidation Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, CI/CD, Build Cache, GitHub Action

Description: Diagnose Docker CI cache misses by checking cache persistence, import/export scope, build context, instruction order, platform, and BuildKit invalidation inputs.

---

Docker is usually not "ignoring" the cache. Either the ephemeral runner cannot see a previous builder's cache, the workflow did not import it, or an earlier instruction changed and invalidated every following layer.

Start by separating cache availability from cache-key changes.

## 1. Confirm a Cache Exists Outside the Runner

BuildKit maintains an internal cache in the builder. On a disposable CI runner, that cache disappears with the machine. Docker's documentation says an external cache is almost essential in CI/CD environments with little or no persistence.

Configure both directions:

- `cache-from` imports candidates;
- `cache-to` exports results for future builds.

For GitHub Actions, after checking out the repository and logging in to the target registry:

```yaml
- uses: docker/setup-buildx-action@v4

- uses: docker/build-push-action@v7
  with:
    context: .
    push: true
    tags: ghcr.io/acme/app:${{ github.sha }}
    cache-from: type=gha,scope=app
    cache-to: type=gha,scope=app,mode=max
```

Or use a registry cache:

```yaml
cache-from: type=registry,ref=ghcr.io/acme/app:buildcache
cache-to: type=registry,ref=ghcr.io/acme/app:buildcache,mode=max
```

An inline cache supports only `mode=min`; a separate registry cache can use `mode=max` to include intermediate stages. Choose based on which layers future builds need.

## 2. Verify the Builder and Backend Support the Configuration

Buildx cache backends depend on the builder driver. Docker documents that the default `docker` driver supports selected backends only when the containerd image store is enabled; other configurations need another driver. `docker/setup-buildx-action` normally creates a suitable builder in GitHub Actions.

Print:

```bash
docker buildx version
docker buildx ls
docker buildx inspect --bootstrap
```

Check the logs for cache import and export. A successful image push does not prove the cache exporter ran successfully. Look for authentication, timeout, rate-limit, unsupported-media-type, and storage-limit warnings.

## 3. Give Each Image a Cache Scope

The GitHub Actions cache backend defaults to a `buildkit` scope. Docker warns that multiple images using the same scope overwrite the prior cache, leaving only the last one.

Use distinct scopes:

```text
scope=frontend
scope=api
```

For registry backends, use distinct cache references. Avoid two concurrent jobs writing the same mutable cache location; Docker notes that a cache location should not be written twice without overwriting. Separate by image, platform, or branch policy and import multiple sources if needed.

## 4. Check Platform and Toolchain Compatibility

An `amd64` build cannot necessarily reuse outputs from `arm64`. Include or separate target platform in cache scope. Also compare:

- Dockerfile/frontend syntax version;
- BuildKit and Buildx versions;
- build arguments;
- target stage;
- base image digest;
- secret IDs and mount paths;
- network or security mode where it affects the action.

The cache record must describe the same instruction and compatible inputs. Cross-platform multi-stage builds may still share platform-independent download layers, but do not assume every layer is portable.

## 5. Find the First Miss

Build logs show each Dockerfile instruction. The important line is the first one that is not cached. Every following instruction is expected to rebuild after an earlier invalidation.

Use plain progress:

```bash
docker buildx build --progress=plain .
```

Docker's GitHub Actions integration can also produce a build record with inputs, steps, results, and cache utilization. Preserve it for comparison between runs.

Do not investigate the final `COPY` if an earlier dependency-install layer already missed.

## 6. Shrink the Build Context

For `COPY` and `ADD`, BuildKit calculates a checksum from relevant file metadata. Docker explicitly excludes file modification time (`mtime`) from that checksum, but content and other metadata changes can invalidate it.

A broad instruction is a broad input:

```dockerfile
COPY . .
RUN npm ci
```

Any included source, report, editor file, or generated output can invalidate dependency installation. Add a `.dockerignore`:

```text
.git
node_modules
dist
coverage
*.log
```

Then copy stable dependency inputs first:

```dockerfile
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build
```

When source changes, the install layer can remain cached if its manifests are unchanged.

## 7. Order Stable, Expensive Layers First

Once one layer misses, subsequent layers rebuild. Put infrequently changed, expensive setup before frequently changed source where semantics allow.

This is not permission to copy too little. A dependency install may also depend on workspace manifests, patches, registry configuration, package-manager version files, and lifecycle scripts. Include every real input before the `RUN`.

For a monorepo, generate a pruned build context or copy the relevant workspace manifests rather than assuming only the root lockfile matters.

## 8. Understand `RUN` Invalidation

For an ordinary `RUN`, Docker primarily compares the instruction string; it does not inspect files changed inside the container to decide whether `apt-get update` should run again.

Thus:

```dockerfile
RUN apt-get update && apt-get install -y curl
```

can stay cached even when upstream package repositories change. This is the opposite of an unexpected miss: it is an unexpectedly valid hit.

Force refresh deliberately with:

- a changed preceding layer;
- `--no-cache`;
- `--no-cache-filter <stage>`;
- a documented cache-busting build argument.

Do not use a timestamp cache-buster in every CI run; it defeats reuse by design.

## 9. Account for Build Arguments, Secrets, and Timestamps

Build arguments used by a stage can affect cache. Secret contents, however, are not part of the build cache; changing a secret value alone does not invalidate the step. Secret IDs and mount properties do participate. If an output legitimately depends on secret rotation, add a non-secret version argument that changes with it.

Docker's current cache documentation also notes that `SOURCE_DATE_EPOCH` participates in `WORKDIR` cache validity and can invalidate it and later instructions. Setting it to each commit timestamp intentionally breaks reuse across commits. Use a fixed value when reproducible timestamps are desired without per-commit invalidation, or accept the miss when provenance policy requires the changing value.

Never pass secrets with `ARG` or `COPY`; Docker warns this can leak them. Use BuildKit secret mounts.

## 10. Distinguish Layer Cache from Cache Mounts

A layer cache reuses an entire instruction result when its key matches. A cache mount persists a mutable package-manager store so a rerun downloads only missing items:

```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

Cache mounts help when a layer must rerun. BuildKit does not preserve cache mounts in the GitHub Actions cache by default. On an ephemeral runner, persist the builder state or use a separate supported mechanism to save and restore the mount rather than assuming `cache-to: type=gha` preserves it.

Use locking options for package managers that require exclusive cache access; Docker's examples use `sharing=locked` for APT cache mounts.

## 11. Test the Expected Cases

Run and record:

1. identical inputs twice: all eligible layers hit;
2. source-only edit: layers before source copy hit;
3. lockfile edit: dependency layer and later layers miss;
4. Dockerfile instruction edit: that layer and later layers miss;
5. platform change: incompatible layers miss safely;
6. empty local builder plus remote import: remote cache still works;
7. untrusted fork: cache access and write policy remain safe.

Measure bytes transferred and time saved. A huge remote cache can be slower than rebuilding a cheap layer.

## 12. Treat Remote Cache Data as Untrusted

Do not cache credentials. Restrict writers, especially for workflows that later build privileged releases. GitHub cache scope allows fork pull requests to read base-branch caches, and cache content is not a secret store.

The final deployable image belongs in a registry by immutable digest. The BuildKit cache accelerates construction; it is not the release artifact.

The fastest diagnosis is therefore: confirm import/export, identify the first miss, compare its exact inputs, and only then edit the Dockerfile.

## Official Documentation

- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Optimize Docker build cache usage](https://docs.docker.com/build/cache/optimize/)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker GitHub Actions cache backend](https://docs.docker.com/build/cache/backends/gha/)
- [Docker cache management with GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/)
- [Docker GitHub Actions build summary](https://docs.docker.com/build/ci/github-actions/build-summary/)
