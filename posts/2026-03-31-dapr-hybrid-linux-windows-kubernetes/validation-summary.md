# Validation Summary: How to Run Dapr on Hybrid Linux/Windows Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (hybrid Linux/Windows clusters)
- Helm (Dapr chart installation)
- Docker (Windows container images)

## Sources Consulted
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Helm subchart templates (operator, sentry, placement, sidecar_injector): https://github.com/dapr/dapr/tree/master/charts/dapr/charts
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI reference (dapr list): https://docs.dapr.io/reference/cli/dapr-list/
- Dapr dashboard repository (separate chart): https://github.com/dapr/dashboard
- DockerHub daprio/daprd tags: https://hub.docker.com/r/daprio/daprd/tags

## Issues Found
1. **Per-component `nodeSelector` Helm values are not supported.** The blog post listed individual `nodeSelector` overrides for `dapr_operator`, `dapr_sentry`, `dapr_placement`, `dapr_sidecar_injector`, and `dapr_dashboard`. The Dapr Helm chart does not support per-component `nodeSelector` values — only `global.nodeSelector` is available, which applies to all control plane components uniformly. Removed the invalid per-component entries and kept only `global.nodeSelector`.

2. **`dapr_dashboard` is not part of the core Dapr Helm chart.** The Dapr dashboard is maintained in a separate repository (`dapr/dashboard`) with its own Helm chart. Setting `dapr_dashboard.nodeSelector` in the `dapr/dapr` chart values has no effect. Removed this entry along with the other invalid per-component selectors.

## Review Notes
- The Dapr Helm chart already includes a default node affinity that constrains control plane pods to the OS specified by `global.daprControlPlaneOs` (which defaults to `linux`). Setting `global.nodeSelector` with `kubernetes.io/os: linux` provides an additional explicit constraint, which is a reasonable belt-and-suspenders approach for hybrid clusters.
- The Windows sidecar image tag `daprio/daprd:1.13.0-windows-amd64` is a real published tag. Users should update this to match their installed Dapr version.
- If users need the Dapr dashboard on a hybrid cluster, they should install it separately via `helm install dapr-dashboard dapr/dapr-dashboard` and configure its node selector independently.
