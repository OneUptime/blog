# Validation Summary: How to Configure Per-Retry Timeout in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio HTTP retry policy
- Envoy route timeout and per-try timeout behavior
- Kubernetes kubectl commands
- Prometheus / PromQL
- gRPC retry policy behavior

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio request timeout task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio traffic management problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy router filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html

## Issues Found
- The retry timing examples treated retries as if they started immediately at exact second boundaries. Istio documents automatic retry intervals/backoff, and Envoy counts retry time inside the outer route timeout, so I updated the timing examples and timeout sizing guidance to include expected retry backoff.
- The section about omitting `perTryTimeout` said each retry attempt uses the route timeout as its timeout. Istio documents that `perTryTimeout` defaults to the route timeout value, which effectively means no separate per-attempt cap while the route timeout remains the outer request budget. I reworded that explanation.
- The testing example combined Istio fault injection, retries, and timeout in the same `VirtualService`. Istio documents that this combination is not supported and the retry policy will not take effect as expected. I changed the section to test against an upstream endpoint that delays its own responses instead of using Istio fault injection on the same route.

## Review Notes
- The examples use `networking.istio.io/v1beta1`, which is still served for VirtualService, while current Istio documentation generally shows `networking.istio.io/v1`.
- The examples intentionally keep retry policies scoped to illustrative cases. In production, retry conditions should be chosen carefully for request idempotency and application semantics.
