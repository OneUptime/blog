# Validation Summary: How to Configure Dapr HTTP Port

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Deployments, annotations, liveness probes)
- Dapr HTTP API (state management, pub/sub, service invocation, health checks)
- Dapr CLI (`dapr run`)
- Node.js (JavaScript example)
- curl

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Invalid annotation `dapr.io/http-port`
**What was wrong:** The post used `dapr.io/http-port` as a Kubernetes annotation to configure the Dapr sidecar HTTP port. This annotation does not exist in Dapr. The HTTP port is not configurable via Kubernetes annotation — it defaults to 3500 in Kubernetes. It can only be changed in self-hosted mode via the `--dapr-http-port` CLI flag or daprd argument.
**What was changed:** Removed `dapr.io/http-port: "3500"` from the Deployment YAML and added a note explaining that the HTTP port is not configurable via annotation in Kubernetes. Updated the "Changing the HTTP Port" section to show the correct CLI approach (`--dapr-http-port` flag) instead of the non-existent annotation.

### 2. Deprecated annotation `dapr.io/http-max-request-size`
**What was wrong:** The post used `dapr.io/http-max-request-size: "16"` with a bare integer (in MB). This annotation is deprecated.
**What was changed:** Updated to the current annotation `dapr.io/max-body-size: "16Mi"` which uses Kubernetes-style size units and noted the default is `4Mi`.

### 3. Deprecated annotation `dapr.io/http-read-buffer-size`
**What was wrong:** The post used `dapr.io/http-read-buffer-size: "4"` with a bare integer (in KB). This annotation is deprecated.
**What was changed:** Updated to the current annotation `dapr.io/read-buffer-size: "16Ki"` which uses Kubernetes-style size units and noted the default is `4Ki`.

## Review Notes
- The service invocation curl example uses `curl` with `-d` (which implicitly sends POST), which is appropriate for invoking a `placeOrder` method. The Dapr invoke endpoint forwards the HTTP method to the target service, so any method (GET, POST, PUT, DELETE) can be used depending on the target.
- The health endpoints `/v1.0/healthz` and `/v1.0/healthz/outbound` are correct. The `/v1.0/healthz` endpoint checks full sidecar readiness (including app channel), while `/v1.0/healthz/outbound` only checks that Dapr components are initialized and the HTTP port is available.
- The `--dapr-http-port` CLI flag and all HTTP API paths (`/v1.0/state/`, `/v1.0/publish/`, `/v1.0/invoke/`) are correct.
- The liveness probe example hardcodes port 3500, which is correct for Kubernetes where the HTTP port is not configurable.
