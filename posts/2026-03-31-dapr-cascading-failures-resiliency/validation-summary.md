# Validation Summary: How to Handle Cascading Failures with Dapr Resiliency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Resiliency policies (timeouts, circuit breakers)
- Dapr JavaScript SDK (@dapr/dapr) — service invocation and pub/sub APIs
- Kubernetes (kubectl for log inspection)
- Prometheus metrics endpoint

## Sources Consulted
- Dapr Resiliency Overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies (timeouts, retries, circuit breakers) — https://docs.dapr.io/operations/resiliency/policies/
- Dapr JavaScript SDK documentation — https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Metrics documentation — https://docs.dapr.io/operations/observability/metrics/

## Issues Found
1. **Typo in function name (line 91):** `isCiricuitOpenError` was misspelled ("Ciricuit" instead of "Circuit"). Fixed to `isCircuitOpenError`.

## Review Notes
- The Resiliency YAML structure (`apiVersion: dapr.io/v1alpha1`, `kind: Resiliency`), policy fields (`timeouts`, `circuitBreakers`), and target structure (`targets.apps.<appId>`) are all correct per the official Dapr documentation.
- Circuit breaker fields (`maxRequests`, `interval`, `timeout`, `trip`) and the `consecutiveFailures` CEL expression variable are accurate. The post uses `>=` while official examples tend to use `>` — both are valid CEL; the difference is whether the breaker trips on the Nth or (N+1)th failure. Not an error, just a style choice.
- The Dapr JS SDK methods `daprClient.invoker.invoke(appId, method, HttpMethod.POST, data)` and `daprClient.pubsub.publish(pubsubName, topic, data)` are correct for the current SDK API.
- The `checkoutTimeout: 5s` policy is defined but never assigned to a target. This is not an error (unused policy definitions are valid), but readers may wonder about it.
- Metric names `dapr_resiliency_count` and `dapr_http_client_roundtrip_latency` are not explicitly documented in Dapr's official metrics reference, though they may exist in the runtime. The default metrics port 9090 and the `kubectl logs` approach for daprd sidecar logs are correct.
- The Bulkhead section describes failure isolation via separate resiliency policies rather than a formal bulkhead primitive (Dapr does not have a first-class bulkhead policy). The conceptual explanation is reasonable, though readers should understand this is policy-level isolation, not connection-pool-level bulkheading.
