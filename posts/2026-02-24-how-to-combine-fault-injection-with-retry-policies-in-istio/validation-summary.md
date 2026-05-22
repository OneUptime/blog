# Validation Summary: How to Combine Fault Injection with Retry Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio `VirtualService`
- Istio `DestinationRule`
- Istio `EnvoyFilter`
- Envoy HTTP fault injection filter
- Envoy retry policies and response flags
- Kubernetes `kubectl`
- Prometheus query API

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Traffic Management Problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy fault injection filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Envoy router retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy access log response flags reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The original post configured `fault` and `retries` on the same Istio `VirtualService` route. Current Istio documentation says retries and timeouts are not enabled when faults are enabled on the same client-side route. I changed the examples to keep retries in the client-side `VirtualService` and inject abort/delay faults on the upstream workload's inbound proxy with an `EnvoyFilter`.
- Updated Istio API examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` for `VirtualService` and `DestinationRule`.
- The original retry/fault sequence said Istio evaluates client-side fault injection before retries on the same route. That is misleading for current Istio because that configuration prevents retries from taking effect. I rewrote the sequence to describe the corrected client-retry plus upstream-fault setup.
- The original post said Istio does not natively support retry budgets. Current `DestinationRule` supports `trafficPolicy.retryBudget`, so I replaced that claim and added a valid retry budget example.
- The retry-on table understated Envoy behavior for `5xx` and `gateway-error`. I updated the descriptions to include no-response failures such as disconnects, resets, read timeouts, and connection failures where Envoy documents them.
- The load-impact explanation originally implied all retried attempts reached the application. With an inbound fault filter, aborts can happen in the upstream sidecar before the application receives the request, so I clarified the distinction between upstream proxy traffic and application traffic.

## Review Notes
YAML snippets were parsed successfully with PyYAML. The local environment did not have `ruby`, `istioctl`, or a Kubernetes/Istio cluster available, so validation was documentation-based rather than live cluster-based.
