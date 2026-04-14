# Validation Summary: How to Apply Resiliency Policies to State Management in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — resiliency feature
- Dapr Python SDK (`dapr-client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Redis (as example state store)
- Kubernetes (for log monitoring)
- Prometheus (for metrics monitoring)
- YAML (resiliency spec configuration)

## Sources Consulted
- [Dapr Resiliency Overview](https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- [Dapr Resiliency Targets](https://docs.dapr.io/operations/resiliency/targets/)
- [Dapr Retry Resiliency Policies](https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/)
- [Dapr Default Resiliency Policies](https://docs.dapr.io/operations/resiliency/policies/default-policies/)
- [Dapr Resiliency Spec / Schema Reference](https://docs.dapr.io/reference/resource-specs/resiliency-schema/)
- [Dapr Circuit Breaker Policies](https://docs.dapr.io/operations/resiliency/policies/)
- [Dapr State Management Quickstart with Resiliency](https://docs.dapr.io/getting-started/quickstarts/resiliency/resiliency-state-quickstart/)
- [Dapr State Management How-To (Save and Get State)](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/)
- [Dapr JavaScript Client SDK](https://docs.dapr.io/developing-applications/sdks/js/js-client/)
- [Dapr Python Client SDK](https://docs.dapr.io/developing-applications/sdks/python/python-client/)
- [Dapr GitHub — resiliency test data](https://github.com/dapr/dapr/blob/master/pkg/resiliency/testdata/resiliency.yaml)
- [Dapr GitHub Issue #5981 — Expose additional exponential retry config values](https://github.com/dapr/dapr/issues/5981)

## Issues Found
No technical issues found.

## Review Notes
- The JavaScript code example imports `HttpMethod` from `@dapr/dapr` but does not use it in the state management code shown. This is not a technical error (the export exists), but readers may wonder why it is imported. `HttpMethod` is used for service invocation, not state operations.
- The `await` calls in the JavaScript examples assume an async context, which is standard for code snippets but worth noting for beginners.
- The exponential retry policy fields (`initialInterval`, `multiplier`, `randomizationFactor`) were verified as documented configurable fields, with defaults of 500ms, 1.5, and 0.5 respectively.
- The `default` component target under `targets.components` is supported by the Dapr runtime (confirmed via Dapr source test data), though the official documentation more prominently documents the reserved keyword approach (e.g., `DefaultComponentOutboundRetryPolicy`) for setting default policies.
- The Prometheus metrics command (`curl http://localhost:9090/metrics`) targets the Dapr sidecar's metrics endpoint directly (port 9090 is the default metrics port), not the Prometheus server itself. The comment "Prometheus metrics" refers to the metrics format, which is correct.
