# Validation Summary: How to Reduce Dapr Sidecar Resource Consumption

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, component scoping, Configuration CRD)
- Kubernetes (kubectl, annotations, resource requests/limits)
- Helm (Dapr Helm chart)
- Go runtime (GOMEMLIMIT, GOGC, GOMAXPROCS)
- Python (calculation example)

## Sources Consulted
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr Component schema reference (https://docs.dapr.io/reference/resource-specs/component-schema/)
- Dapr Configuration spec reference (https://docs.dapr.io/reference/resource-specs/configuration-schema/)
- Dapr Helm chart values reference (https://github.com/dapr/dapr/tree/master/charts/dapr)
- Go runtime environment variables documentation (https://pkg.go.dev/runtime)

## Issues Found

1. **Incorrect annotation name for sidecar environment variables (line 72):** The post used `dapr.io/sidecar-env` which is not a valid Dapr annotation. The correct annotation for setting environment variables on the Dapr sidecar is `dapr.io/env`. Fixed to `dapr.io/env`.

2. **Incorrect `scopes` placement in Component YAML (lines 63-64):** The `scopes` field was nested under `spec`, but in the Dapr Component CRD, `scopes` is a top-level field at the same level as `metadata` and `spec`. When placed under `spec`, it is silently ignored and the component loads for all applications, defeating the purpose of scoping. Fixed by moving `scopes` to the top level.

3. **Incorrect Helm chart value for sidecar image (line 88):** The post used `dapr_sidecar_injector.image.name` which controls the sidecar injector's own container image, not the daprd sidecar image that gets injected into application pods. The correct Helm value is `dapr_sidecar_injector.sidecarImageName`. Fixed accordingly.

## Review Notes
- The Python calculation at the end is correct: (150 - 70) * 200 = 16000 MB = 15.6 GB.
- The overview math claim ("saving 50MB across 200 pods saves 10GB") is correct: 50 * 200 = 10000 MB ≈ 10 GB.
- The `GOMAXPROCS=1` description says "Use single OS thread" — technically it limits the number of OS threads that can execute user-level Go code simultaneously, but Go may still use additional OS threads for blocking syscalls. The description is acceptable for a blog post audience.
- The `GOMEMLIMIT` description says "Cap Go heap at 80MB" — it's technically a soft memory limit for the entire Go runtime (not just heap), but this is a common simplification and acceptable here.
- The `dapr.io/log-as-json: "false"` annotation is shown as an optimization; note that the default value for this annotation is already `false`, so this annotation only needs to be set if a previous configuration had enabled it.
