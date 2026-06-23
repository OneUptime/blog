# Validation Summary: How to Configure Retries and Timeouts in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- VirtualService
- DestinationRule
- Prometheus metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Traffic Management documentation: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy router retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-on
- Envoy substitution formatter and response flags reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter

## Issues Found
- The post used `networking.istio.io/v1beta1` throughout the examples. Updated the snippets to the current `networking.istio.io/v1` API version shown in the current Istio reference.
- Several comments described `perTryTimeout` as applying only to retry attempts. Updated wording to clarify that it applies to each attempt, including the initial call and any retries.
- The retry and timeout interaction examples treated `attempts` as total attempts in a few places. Updated the formula and comments to reflect Istio's behavior: `attempts` is the number of retries, so the maximum possible upstream requests is `1 + attempts`.
- The `retryOn` default included `retriable-status-codes`, which is not listed as the current default in the VirtualService `HTTPRetry` reference. Corrected the default to `connect-failure,refused-stream,unavailable,cancelled`.
- The common retry conditions section claimed to show all available retry conditions. Changed it to describe common retry conditions because Envoy supports additional HTTP and gRPC retry policies.
- The exponential backoff section incorrectly said retry backoff can be influenced through `DestinationRule`. Replaced the example with a `VirtualService` retry policy using the `backoff` field.
- The header-based retry example said the service can set `x-envoy-retriable-header-names` in the response. Corrected this to explain that internal clients can send that request header to identify response header names that should trigger `retriable-headers` retries.
- The Prometheus retry queries used `response_flags=~".*RR.*"`, but Envoy has no generic `RR` response flag for "retried request." Replaced the retry queries with Envoy cluster retry metrics and kept `UT` for upstream request timeout response flag monitoring.

## Review Notes
The examples are syntactically consistent with current Istio resource fields. The monitoring metric names for Envoy cluster stats may vary depending on the Prometheus scraping and stats inclusion configuration used in a particular Istio installation.
