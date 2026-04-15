# Validation Summary: How to Monitor Dapr Component Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar runtime)
- Dapr Metadata API
- Dapr Health API (outbound health endpoint)
- Prometheus (metrics and alerting rules)
- Python (application-level health checks)

## Sources Consulted
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Sidecar health documentation: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr metrics reference (source code): https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/

## Issues Found

### Issue 1: Fabricated `status` field on metadata API components
**What was wrong:** The post claimed the `/v1.0/metadata` endpoint reports a "health status" for each component, and the Python script read `c.get('status', 'UNKNOWN')`. In reality, the metadata API returns `name`, `type`, `version`, and `capabilities` per component — there is no `status` field. A component that fails to initialize simply does not appear in the list.
**What was changed:** Rewrote the section description to accurately state that the metadata endpoint lists initialized components. Updated the Python script to print components as "initialized" rather than reading a non-existent status field.

### Issue 2: Wrong Prometheus metric name for pub/sub
**What was wrong:** The post used `dapr_component_pubsub_publish_count`. This metric does not exist in Dapr.
**What was changed:** Replaced with the correct metric name `dapr_component_pubsub_egress_count` in both the PromQL query section and the alerting rules YAML.

### Issue 3: Wrong Prometheus metric name for bindings
**What was wrong:** The post used `dapr_component_binding_count`. This metric does not exist. Dapr exposes separate metrics for input and output bindings: `dapr_component_input_binding_count` and `dapr_component_output_binding_count`.
**What was changed:** Replaced with `dapr_component_output_binding_count` and updated the comment to say "Output binding availability".

### Issue 4: Fabricated state store health endpoint
**What was wrong:** The Python application-level check used the path `state/statestore/health` (i.e., `/v1.0/state/statestore/health`). This endpoint does not exist in the Dapr State Management API. There is no per-component health endpoint.
**What was changed:** Rewrote the `check_component_availability()` function to use the actual outbound health endpoint (`/v1.0/healthz/outbound`) for binary health checks, and the metadata endpoint (`/v1.0/metadata`) to verify individual components are initialized.

## Review Notes
- The outbound health endpoint (`/v1.0/healthz/outbound`) information was correct — it does return 204 when healthy and 500 otherwise.
- The `dapr_component_state_count` metric name and the `success` label are correct.
- The Prometheus alerting rules structure (Prometheus recording/alerting rule YAML format) is syntactically correct.
- The post could benefit from mentioning `dapr_component_input_binding_count` alongside the output binding metric for completeness, but this was not added to avoid scope creep beyond error correction.
