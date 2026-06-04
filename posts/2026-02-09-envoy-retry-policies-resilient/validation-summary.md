# Validation Summary: How to use Envoy retry policies for resilient communication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Envoy Proxy
- Envoy HTTP route retry policies
- Envoy circuit breakers and retry budgets
- Envoy request hedging
- Envoy retry metrics
- YAML configuration
- Prometheus metrics

## Sources Consulted
- Envoy Router filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy HTTP route components v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy Circuit breakers v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto.html
- Envoy Circuit breaking configuration: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers
- Envoy Cluster manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy Previous priorities retry selector: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/retry/priority/previous_priorities/v3/previous_priorities_config.proto

## Issues Found
- The per-try timeout explanation incorrectly calculated total timeout as `3 retries x 2 seconds`. Changed it to explain that `num_retries: 3` allows the initial attempt plus up to 3 retries, subject to the route's overall timeout and backoff.
- The retry budget section used `max_retries`, which is a static retry circuit breaker, not a retry budget. Replaced it with `retry_budget` using `budget_percent` and `min_retry_concurrency`.
- The exponential backoff explanation described deterministic 100ms, 200ms, and 400ms delays. Updated it to Envoy's fully jittered exponential backoff behavior.
- The hedged requests example used unsupported `initial_requests` and `additional_request_chance` fields. Replaced it with the current `hedge_on_per_try_timeout` configuration and the required retry policy context.
- The retry priority explanation incorrectly framed the plugin as request-priority-based logic. Updated it to describe spreading retries across upstream priorities by excluding previously attempted priorities.
- The rate limited retries section used ordinary `retry_back_off`, which does not consume rate-limit reset headers. Replaced it with `rate_limited_retry_back_off` using `Retry-After` and `X-RateLimit-Reset`.
- The method-specific retry example used deprecated `exact_match` for header matching. Updated it to the current `string_match.exact` form.

## Review Notes
The metric names shown are valid as Envoy cluster statistics once exported to Prometheus with Envoy's usual stat-name conversion. The post remains version-neutral, so future reviews should re-check field names against the Envoy v3 API documentation.
