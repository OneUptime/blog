# Why Only One Architecture Reuses Your Multi-Platform Docker Cache—and How to Split Cache Exports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Build Cache, Architecture, CI/CD

Description: Diagnose asymmetric multi-platform Docker cache reuse and isolate per-platform exports without confusing cache manifests with the final image index.

---

When an amd64 build gets cache hits and an arm64 build recompiles everything, first check how cache was exported. Two independent jobs writing one mutable cache reference can replace each other's cache graph. The last writer's useful records may dominate the next build.

This is not proof that BuildKit cannot cache multi-platform builds. A single coordinated multi-platform build can export its cache. The common failure is treating separate exports as an automatic merge. Docker warns that writing a cache location again overwrites it. [Cache storage backends](https://docs.docker.com/build/cache/backends/).

## Establish Whether the Miss Is Expected

Platform-specific binaries should not reuse incompatible outputs. A package downloaded as source may be portable; compiled native modules, linked executables, and platform-specific base layers generally are not.

For both platforms, compare the builder, BuildKit version, Dockerfile target, base-image digest, build arguments, and imported cache reference. Confirm that a successful producer actually exported records for the platform whose next build misses.

Use plain progress logs and inspect each platform's stage labels. A quick dependency download in one platform does not establish that its compilation was cached. A successful final image push does not establish a successful cache export either.

## Give Each Independent Platform Export Its Own Reference

For a registry backend, assign stable cache tags per image and platform:

```text
registry.example.com/team/api-cache:main-linux-amd64
registry.example.com/team/api-cache:main-linux-arm64
```

After logging in to the registry and creating a `docker-container` builder, run the following command in the amd64 job:

```bash
docker buildx build \
  --platform linux/amd64 \
  --cache-from type=registry,ref=registry.example.com/team/api-cache:main-linux-amd64 \
  --cache-to type=registry,ref=registry.example.com/team/api-cache:main-linux-amd64,mode=max \
  --tag registry.example.com/team/api:build-123-linux-amd64 \
  --push .
```

The arm64 job uses its own references:

```bash
docker buildx build \
  --platform linux/arm64 \
  --cache-from type=registry,ref=registry.example.com/team/api-cache:main-linux-arm64 \
  --cache-to type=registry,ref=registry.example.com/team/api-cache:main-linux-arm64,mode=max \
  --tag registry.example.com/team/api:build-123-linux-arm64 \
  --push .
```

Replace `build-123` with an identifier shared by the two jobs in one build. Use native runners or configure the builder for the target architecture; a platform flag does not by itself install emulation support. Docker documents native nodes, emulation, and cross-compilation as distinct multi-platform strategies. [Multi-platform builds](https://docs.docker.com/build/building/multi-platform/).

`mode=max` retains eligible intermediate-stage cache as well as final-stage records. It does not make architecture-specific outputs portable, and it does not merge unrelated concurrent exports.

## Join Images, Not Cache Manifests

After both image jobs succeed, publish the final image index:

```bash
docker buildx imagetools create \
  --tag registry.example.com/team/api:build-123 \
  registry.example.com/team/api:build-123-linux-amd64 \
  registry.example.com/team/api:build-123-linux-arm64
```

For release automation, pass the immutable image digests returned by the producers instead of mutable tags. This prevents a later build from changing which images the join step selects. `imagetools create` constructs an image manifest list or index from registry image sources. [Imagetools create](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/).

Do not use the cache references as those sources. Cache metadata is acceleration state; the application images are the runnable artifacts. Creating a final multi-platform image index does not combine the two BuildKit cache graphs.

## Use Equivalent Scopes with the GitHub Backend

For the `gha` backend, the same partitioning belongs in `scope`:

```yaml
cache-from: type=gha,scope=api-linux-amd64
cache-to: type=gha,scope=api-linux-amd64,mode=max
```

The arm64 matrix entry uses `api-linux-arm64`. Include an image dimension when a repository builds several services. Docker documents the default `buildkit` scope and recommends distinct scopes for separate images. [GitHub Actions cache backend](https://docs.docker.com/build/cache/backends/gha/).

Separate platforms still leave a possible same-platform race between concurrent runs. Serialize writers for each stable reference, or export branch/build-specific references and promote only successful trusted results according to your retention policy.

## Verify with Fresh Consumers

Populate both caches, then consume each from a fresh builder with identical inputs. This prevents local builder state from masking a missing remote export. Confirm hits in the expensive dependency and compiler stages for each architecture.

Next, change one application source file. Earlier dependency operations should remain reusable where their inputs are unchanged. Finally, change a platform-specific dependency or compiler input and verify that the affected operations rerun safely.

Record separate hit rates and transfer times per platform. If one remains cold, inspect its importer, cache reference, authentication, stage inputs, and producer logs. Splitting exports solves cache-location collisions; it cannot compensate for missing records or a Dockerfile that changes its effective inputs on every run.

## References

- [Docker external cache backends](https://docs.docker.com/build/cache/backends/)
- [Docker multi-platform strategies](https://docs.docker.com/build/building/multi-platform/)
- [Buildx imagetools create](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/)
- [GitHub Actions BuildKit scopes](https://docs.docker.com/build/cache/backends/gha/)
