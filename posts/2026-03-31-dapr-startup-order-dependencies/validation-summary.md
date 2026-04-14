# Validation Summary: How to Configure Dapr Startup Order Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, app health checks, annotations)
- Kubernetes (init containers, startup probes, readiness probes, liveness probes, Jobs)
- Python / Flask (health endpoint example)
- Redis (dependency check example)
- ArgoCD / Helm (mentioned for ordering migrations)

## Sources Consulted
- [Dapr App Health Checks](https://docs.dapr.io/operations/resiliency/health-checks/app-health/) — official docs for app health check annotations, defaults, and units
- [Dapr Arguments and Annotations Overview](https://docs.dapr.io/reference/arguments-annotations-overview/) — complete list of Dapr Kubernetes annotations and daprd flags
- [Dapr Sidecar Health](https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/) — sidecar startup and readiness behavior
- [Dapr Sidecar Overview](https://docs.dapr.io/concepts/dapr-services/sidecar/) — sidecar initialization and blocking behavior
- [Dapr Common Issues](https://docs.dapr.io/operations/troubleshooting/common_issues/) — startup ordering troubleshooting
- [Dapr lifecycle management issue #2918](https://github.com/dapr/dapr/issues/2918) — discussion of daprd wait-for-app-ready behavior

## Issues Found

### 1. Missing required `dapr.io/enable-app-health-check` annotation
**What was wrong:** The health check annotation block did not include `dapr.io/enable-app-health-check: "true"`. This annotation is required to activate Dapr's app health checking; without it, all other health check annotations are ignored.
**What was changed:** Added `dapr.io/enable-app-health-check: "true"` to the annotation block with a comment noting it is required.

### 2. Incorrect unit for `app-health-probe-timeout`
**What was wrong:** The value was `"3"` with a comment claiming "3 second timeout". However, per the official docs, this annotation's unit is **milliseconds**, not seconds. A value of `"3"` means 3 milliseconds — far too short for any real health check. The default is `500` (500ms).
**What was changed:** Changed the value from `"3"` to `"3000"` and updated the comment to say "3000 millisecond timeout".

### 3. Fabricated `dapr.io/wait-for-app-start` annotation
**What was wrong:** The "Dapr Sidecar Wait-for-App" section used an annotation `dapr.io/wait-for-app-start: "60"` that does not exist in Dapr. No such annotation appears in the official Dapr annotations reference. The description of the feature (delaying traffic until the app is ready) is actually what the `enable-app-health-check` feature provides.
**What was changed:** Replaced the fabricated annotation with an accurate explanation: the Dapr sidecar blocks during initialization until the app is listening on its configured port, and `enable-app-health-check` provides runtime health gating. Updated the code example to show the correct annotations. Also updated the Summary section to remove the reference to "wait-for-app-start delays".

## Review Notes
- The Kubernetes init container, startup probe, readiness probe, liveness probe, and Job configurations are all standard and correct.
- The Python Flask health endpoint code is syntactically correct and demonstrates a reasonable pattern.
- The "Dapr Sidecar Wait-for-App" section now partially overlaps with the earlier "Dapr App Health Check Dependency" section since both describe the `enable-app-health-check` annotations. A future revision could consolidate these sections, but no content was removed to preserve the author's structure.
- The post does not pin a specific Dapr version. The annotations were verified against the current Dapr docs (v1.14+).
