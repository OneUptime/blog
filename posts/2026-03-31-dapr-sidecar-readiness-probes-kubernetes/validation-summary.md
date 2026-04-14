# Validation Summary: How to Configure Dapr Sidecar Readiness Probes on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Deployments, readiness probes, rolling updates)
- kubectl CLI

## Sources Consulted
- Dapr sidecar injector source code (`dapr/dapr` repository, `pkg/injector/patcher/sidecar_container.go` and `pkg/injector/patcher/sidecar.go`)
- Dapr annotations source code (`dapr/dapr` repository, `pkg/injector/annotations/annotations.go`)
- Dapr health API source code (`dapr/dapr` repository, `pkg/api/http/responses.go`)
- https://docs.dapr.io/reference/arguments-annotations-overview/
- https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-health-checks/
- https://docs.dapr.io/operations/observability/sidecar-health/

## Issues Found

### 1. Incorrect readiness probe endpoint
- **What was wrong:** The post stated that Dapr's default readiness probe calls `/v1.0/healthz/outbound`. The Kubernetes readiness probe actually uses `/v1.0/healthz`. The `/v1.0/healthz/outbound` endpoint exists separately for SDK-level component initialization checks but is not what the Kubernetes readiness probe is configured to use by the sidecar injector.
- **What was changed:** Updated the "Default Readiness Probe Settings" section and Summary to reference `/v1.0/healthz` instead of `/v1.0/healthz/outbound`.

### 2. Incorrect HTTP response code
- **What was wrong:** The post stated the readiness endpoint "returns 200" when healthy. The actual successful response code is **204 No Content**. The post contradicted itself by later correctly stating "HTTP 204 = healthy" in the curl examples.
- **What was changed:** Changed "returns 200" to "returns 204" in the "Default Readiness Probe Settings" section.

### 3. All four readiness probe annotation names were incorrect
- **What was wrong:**
  - `dapr.io/sidecar-readiness-probe-delay` should be `dapr.io/sidecar-readiness-probe-delay-seconds`
  - `dapr.io/sidecar-readiness-probe-period` should be `dapr.io/sidecar-readiness-probe-period-seconds`
  - `dapr.io/sidecar-readiness-probe-failure-threshold` should be `dapr.io/sidecar-readiness-probe-threshold`
  - `dapr.io/sidecar-readiness-probe-timeout` should be `dapr.io/sidecar-readiness-probe-timeout-seconds`
- **What was changed:** Corrected all annotation names in both YAML examples (the main deployment example and the slow component connections example) and in the Summary section. The `-seconds` suffix was added where required, and `-failure-threshold` was corrected to `-threshold`.

## Review Notes
- The default readiness probe values (initialDelaySeconds: 3, periodSeconds: 6, failureThreshold: 3, timeoutSeconds: 3) are all correct per the source code.
- The sidecar HTTP port 3500 is correct for manual curl testing of the health API.
- The kubectl commands shown are all valid and correct.
- The math in the "Handling Slow Component Connections" section (30 + 20 * 5 = 130 seconds) is correct.
- The readiness probe actually hits port 3501 (the sidecar public port), not 3500, but this distinction is internal to Kubernetes and does not affect the manual curl testing workflow described in the post.
