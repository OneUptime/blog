# Validation Summary: How to Add Custom Metrics to Node.js Applications with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Prometheus (`prom-client` official client library)
- Express.js
- Prometheus Pushgateway
- Prometheus Operator (ServiceMonitor CRD)
- Kubernetes

## Sources Consulted
- prom-client official README — https://github.com/siimon/prom-client/blob/master/README.md
- prom-client Pushgateway source — https://github.com/siimon/prom-client/blob/master/lib/pushgateway.js
- prom-client TypeScript definitions — https://github.com/siimon/prom-client/blob/master/index.d.ts
- prom-client Pushgateway docs (15.1.0) — https://tessl.io/registry/tessl/npm-prom-client/15.1.0/files/docs/pushgateway.md
- Prometheus naming/instrumentation best practices — https://prometheus.io/docs/practices/naming/
- Prometheus Operator ServiceMonitor — https://github.com/prometheus-operator/prometheus-operator

## Issues Found
No technical issues found.

The following API usages were verified against current `prom-client` (v15.x) documentation and all are correct:

- `client.collectDefaultMetrics({ register, prefix, gcDurationBuckets })` — all options are valid and current.
- `new client.Registry()`, `register.contentType`, and `await register.metrics()` (async, returns `Promise<string>`) — correct.
- `Counter`, `Gauge`, `Histogram`, and `Summary` constructors with `name`, `help`, `labelNames`, and `registers: [register]` — correct.
- `counter.inc(labels)`, `gauge.set(labels, value)`, `gauge.inc()/dec()`, `histogram.observe(labels, value)` — correct signatures.
- `histogram.startTimer(labels)` returning a function that accepts additional labels when invoked (e.g. `timer({ status: 'success' })`) — correct; labels are merged.
- `Summary` options `percentiles`, `maxAgeSeconds`, `ageBuckets` — correct.
- `new client.Pushgateway(url, options, register)` — the three-argument form with a custom registry as the third argument is correct (verified against source: defaults to global registry when omitted).
- `gateway.pushAdd({ jobName })` returning a Promise — correct.
- `process.hrtime.bigint()` for high-resolution nanosecond timing — correct.

## Review Notes
- The conceptual explanations are accurate: counters monotonic, gauges up/down, histograms bucketed (server-side aggregatable percentiles), summaries with client-side quantiles that cannot be aggregated across instances. The note recommending histograms over summaries for aggregation is correct.
- The naming-convention guidance (snake_case, `_total` for counters, unit suffixes like `_seconds`/`_bytes`) aligns with the official Prometheus naming best practices.
- The high-cardinality label warning (avoid `user_id`/`request_id`) is accurate and matches Prometheus guidance.
- Minor non-blocking observation: the "Separate Metrics Port" example exposes app metrics on port `9091`, which is the Pushgateway's conventional default port (the comment correctly notes avoiding `9090`, Prometheus's default). This is not incorrect, but `9091` could be confused with a co-located Pushgateway in some setups. Left as-is since it is not a technical error.
- The `value !== undefined ? 'hit' : 'miss'` cache-hit logic is reasonable, though caches that legitimately store `undefined`/`null` values would need a different sentinel; acceptable as illustrative code.
