# Validation Summary: How to Build Counter Metrics Design

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Prometheus counter metrics
- PromQL `rate()` and `increase()`
- Prometheus metric and label naming
- Node.js `prom-client`
- Express middleware
- Python `prometheus_client`

## Sources Consulted
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus metric and label naming: https://prometheus.io/docs/practices/naming/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus client library writing guidelines: https://prometheus.io/docs/instrumenting/writing_clientlibs/
- prom-client official repository documentation: https://github.com/siimon/prom-client
- Python prometheus_client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Node.js HTTP response `finish` event documentation: https://nodejs.org/api/http.html
- Express 5 API documentation: https://expressjs.com/en/api/

## Issues Found
- The post said to never query raw counter values and called raw values meaningless. Raw counter values can be useful as process-lifetime totals or for debugging, but `rate()` and `increase()` are the right tools for rates and time-windowed totals. Updated the wording to be less absolute.
- The counter-vs-gauge flowchart implied that a monotonically increasing value that does not reset on restart should not be a counter. Prometheus counters are still the correct type for monotonically increasing event totals; they may reset on restart. Updated the flowchart branch.
- The naming convention presented `<namespace>_<name>_<unit>_total` as universal, but Prometheus naming guidance only includes the unit suffix when a metric has a unit. Updated the guidance to allow unitless counters like `http_requests_total`.
- The Express middleware overrode `res.end`, which is brittle and harder to type correctly. Updated it to use the HTTP response `finish` event, which is the standard hook for recording status-code-aware response metrics after the response is sent.
- The decrementing-counter example said `counter.dec()` would throw an error. In TypeScript, `dec()` is not a supported Counter method, so the note was updated to describe it as unsupported.

## Review Notes
The examples intentionally use route templates and status-code classes to limit label cardinality. The fallback to `req.path` in the Express example can still create high cardinality if route matching is unavailable; production systems should normalize or explicitly label unmatched routes.
