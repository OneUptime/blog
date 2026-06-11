# Validation Summary: How to Create Prometheus Label Best Practices

## Status
validated

## Post Type
Guide / Best Practices Tutorial

## Technologies Covered
- Prometheus (metrics, labels, cardinality)
- PromQL (alerting rules, queries)
- Go (`github.com/prometheus/client_golang` library: `prometheus`, `promauto`)
- Python (illustrative metric/label syntax examples)
- YAML (Prometheus alerting rule configuration)
- Mermaid (diagrams)

## Sources Consulted
- Prometheus naming best practices: https://prometheus.io/docs/practices/naming/
- Prometheus instrumentation best practices: https://prometheus.io/docs/practices/instrumentation/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus data model (label naming, reserved `__` prefix): https://prometheus.io/docs/concepts/data_model/
- Prometheus `client_golang` godoc: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus and .../promauto
- PromQL operators and aggregation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Go `fmt` package: https://pkg.go.dev/fmt

## Issues Found
1. **Missing `fmt` import in the "Practical Implementation Example" Go code block.** The helper function `StatusClass(code int) string` calls `fmt.Sprintf("%dxx", code/100)`, but the `import` block only included `prometheus` and `promauto` — so the file would not compile. Added `"fmt"` to the import group. This is a real correctness bug, not a style change.

## Review Notes
- The `client_golang` API surface used in the post (`promauto.NewCounterVec`, `NewHistogramVec`, `NewGaugeVec`, `prometheus.CounterOpts` / `HistogramOpts` / `GaugeOpts`, `prometheus.DefBuckets`, `.WithLabelValues(...).Inc()`) matches the current library and is not deprecated.
- The claim that Prometheus reserves the `__` (double-underscore) prefix for internal label names is correct per the Prometheus data model documentation.
- The snake_case label/metric naming guidance aligns with the official Prometheus naming best-practices page.
- The cardinality formula (multiplicative across label dimensions) and the cardinality thresholds in the table are reasonable rules of thumb; they are guidelines, not hard Prometheus limits — readers should treat them as orientation rather than authoritative caps.
- The PromQL alerting rules use `count by (__name__) ({__name__=~".+"})`, which is syntactically valid but is an extremely heavy query in production (it touches every series on every evaluation). It works as an illustrative example; in real deployments operators typically prefer `prometheus_tsdb_head_series` or per-job recording rules to track cardinality more cheaply. Left as-is since the post is intentionally pedagogical.
- The `CardinalityExplosion` alert subtracts the current per-metric count from the same count offset by 1h; for metrics that did not exist 1h ago, the subtraction yields no result rather than a large positive value. This is acceptable behavior for the example but worth noting for readers who adapt it.
- The Unix timestamp `1738234200` shown in the "good" gauge example corresponds to 2025-01-30 ~13:30 UTC, not the 2026-01-30 shown in the preceding "bad" label example. Since the two snippets are independent illustrations of the anti-pattern vs. the fix, the mismatch is not a technical error and was left unchanged.
