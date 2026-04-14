# Validation Summary: How to Test Dapr Retry Policies Under Real Failures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (resiliency policies, service invocation, Prometheus metrics)
- Python / Flask (test service)
- Toxiproxy (network fault injection)
- Kubernetes (deployment rollout, log inspection)
- Prometheus (resiliency metrics)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Service Invocation API: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Observability / Metrics: https://docs.dapr.io/operations/observability/metrics/
- Dapr source code: `pkg/diagnostics/resiliency_monitoring.go` for metric names and labels
- Toxiproxy GitHub repository and source code: https://github.com/Shopify/toxiproxy

## Issues Found
- **Incorrect exponential backoff timing claim (line 89):** The post originally stated "Expected output shows timestamps with exponential gaps: 100ms, 200ms, 400ms between retries," implying a clean 2x doubling of intervals. Dapr's actual exponential backoff formula is `BackOffDuration = PreviousBackOffDuration * (Random value from 0.5 to 1.5) * 1.5`, which uses a 1.5x average multiplier with randomized jitter. Starting from 100ms, the average progression is approximately 100ms, 150ms, 225ms with significant per-run variation. Fixed the text to describe the actual formula and note the non-deterministic nature of the intervals.

## Review Notes
- The `duration` field in the exponential retry policy is valid and serves as the initial backoff interval, though the official docs more prominently show it with constant policies. Its usage here is correct.
- The Prometheus metrics section shows metric names as bare PromQL-style expressions rather than full queries. This is a style choice and technically fine for illustrative purposes.
- The Toxiproxy commands are fully correct, including the `reset_peer` toxic type and its `timeout` attribute.
- The resiliency YAML structure, including the `matching.httpStatusCodes` field nested inside the retry policy definition, matches the official Dapr schema exactly.
