# Validation Summary: How to Use Dapr with Private Container Registries on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (v1.13.0)
- Kubernetes
- Helm
- Docker (container image mirroring)
- Private container registries

## Sources Consulted
- Dapr Helm chart values.yaml — https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr sidecar injector sub-chart values — https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Docker Hub images — https://hub.docker.com/u/daprio
- Dapr v1.13.0 release notes — https://github.com/dapr/dapr/releases/tag/v1.13.0

## Issues Found
1. **Incorrect Helm value for sidecar image override** (line 92): The post used `dapr_sidecar_injector.sidecarImageName` which is not a valid Helm value in the Dapr chart. Changed to `dapr_sidecar_injector.image.name`, which is the correct path for overriding the sidecar (daprd) image in the injector sub-chart. When the value contains a `/`, the Helm chart uses it as a full image reference rather than prepending `global.registry`.

## Review Notes
- Since Dapr 1.11+, the default container registry changed from Docker Hub (`docker.io/daprio`) to GitHub Container Registry (`ghcr.io/dapr`). The post mirrors from Docker Hub which still works, but readers using newer Dapr versions should be aware that the canonical source is now `ghcr.io/dapr`.
- The dashboard version `0.14.0` is used in the mirroring script. The Dapr dashboard is versioned independently from the Dapr runtime, so the correct dashboard version should be verified against the specific Dapr release being used.
- The `global.registry`, `global.tag`, `global.imagePullSecrets`, and `dapr.io/sidecar-image` annotation are all verified correct.
- All Dapr image names (`operator`, `sentry`, `placement`, `injector`, `daprd`, `dashboard`) under the `daprio/` Docker Hub organization are correct.
- The kubectl commands for verifying image sources are syntactically correct and functional.
