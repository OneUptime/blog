# Validation Summary: How to Implement Prometheus Counter Best Practices

## Status
validated

## Post Type
Tutorial / Best practices guide

## Technologies Covered
- Prometheus (metric types, counter semantics, reset handling)
- PromQL (`rate()`, `increase()`, `irate()`, `topk()`, `sum()`)
- Prometheus Go client library (`prometheus/client_golang`, `promauto`, `promhttp`)
- Prometheus Python client (`prometheus_client`)
- Prometheus Node.js client (`prom-client`)
- Prometheus alerting rules (YAML format)
- Express.js (middleware example)

## Sources Consulted
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/#counter
- Prometheus metric & label naming guide: https://prometheus.io/docs/practices/naming/
- Prometheus instrumentation best practices: https://prometheus.io/docs/practices/instrumentation/
- PromQL functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/ (`rate`, `irate`, `increase`)
- `prometheus/client_golang` GoDoc: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus (NewCounterVec, CounterOpts, WithLabelValues)
- `prometheus/client_golang/promauto` GoDoc: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- `prometheus/client_golang/promhttp` GoDoc: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp (Handler)
- Python `prometheus_client` docs: https://prometheus.github.io/client_python/ (Counter, start_http_server, `.labels().inc()`)
- Node.js `prom-client` README: https://github.com/siimon/prom-client (Counter, `labels(...)` accepting both positional and object syntax)
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Unused `time` import in the "Putting It All Together" Go example.** The `import` block included `"time"` but no `time.*` symbol was referenced in the example, which would produce the Go compile error `imported and not used: time`. Removed `"time"` from the import list so the example compiles as written. The earlier "Counter for Retry Tracking" snippet correctly uses `time.Sleep` / `time.Second` / `time.Duration` and is shown without imports (acceptable for a snippet), so no change was needed there.

## Review Notes
- The semantics described for counters (monotonic, resets to 0 on restart, raw values rarely useful) align with the Prometheus docs.
- The reset-handling explanation in section 5 is an accurate simplification of how `rate()`/`increase()` treat a drop in value as a reset and add the post-reset value as the increase from the reset point. Real Prometheus rate math also extrapolates to the boundaries of the lookback window, but that nuance is beyond the scope of an introductory best-practices post.
- The "All counters MUST end with `_total`" wording is stronger than what Prometheus client libraries technically enforce, but it matches the official naming practice and OpenMetrics convention, so it is appropriate guidance.
- The `prom-client` Node.js example uses the object form of `labels({ method, status, endpoint })`. Both positional (`labels('GET', '200', '/api/users')`) and object forms are supported by current `prom-client` versions, so this is correct.
- The "at least 4x your scrape interval" rule-of-thumb for `rate()` windows is a common community recommendation; Prometheus strictly requires only two samples in the window, but 4x provides a safer margin against missed scrapes and is reasonable advice.
- The post does not discuss the Prometheus base-unit naming guidance (seconds, bytes, etc.) in the naming section, which is an omission rather than an error. Could be added in a future revision.
- The Node.js, Python, and Go API calls (`NewCounterVec`, `CounterOpts`, `WithLabelValues`, `promhttp.Handler()`, `Counter(...).labels(...).inc()`, `client.register.metrics()`, `client.register.contentType`) are all current and non-deprecated.
- PromQL queries, alert rule structure (`groups` / `rules` / `alert` / `expr` / `for` / `labels` / `annotations`), and template functions like `humanizePercentage` are correct.
