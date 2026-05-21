# Validation Summary: How to Replace Application-Level Retry Logic with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Envoy retries and retry statistics
- Kubernetes kubectl
- Prometheus metrics
- Python tenacity
- Java Spring Retry
- Go HTTP client retry patterns

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy router retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post described `attempts` as possibly including the original request. Istio documents `attempts` as the number of retries allowed, with a maximum of `1 + attempts` upstream requests. Updated the explanation and timeout math accordingly.
- The post said Istio backoff cannot be configured. Current Istio supports `HTTPRetry.backoff` as the minimum duration used as the base interval for exponential backoff. Updated the wording to distinguish configuring the base backoff from fully customizing application-style retry behavior.
- The post described `retriable-status-codes` as configured separately without explaining the Istio-supported forms. Updated the wording to mention numeric status codes in `retryOn` and Envoy retry headers.
- The migration step said running application and Istio retries together is safe during a short transition. Updated this to warn that double retries can amplify traffic and should be monitored carefully.
- The retry budget section showed only outlier detection and connection pool limits. Added the documented `trafficPolicy.retryBudget` fields and clarified that retry budgets cap concurrent retries while outlier detection ejects failing hosts.
- The Prometheus example was labeled as retry metrics, but `istio_requests_total` is a standard request counter, not a dedicated retry counter. Updated the wording to describe it as request outcome telemetry and kept Envoy stats as the retry counters.

## Review Notes
- The snippets use `networking.istio.io/v1beta1`, which Istio says it has no current plans to discontinue, while encouraging users to transition to `networking.istio.io/v1`.
- The Python, Java, and Go snippets are illustrative and omit surrounding imports, types, and class/package scaffolding.
