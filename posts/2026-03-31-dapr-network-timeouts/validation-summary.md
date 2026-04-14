# Validation Summary: How to Configure Dapr Network Timeouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency policies
- Dapr Python SDK (`dapr-client`)
- Kubernetes annotations for Dapr sidecar configuration
- Prometheus metrics and alerting rules
- YAML configuration (Kubernetes CRDs)

## Sources Consulted
- Dapr Resiliency spec and schema reference — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Timeout Resiliency Policies — https://docs.dapr.io/operations/resiliency/policies/timeouts/
- Dapr Environment Variable Reference — https://docs.dapr.io/reference/environment/
- Dapr Arguments and Annotations Overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Service Invocation API Reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Python SDK source (invoke_method) — https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK InvokeMethodResponse — https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_response.py
- Dapr Python SDK timeout parameter PR — https://github.com/dapr/python-sdk/pull/473
- Dapr HTTP monitoring metrics source — https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go
- Dapr request size configuration — https://docs.dapr.io/operations/configuration/increase-request-size/
- Dapr read buffer size configuration — https://docs.dapr.io/operations/configuration/increase-read-buffer-size/

## Issues Found

### 1. Fabricated sidecar environment variables (Sidecar-Level section)
**What was wrong:** The post claimed you could set `DAPR_HTTP_CLIENT_TIMEOUT` and `DAPR_GRPC_KEEPALIVE_TIMEOUT` environment variables on the daprd sidecar container via Helm values. Neither of these environment variables exists for the daprd sidecar. Similar-sounding variables (`DAPR_HTTP_CLIENT_READ_TIMEOUT_SECONDS`, `DAPR_GRPC_KEEP_ALIVE_TIMEOUT_SECONDS`) exist only as Java SDK client-side properties, not daprd sidecar settings.
**What was changed:** Removed the entire Helm env vars block. Replaced the section with real Dapr sidecar annotations (`dapr.io/graceful-shutdown-seconds`, `dapr.io/max-body-size`, `dapr.io/read-buffer-size`) and clarified that request-level timeout control should use Resiliency policies or SDK timeouts.

### 2. Deprecated pod annotations (Sidecar-Level section)
**What was wrong:** The post used `dapr.io/http-read-buffer-size` and `dapr.io/http-max-request-size`, which are deprecated in favor of `dapr.io/read-buffer-size` and `dapr.io/max-body-size` respectively.
**What was changed:** Updated to non-deprecated annotation names with proper unit-suffixed values (`"16Ki"`, `"16Mi"`).

### 3. Non-existent per-request timeout header (Per-Request Timeout Override section)
**What was wrong:** The post claimed Dapr supports a `dapr-timeout-ms` metadata header for per-request timeout overrides. This header does not exist in Dapr. The official Dapr Service Invocation API only defines `dapr-caller-app-id`, `dapr-caller-namespace`, and `dapr-callee-app-id` headers.
**What was changed:** Replaced the `dapr-timeout-ms` metadata approach with the SDK's `timeout` parameter on `invoke_method`, which is the correct mechanism for per-request timeouts.

### 4. Incorrect Python SDK usage (Per-Request Timeout Override section)
**What was wrong:** The code used the deprecated `metadata` parameter to pass a non-existent header. The `metadata` parameter on `invoke_method` was only ever intended for API token headers and is deprecated since SDK v1.5.
**What was changed:** Replaced `metadata=(("dapr-timeout-ms", str(timeout_ms)),)` with `timeout=timeout_seconds`. Updated the function signature to use `timeout_seconds: int` (the SDK `timeout` parameter is in seconds, not milliseconds). Updated the example call from `3000` to `3`.

### 5. Inaccurate timeout hierarchy (Timeout Hierarchy section)
**What was wrong:** The post described a three-level hierarchy (per-request metadata > resiliency policy > global sidecar timeout) where "most specific wins." Level 1 (`dapr-timeout-ms`) doesn't exist, and level 3 (global sidecar HTTP client timeout env var) was fabricated. The actual relationship between SDK timeouts and resiliency policy timeouts is not a precedence hierarchy — they operate at different points in the call chain.
**What was changed:** Rewrote to explain the two actual timeout mechanisms: SDK `timeout` (client-side gRPC deadline) and Resiliency policy timeout (sidecar-side). Clarified that whichever fires first determines the effective timeout.

### 6. Wrong Prometheus metric label name (Monitoring Timeout Errors section)
**What was wrong:** The Prometheus queries used `status_code` as the label name, but the actual Dapr metric label is `status` (as defined in the Dapr source code at `pkg/diagnostics/http_monitoring.go`).
**What was changed:** Replaced `status_code` with `status` in both the PromQL query and the alerting rule.

## Review Notes
- The Resiliency policy YAML in the first section is well-structured and accurate, serving as a good reference for the most common timeout configuration approach.
- The `response.data` attribute on the Python SDK's `InvokeMethodResponse` is correct, though `response.json()` would be slightly more idiomatic for JSON responses.
- The Prometheus alerting rule structure is standard and correct apart from the label name fix.
- The `dapr_http_client_completed_count` metric name is confirmed real in the Dapr source code.
