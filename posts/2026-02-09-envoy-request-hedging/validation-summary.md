# Validation Summary: How to Use Envoy Request Hedging for Latency Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy route configuration
- Envoy request hedging and retry policies
- Envoy retry host and retry priority plugins
- Envoy cluster circuit breakers and retry budgets
- Envoy admin statistics and Prometheus metrics
- Flask / Python backend examples
- wrk load testing

## Sources Consulted
- Envoy HTTP routing architecture and request hedging: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing.html
- Envoy route components v3 API, including `HedgePolicy`, `RetryPolicy`, virtual host headers, and route headers: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy router filter headers, including `x-envoy-attempt-count`, `x-envoy-is-timeout-retry`, and `x-envoy-hedge-on-per-try-timeout`: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy retry plugin configuration and previous-host / previous-priority examples: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_connection_management.html
- Envoy previous hosts retry predicate API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/retry/host/previous_hosts/v3/previous_hosts.proto
- Envoy previous priorities retry selector API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/retry/priority/previous_priorities/v3/previous_priorities_config.proto
- Envoy cluster circuit breaker and retry budget API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto.html
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy upstream HTTP protocol options API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto.html
- Flask quickstart, response return types: https://flask.palletsprojects.com/en/stable/quickstart/
- Python `random.choices` documentation: https://docs.python.org/3/library/random.html
- wrk command-line documentation: https://github.com/wg/wrk

## Issues Found
- The original post described Envoy hedging as an arbitrary configurable duplicate-request delay and said remaining in-flight requests are cancelled. Updated the explanation to match Envoy's current behavior: hedging is performed on per-try timeout, the original timed-out attempt is not reset, and the first acceptable response according to retry policy is returned.
- The `hedge_policy` examples used unsupported fields: `initial_requests` and `additional_request_chance`. Removed those fields because current Envoy v3 `HedgePolicy` only exposes `hedge_on_per_try_timeout`.
- The examples implied a hedged request would automatically go to a different backend. Added `envoy.retry_host_predicates.previous_hosts` where that behavior is desired, since retries otherwise use normal host selection.
- The advanced examples had a hedging policy without a retry condition in one route. Added `retry_on` so hedging can take effect with a retry policy.
- The request-priority section implied cluster priority levels alone reserve lower-priority hosts for hedged requests. Added the `envoy.retry_priorities.previous_priorities` retry priority plugin and clarified how priority selection applies to retry/hedged attempts.
- The monitoring section used nonexistent or misleading hedge-specific wording and included `upstream_rq_per_try_timeout`, which Envoy documents as not counting per-try timeouts when request hedging is enabled. Replaced it with retry and timeout metrics that are applicable to hedged retries.
- The Prometheus examples used inconsistent labels and described retry metrics as hedge-only metrics. Updated labels to Envoy's default Prometheus tag names and renamed the queries to retry efficiency / added upstream load.
- The header example put `include_request_attempt_count` and `include_is_timeout_retry_header` at the wrong YAML level and used an incorrect `%RESP_FLAGS%` value for `X-Envoy-Expected-Rq-Timeout-Ms`. Moved the include flags to virtual host configuration and used Envoy's built-in `x-envoy-attempt-count` and `x-envoy-is-timeout-retry` headers.
- The primary cluster example used deprecated top-level upstream HTTP protocol option fields. Replaced them with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The Flask backend example referenced an undefined `db` object. Replaced it with a placeholder dictionary value so the example remains syntactically runnable while still indicating where a database query belongs.

## Review Notes
No Envoy binary was available in the local environment, so the full Envoy bootstrap was reviewed against official API documentation rather than validated with `envoy --mode validate`.
