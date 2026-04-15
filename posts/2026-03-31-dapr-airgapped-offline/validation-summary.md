# Validation Summary: How to Set Up Dapr in an Airgapped or Offline Environment

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Dapr (CLI, runtime, control plane, sidecar injector)
- Docker (image pull, save, load, tag, push)
- Helm (chart download, install, upgrade)
- Kubernetes (secrets, namespaces, configmaps, pod deployment)
- Private container registries
- Redis, Zipkin (infrastructure dependencies)

## Sources Consulted
- Dapr CLI documentation for `dapr init` flags (`--from-dir`, `--image-registry`, `--slim`)
- Dapr Helm chart repository (https://github.com/dapr/helm-charts) for `global.registry`, `global.tag`, and component image value structure
- Dapr Kubernetes deployment documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/)
- Docker Hub `daprio/dapr`, `daprio/daprd`, `daprio/dapr-dashboard` image listings
- GitHub releases URL patterns for `dapr/cli` and `dapr/dapr` repositories

## Issues Found
1. **Step 3 - Missing `docker load` for dashboard image**: Five images were saved as tar archives in Step 1 (`dapr-runtime.tar`, `daprd.tar`, `dapr-dashboard.tar`, `redis.tar`, `zipkin.tar`), but `docker load -i dapr-dashboard.tar` was missing from the load commands in Step 3. Added the missing load command.
2. **Step 3 - Missing tag/push for dashboard and zipkin images**: After loading, only 3 of the 5 images were tagged and pushed to the private registry and the dashboard (`daprio/dapr-dashboard:latest`) and zipkin (`openzipkin/zipkin:latest`) images were missing. Added tag and push commands for both.

## Review Notes
- The Dapr Helm chart's `global.registry` default has moved to `ghcr.io/dapr` (GHCR) with separate per-component image names (`operator`, `sentry`, `placement`, `daprd`, `injector`). The blog post uses Docker Hub's monolithic `daprio/dapr` image and overrides each component's `image.name` with a full path. The Helm chart template detects "/" in `image.name` and uses the value directly, bypassing the `global.registry` prefix, so this does not cause double-prefixing. However, users should be aware that `global.tag` may not be appended when full image paths are used in `image.name`, depending on the chart version.
- The `dapr init --from-dir` combined with `--image-registry` in Step 5 is a valid combination: `--from-dir` provides local binaries and image tars, while `--image-registry` specifies the private registry prefix.
- The `daprio/dapr-dashboard:latest` and `openzipkin/zipkin:latest` images use the `latest` tag rather than a pinned version, which is less reproducible for airgapped deployments. Consider pinning to specific versions for full reproducibility.
- The post references Dapr v1.14.0 throughout. Users should verify that CLI, runtime, and Helm chart versions are all aligned when adapting this guide for different Dapr versions.
