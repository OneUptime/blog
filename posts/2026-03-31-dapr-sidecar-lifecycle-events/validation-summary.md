# Validation Summary: How to Understand Dapr Sidecar Lifecycle Events

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (pod annotations, sidecar injection, readiness probes)
- daprd (Dapr sidecar process)
- kubectl CLI
- jq (JSON log filtering)

## Sources Consulted
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Health API Reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Sidecar Health: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr App Health Checks: https://docs.dapr.io/operations/resiliency/health-checks/app-health/
- Dapr Sidecar Overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr Sidecar Injector Overview: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr on Kubernetes Overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr CLI Run Command Reference: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Incorrect init container claim (Sidecar Injection section)
- **What was wrong:** The post stated "The injector also adds an init container that blocks the application container from starting until the Dapr runtime is ready." Dapr does not add an init container by default. The sidecar is injected as a regular container alongside the application.
- **What was changed:** Replaced with "The sidecar runs as a regular container alongside your application in the same pod."

### 2. App health check presented as default behavior (Startup Phase section)
- **What was wrong:** Step 5 stated daprd "Calls your app's health endpoint (`/healthz`) to confirm the app is ready" as part of the standard startup sequence. App health checks are disabled by default and must be explicitly enabled via the `dapr.io/enable-app-health-check: "true"` annotation.
- **What was changed:** Reworded to clarify this is optional and requires the `dapr.io/enable-app-health-check` annotation to be enabled.

### 3. Fabricated annotation `dapr.io/sidecar-ready-timeout-seconds` (App-to-Dapr Ordering section)
- **What was wrong:** The annotation `dapr.io/sidecar-ready-timeout-seconds` does not exist in the Dapr annotations reference. The entire section described a non-existent feature.
- **What was changed:** Rewrote the section to describe the actual recommended approaches: checking the Dapr healthz endpoint from the app, using Dapr SDK built-in retry logic, or using Kubernetes native sidecars.

### 4. Wrong annotation name `dapr.io/sidecar-graceful-shutdown-seconds` (Shutdown Phase section)
- **What was wrong:** The correct annotation is `dapr.io/graceful-shutdown-seconds` (without the "sidecar-" prefix).
- **What was changed:** Fixed the annotation name to `dapr.io/graceful-shutdown-seconds`.

### 5. Incorrect init container name and description (Init Container Behavior section)
- **What was wrong:** The post claimed there is an init container called `dapr-init` that "ensures the sidecar binary is present before starting." No such init container exists. The `daprd` container image already contains the sidecar binary.
- **What was changed:** Renamed the section to "Sidecar Container Image" and corrected the description to reference the `daprio/daprd` image.

### 6. Wrong Docker image name (Init Container Behavior section)
- **What was wrong:** The post used `daprio/dapr:1.14.0`. The Dapr sidecar image is `daprio/daprd` (with a "d" suffix). `daprio/dapr` is a different image used for self-hosted mode initialization.
- **What was changed:** Corrected to `daprio/daprd:1.14.0`.

## Review Notes
- The shutdown sequence steps 3-4 ("Flushes pending telemetry" and "Closes component connections") are plausible but not explicitly documented in the official Dapr docs. They were left as-is since they describe reasonable internal behavior.
- The default ports (HTTP 3500, gRPC 50001), healthz endpoint path (`/v1.0/healthz`), HTTP 204 response code, and logging annotations (`dapr.io/log-as-json`, `dapr.io/log-level`) were all verified as accurate.
- The Kubernetes native sidecar feature referenced in the fix uses `dapr.io/sidecar-container`, available in Kubernetes 1.29+. This is a relatively new feature and may not be available in all clusters.
