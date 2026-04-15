# Validation Summary: How to Perform Chaos Engineering with Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (resiliency policies, service invocation, sidecar architecture)
- Chaos Toolkit (chaostoolkit, chaostoolkit-kubernetes)
- Kubernetes (kubectl exec, pod management, port-forwarding)
- Prometheus (metrics querying)
- stress-ng (CPU stress testing)

## Sources Consulted
- Chaos Toolkit Experiment API Reference — https://chaostoolkit.org/reference/api/experiment/
- Chaos Toolkit Install Guide — https://chaostoolkit.org/reference/usage/install/
- Chaos Toolkit CLI (chaos run) — https://chaostoolkit.org/reference/usage/run/
- chaostoolkit on PyPI — https://pypi.org/project/chaostoolkit/
- chaostoolkit-kubernetes on PyPI — https://pypi.org/project/chaostoolkit-kubernetes/
- Dapr Resiliency spec — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit breaker policies — https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Service invocation API — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Metrics reference — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- kubectl exec documentation — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
1. **Incorrect Dapr metric name (line 94)**: The post used `dapr_http_server_request_duration_seconds_bucket{app_id="orderservice"}`, which is not a real Dapr metric. This appears to be a conflation of generic Prometheus/OpenTelemetry naming conventions with the actual Dapr metric name. Changed to `dapr_http_server_latency{app_id="orderservice"}`, which is the correct Dapr HTTP server latency metric.

## Review Notes
- The `kubectl exec deployment/orderservice` command in the Chaos Toolkit experiment is technically valid (kubectl resolves it to a pod), but in multi-replica deployments it targets an arbitrary pod. This is acceptable for chaos experiments but worth noting.
- The Chaos Toolkit experiment JSON omits the `version` field, which is fine as it is not required by the specification.
- The Dapr Resiliency CRD correctly uses `policy: exponential` without a `duration` field, since `duration` only applies to the `constant` retry policy.
- All Chaos Toolkit pip packages, CLI commands, and experiment JSON structure are correct per official documentation.
- The Dapr service invocation URL format (`localhost:3500/v1.0/invoke/<appId>/method/<method>`) is correct.
