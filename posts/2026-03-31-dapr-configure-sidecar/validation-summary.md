# Validation Summary: How to Configure the Dapr Sidecar for Your Application

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sidecar (`daprd`)
- Dapr CLI (`dapr run`)
- Kubernetes (Deployments, Pod Annotations)
- Dapr Configuration CRD
- OpenTelemetry (tracing configuration)
- gRPC

## Sources Consulted
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration CRD spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr sidecar debugging on Kubernetes: https://docs.dapr.io/developing-applications/debugging/debug-k8s/debug-daprd/
- Dapr health check configuration: https://docs.dapr.io/operations/observability/app-health/
- Dapr preview features: https://docs.dapr.io/operations/support/support-preview-features/

## Issues Found

1. **`dapr.io/dapr-http-port` annotation does not exist**: There is no Kubernetes annotation to override the Dapr HTTP API port. Removed this annotation from the Deployment example and the API Ports reference section.

2. **`dapr.io/dapr-grpc-port` incorrect annotation name**: The correct annotation is `dapr.io/grpc-port` (not `dapr.io/dapr-grpc-port`). Fixed in all annotation examples.

3. **`--app-protocol` flags table missing `h2c`**: The annotation reference section correctly listed `h2c` as a valid value, but the CLI flags table only listed `http, grpc, https, grpcs`. Added `h2c` to the flags table for consistency.

4. **`dapr.io/http-max-request-size` is deprecated**: This annotation has been replaced by `dapr.io/max-body-size` which uses resource quantity format (e.g., `"4Mi"`). Updated the annotation name and value format.

5. **`spec.metric` should be `spec.metrics` (plural)**: In the Configuration CRD example, the field was `metric` but the correct field name is `metrics`. Fixed to `spec.metrics`.

6. **Metadata endpoint `.runtimeMetadata` field does not exist**: The `/v1.0/metadata` response does not contain a `runtimeMetadata` field. Changed the jq filter from `.runtimeMetadata` to `.` to show the full metadata response.

7. **`dapr.io/sidecar-listen-address` should be plural**: The correct annotation is `dapr.io/sidecar-listen-addresses` (with trailing 's'). Fixed the annotation name.

8. **`dapr.io/profile-port` is not a valid Kubernetes annotation**: The `--profiling-port` flag is not supported as a Kubernetes annotation. Removed from the API Ports reference section.

## Review Notes
- `dapr.io/wait-for-sidecar-before-app-start` may be superseded by Kubernetes native sidecar support (`dapr.io/enable-native-sidecar`) in Kubernetes 1.28+. The annotation was kept as it may still function for older cluster versions.
- The `--log-level` flag also accepts `fatal` and `panic` values beyond the four listed (`debug`, `info`, `warn`, `error`), though these are rarely used in practice.
- The `dapr.io/http-read-buffer-size` annotation may also be transitioning to `dapr.io/read-buffer-size` in newer Dapr versions; the current name was kept as it still appears in official how-to documentation.
