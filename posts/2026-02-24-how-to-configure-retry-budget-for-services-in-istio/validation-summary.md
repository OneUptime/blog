# Validation Summary: How to Configure Retry Budget for Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Envoy retries and retry budgets
- Envoy circuit breaking and outlier detection
- Kubernetes kubectl proxy inspection

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy circuit breaker API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats

## Issues Found
- The post described `connectionPool.http.maxRetries` as Envoy's retry budget mechanism. In current Istio, `maxRetries` is a fixed retry circuit breaker, while the actual retry budget is configured with `trafficPolicy.retryBudget.percent` and `minRetryConcurrency`. Replaced the `maxRetries` examples and explanations with `retryBudget`.
- The sizing guidance tied retry budget size directly to `http2MaxRequests`. Istio retry budgets are calculated as a percentage of active and pending requests, so the guidance was reworded to use `retryBudget.percent`.
- The examples used `networking.istio.io/v1beta1`. Updated them to the current documented `networking.istio.io/v1` API version.
- The first retry example did not clarify that `attempts: 3` means three retries after the initial request. Updated the explanation to match Istio's documented semantics.
- The retry backoff section described fixed 25ms and 50ms retry delays. Envoy uses fully jittered exponential backoff with a 25ms base interval, so this was corrected.
- The monitoring section said `upstream_rq_retry_overflow` only means the retry budget was exhausted. Envoy documents it as retries not attempted due to circuit breaking or retry budget exhaustion, so the description was corrected.
- The monitoring section did not mention Istio's default minimal Envoy stats collection. Added a note that `proxyStatsMatcher` may need to include `.*upstream_rq_retry.*`.

## Review Notes
- The VirtualService retry fields (`attempts`, `perTryTimeout`, `retryOn`) and disabling retries with `attempts: 0` are correct per Istio documentation.
- The outlier detection examples use current fields. `baseEjectionTime` is a minimum ejection duration and can increase for repeated ejections, so the prose now says at least 30 seconds.
