# How to Design Docker Image Caching for Buildkite Agents on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Kubernetes, Docker, CI/CD, Caching

Description: Separate Kubernetes image pulls from BuildKit layer caches and persist reusable build data across ephemeral Buildkite jobs.

---

A Kubernetes node may already have the image used to start a Buildkite job while the Docker build inside that job still downloads and rebuilds everything. These are different caches owned by different components.

Design the cache around the lifetime of the builder. For ephemeral Buildkite pods, a registry-backed BuildKit cache is often easier to share than a directory inside a pod that disappears after the job.

## Separate the three storage layers

The Kubernetes container runtime caches images used to start pods. A Docker daemon or BuildKit worker caches layers and intermediate build results. Your application tools may maintain another cache for dependencies or compilation.

A warm node image cache speeds pod startup but does not automatically populate a Docker-in-Docker daemon's `/var/lib/docker`. A persistent dependency directory does not necessarily preserve BuildKit's internal cache either.

Buildkite's [Kubernetes BuildKit guide](https://buildkite.com/docs/agent/self-hosted/agent-stack-k8s/buildkit-container-builds) documents supported builder arrangements and their storage paths. Choose one arrangement before adding cache volumes; otherwise you can successfully mount a directory that the builder never uses.

## Prefer a shared cache for ephemeral builders

Assume your platform already provides an authenticated Buildx builder with registry-cache support. A build script can use:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BUILDKITE_BUILD_ID:?Expected a Buildkite build}"
image=registry.example.com/team/application
cache=registry.example.com/team/application-buildcache

docker buildx build \
  --file Dockerfile \
  --tag "$image:$BUILDKITE_BUILD_ID" \
  --cache-from "type=registry,ref=$cache:main" \
  --cache-to "type=registry,ref=$cache:main,mode=max" \
  --push \
  .
```

This example is intended for a trusted main-branch cache writer. Configure registry credentials and a Buildx driver supporting the exporter before running it. The default Docker driver has specific cache-backend requirements; the [Docker cache backend guide](https://docs.docker.com/build/cache/backends/) describes them.

The application image and cache use separate references. `mode=max` can retain intermediate-stage cache data as well as final-image layers, at the cost of more storage and transfer.

Do not interpret this command as a complete Kubernetes pod specification. Your platform must provide the Docker client, builder connectivity, storage, and security configuration appropriate for the chosen Buildkite stack mode.

## Separate readers from writers

Pull-request jobs can read a trusted main-branch cache without being allowed to overwrite it. Give untrusted jobs no write credential for the shared release cache. If they need their own cache, isolate its namespace and registry permissions.

Concurrent writers to the same cache reference can replace each other's exported state. Use branch- or workload-specific references when that improves reuse, and deliberately select which jobs update a shared main cache.

A raw branch name may contain slashes or characters unsuitable for an image tag. Generate a normalized, collision-resistant cache key rather than inserting the branch directly. Keep the immutable release image tag or digest separate from the mutable cache reference.

Docker's [registry-cache documentation](https://docs.docker.com/build/cache/backends/registry/) describes the separate cache reference and behavior when an import target does not exist. A cold cache should affect performance, not change the correctness of the resulting build.

## Use persistent volumes intentionally

A persistent volume can keep a local builder warm, but access mode and concurrency matter. A ReadWriteOnce volume may constrain placement to one node, and multiple builder processes must not arbitrarily share the same internal state directory.

Prefer one controlled persistent builder service with its own storage, or independent worker caches, rather than attaching a shared Docker data directory to unrelated job pods. Plan garbage collection and recovery for corrupted cache state.

If a pod's `emptyDir` stores the cache, it disappears with that pod. If the cache is in a node-local path, node replacement removes it. Those lifetimes can be acceptable optimizations, but they are not cross-cluster persistence.

Buildkite's [Docker Compose on Kubernetes guide](https://buildkite.com/docs/agent/self-hosted/agent-stack-k8s/docker-compose-container-builds) discusses persistent storage and builder resource allocation. Ensure CPU, memory, and ephemeral storage cover the builder as well as the command container.

## Improve the Dockerfile before scaling storage

Copy dependency manifests before frequently changing source files so dependency installation can remain cached. Keep irrelevant files out of the build context with `.dockerignore`. Avoid embedding timestamps or build IDs in early layers unless they are required inputs.

Use BuildKit secret mounts for build credentials. Do not bake tokens into layers or cache-exported files through `ARG`, `ENV`, or a copied credentials file. A reusable cache can distribute a mistake to many later builds.

Docker's [cache optimization guide](https://docs.docker.com/build/cache/optimize/) explains layer ordering and external caches. Measure the expensive stages rather than assuming every cache miss has equal cost.

## Test across actual pod replacement

Run a cold build, then a warm build from a newly created job pod on another eligible node. Compare pod image-pull time, cache import time, cached build stages, export time, and total duration.

Change only application source and verify dependency stages remain reusable. Change the lockfile and confirm dependency installation reruns. Finally, delete the test cache and confirm the build still succeeds.

A useful design survives normal pod churn, keeps shared writes controlled, and saves more time than it spends transferring cache data. The cache remains an optimization; immutable artifacts and manifests remain the release contract.
