# Validation Summary: How to Handle Service Invocation Errors in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency API (retries, circuit breakers, timeouts)
- Dapr Service Invocation API
- Python (requests library)
- Go (net/http)
- Kubernetes
- Prometheus (metrics)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Service Invocation How-To: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Error Codes Reference: https://docs.dapr.io/reference/api/error_codes/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr source code (pkg/diagnostics/resiliency_monitoring.go) for metric name verification

## Issues Found
1. **Incorrect self-hosted resiliency file path**: The post stated to place resiliency YAML files in `~/.dapr/resiliency/`. This directory does not exist by default. In Dapr self-hosted mode, resiliency specs are loaded from the same resources directory as components, which defaults to `~/.dapr/components/`. Alternatively, a custom path can be specified via the `--resources-path` CLI flag. Fixed the path to `~/.dapr/components/`.

## Review Notes
- The exponential backoff retry fields (`initialInterval`, `randomizationFactor`, `multiplier`) are valid Dapr configuration fields, though they are documented in detailed reference pages rather than the overview.
- The claim that Dapr returns HTTP 503 when a circuit breaker is open is plausible and consistent with common circuit breaker implementations (Dapr uses sony/gobreaker internally), but is not explicitly documented in the official Dapr docs. The `ERR_DIRECT_INVOKE` error code is confirmed to exist for service invocation errors.
- The Prometheus metric names (`dapr_resiliency_count`, `dapr_resiliency_activations_total`) were verified against Dapr source code, as the official metrics documentation page does not enumerate individual metric names.
- The Python and Go code examples are syntactically correct and use the proper Dapr service invocation URL pattern (`/v1.0/invoke/<app-id>/method/<method>`).
- The Resiliency YAML structure (apiVersion, kind, spec with policies and targets) is accurate per official documentation.
- The circuit breaker state diagram (Closed -> Open -> Half-Open) correctly represents the standard circuit breaker pattern as implemented by Dapr.
