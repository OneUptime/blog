# Validation Summary: How to Build Business Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Node.js
- prom-client
- Prometheus
- PromQL
- Prometheus alerting rules
- Express.js
- React Hooks
- Mermaid diagrams
- YAML

## Sources Consulted
- prom-client README and API documentation: https://github.com/siimon/prom-client
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Express routing guide: https://expressjs.com/en/guide/routing/
- React useEffect reference: https://react.dev/reference/react/useEffect

## Issues Found
- The "Average order value by product category" PromQL example used `histogram_quantile(0.5, ...)`, which calculates a median/50th percentile, not an average. Changed the query to divide `business_order_value_cents_sum` by `business_order_value_cents_count`, matching Prometheus histogram guidance for averages.
- The `RevenueBelowBaseline` alert compared revenue in cents while the annotation described dollars. Changed the alert expression to convert cents per minute to dollars per minute before comparing to `$500`.
- The Pearson correlation helper did not guard against empty or mismatched input arrays. Added a guard that returns `0` when the series cannot be compared safely.

## Review Notes
- The prom-client metric constructors, `registers` usage, `Counter.inc`, `Histogram.observe`, `Gauge.set`, and `Registry.metrics()` usage match the prom-client API.
- The histogram percentile queries correctly preserve the `le` label for classic Prometheus histograms.
- The conversion-rate examples use event counts rather than unique users or sessions. This is technically valid for a metrics tutorial, but production funnel analysis may need deduplication depending on the business definition.
- The Express snippet assumes session middleware and TypeScript request typing are configured elsewhere.
