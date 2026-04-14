# Validation Summary: How to Configure Dapr Sidecar Startup Probes

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar injector, health probes)
- Kubernetes (liveness probes, readiness probes, startup probes, pod annotations)
- kubectl / jq (CLI inspection)

## Sources Consulted
- Dapr Kubernetes Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Sidecar Health Documentation: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr Injector Source Code (annotations): https://github.com/dapr/dapr/blob/master/pkg/injector/annotations/annotations.go
- Dapr Injector Source Code (sidecar container): https://github.com/dapr/dapr/blob/master/pkg/injector/patcher/sidecar_container.go
- Kubernetes Probe Documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found

### 1. Fabricated startup probe annotations (critical)
**What was wrong:** The post used `dapr.io/sidecar-startup-probe-threshold`, `dapr.io/sidecar-startup-probe-period-seconds`, and `dapr.io/sidecar-startup-probe-failure-threshold` annotations. None of these exist in Dapr. Dapr only supports liveness and readiness probe annotations (e.g., `dapr.io/sidecar-liveness-probe-*` and `dapr.io/sidecar-readiness-probe-*`).
**What was changed:** Replaced all fabricated startup probe annotations with the correct liveness and readiness probe annotation names.
**Why:** The Dapr sidecar injector does not configure Kubernetes startup probes. It only configures liveness and readiness probes. The same protective behavior (giving daprd time to initialize) is achieved by tuning the liveness probe's `delay-seconds` and `threshold` annotations.

### 2. Incorrect description of `threshold` annotation
**What was wrong:** The post described `threshold` as "number of seconds after the container starts before the probe is initiated." This is the definition of `initialDelaySeconds` (mapped by the `delay-seconds` annotation), not `failureThreshold` (mapped by the `threshold` annotation).
**What was changed:** Fixed the description of `threshold` to "how many consecutive failures before the container is marked as failed (`failureThreshold`)". Added `delay-seconds` as a separate annotation with the correct `initialDelaySeconds` description.
**Why:** The Dapr `threshold` annotation maps to Kubernetes `failureThreshold` in the injector source code, not `initialDelaySeconds`.

### 3. Redundant/non-existent `failure-threshold` annotation
**What was wrong:** The post used both `dapr.io/sidecar-startup-probe-threshold` and `dapr.io/sidecar-startup-probe-failure-threshold` as if they were different settings. Even if startup probe annotations existed, Dapr uses `threshold` (not `failure-threshold`) as the annotation suffix for the failure threshold field.
**What was changed:** Removed the `failure-threshold` variant and used the correct `threshold` suffix consistently.
**Why:** Dapr's annotation naming convention uses `-threshold` (not `-failure-threshold`) to map to Kubernetes `failureThreshold`.

### 4. Non-existent `app-startup-probe-failure-threshold` annotation
**What was wrong:** The "Combining with App Startup" section used `dapr.io/app-startup-probe-failure-threshold`. This annotation does not exist. Dapr does not configure Kubernetes probes for the application container via annotations.
**What was changed:** Replaced with `dapr.io/sidecar-readiness-probe-threshold` to demonstrate tuning both liveness and readiness probes for the sidecar.
**Why:** App container Kubernetes probes must be configured directly in the pod spec. Dapr has separate app health check annotations (`dapr.io/enable-app-health-check`, etc.) but these are Dapr-level checks, not Kubernetes probes.

### 5. Incorrect jq query for startup probe
**What was wrong:** The kubectl/jq command queried `.startupProbe` on the daprd container, which would return null since Dapr does not inject startup probes.
**What was changed:** Changed the query to `.livenessProbe` and updated the example output to include `initialDelaySeconds`.
**Why:** The Dapr injector only injects liveness and readiness probes into the daprd container.

### 6. Incorrect event message reference
**What was wrong:** The post referenced `Startup probe failed` Kubernetes events, but since Dapr uses liveness probes, the events would say `Liveness probe failed`.
**What was changed:** Updated to `Liveness probe failed`.
**Why:** Kubernetes event messages reflect the type of probe that failed.

## Review Notes
- The core concept of the post (giving the Dapr sidecar time to initialize before health checks cause restarts) is valid and useful. The implementation mechanism was incorrect.
- Dapr may add startup probe annotation support in a future release. If so, this post could be updated to cover those annotations.
- The post could benefit from also showing readiness probe annotations (`dapr.io/sidecar-readiness-probe-*`) alongside liveness probe annotations for a more complete picture, but the current coverage is adequate.
- The health endpoint `/v1.0/healthz` on port 3500 is correct for Dapr's sidecar liveness probe.
