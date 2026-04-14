# Validation Summary: How to Configure Sidecar Health Checks in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, health API)
- Kubernetes (liveness probes, readiness probes, pod lifecycle)
- Prometheus (kube-state-metrics queries)
- kubectl CLI

## Sources Consulted
- Dapr Arguments and Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Health API Reference: https://docs.dapr.io/reference/api/health_api/

## Issues Found
1. **Incorrect annotation names for probe failure threshold**: The blog used `dapr.io/sidecar-liveness-probe-failure-threshold` and `dapr.io/sidecar-readiness-probe-failure-threshold`. The correct annotation names per official Dapr documentation are `dapr.io/sidecar-liveness-probe-threshold` and `dapr.io/sidecar-readiness-probe-threshold` (without the `failure-` prefix). Both occurrences were fixed.

## Review Notes
- The health endpoint (`/v1.0/healthz` on port 3500 returning 204) is confirmed correct per official Dapr Health API docs.
- Default probe values (initialDelaySeconds=3, periodSeconds=6, failureThreshold=3) match official annotation defaults.
- The remaining annotation names (`delay-seconds`, `period-seconds`) are correct per official docs.
- The post does not mention `dapr.io/sidecar-liveness-probe-timeout-seconds` or `dapr.io/sidecar-readiness-probe-timeout-seconds` (both default to 3 seconds), which are also available for customization. This is not an error, just an omission readers could look up.
- The Prometheus query and kubectl commands are syntactically correct and use valid field selectors/metric names.
