# Validation Summary: How to Build Load Shedding Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Load shedding and admission control
- Token bucket rate limiting
- Priority queues
- Adaptive concurrency limiting in Go
- Circuit breakers
- TypeScript
- Go
- Prometheus metrics and alerting rules
- HTTP 503 and Retry-After

## Sources Consulted
- TypeScript Handbook: Classes and parameter properties, https://www.typescriptlang.org/docs/handbook/2/classes.html
- Go Language Specification: select statements and channel operations, https://go.dev/ref/spec
- Prometheus documentation: Metric types, https://prometheus.io/docs/concepts/metric_types/
- Prometheus documentation: Alerting rules, https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus documentation: Querying basics and offset modifier, https://prometheus.io/docs/prometheus/latest/querying/basics/
- prom-client project documentation, https://github.com/siimon/prom-client
- RFC 9110: Retry-After and 503 semantics, https://datatracker.ietf.org/doc/html/rfc9110
- Netflix concurrency-limits project, https://github.com/Netflix/concurrency-limits
- Envoy adaptive concurrency filter documentation, https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/adaptive_concurrency_filter

## Issues Found
- The admission controller used a global `RequestPriority` enum name that can collide with DOM fetch priority types in TypeScript projects that include DOM libraries. Renamed it to `RequestPriorityLevel`.
- The admission controller treated a backend as full capacity whenever `healthy` was true and error rate was low, even if latency was above target. Updated the health condition to require latency within target before restoring full capacity.
- The admission controller could divide by a latency ratio below 1 during degraded health and accidentally raise capacity above `maxRPS`. Clamped the ratio to at least 1.
- The Go concurrency limiter updated its recorded limit when reducing capacity but did not drain already available semaphore permits, so it could continue admitting above the new limit. Updated the semaphore adjustment logic to add or remove available permits to match the new limit minus in-flight requests.
- The composite shedding diagram included a concurrency-check layer that was not implemented in the composite code. Updated the diagram to match the three implemented layers.
- The circuit breaker's half-open state limited successful completions rather than in-flight probe requests, allowing too many concurrent probes. Added half-open in-flight tracking and reopened the circuit on half-open failure.
- The test harness could produce `NaN` or `-Infinity` metrics when all requests were shed. Added empty-latency and zero-request guards.
- The Prometheus TypeScript metrics example used `Counter`, `Gauge`, and `Histogram` without importing them. Added the `prom-client` import.

## Review Notes
The standalone TypeScript examples were checked with `tsc` 5.9.3. The test harness was checked together with the composite shedder snippet it depends on. The local environment did not include `go` or `promtool`, so Go and Prometheus examples were reviewed against official documentation rather than compiled with those tools.
