# Validation Summary: Limit ServiceMonitor Cardinality with Sample, Target, and Label Limits

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes `ServiceMonitor` custom resources
- YAML
- PromQL
- Metric and target relabeling
- Metrics cardinality and scrape guardrails

## Sources Consulted

- [Prometheus Operator `ServiceMonitorSpec` API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator `CommonPrometheusFields` API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.CommonPrometheusFields)
- [Prometheus Operator configuration-generator limit logic](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/promcfg.go#L2250-L2268)
- [Prometheus scrape configuration and scrape-limit semantics](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus metric relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus automatically generated target and scrape metrics](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus PromQL query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus scrape-pool implementation](https://github.com/prometheus/prometheus/blob/ee1c94eb6f548967b58bdcbe6e9d9b28427b07bc/scrape/scrape.go#L570-L595)
- [Prometheus 2.21.0 changelog](https://github.com/prometheus/prometheus/blob/v2.21.0/CHANGELOG.md)
- [Prometheus 2.27.0 changelog](https://github.com/prometheus/prometheus/blob/v2.27.0/CHANGELOG.md)
- [Prometheus 2.28.0 changelog](https://github.com/prometheus/prometheus/blob/v2.28.0/CHANGELOG.md)

## Issues Found

- The post implied that subtracting the two independent seven-day `max_over_time` results shows how many samples metric relabeling removed. Those maxima can occur on different scrapes. Changed the text to require comparing the two gauges at the same scrape timestamp and to warn against subtracting the independent maxima.
- The `targetLimit` explanation did not make its all-or-nothing behavior explicit, and a later sentence referred to repeatedly failing only "excess targets." Prometheus applies the target-limit error to every target loop in the over-limit scrape pool. Changed both passages to state that every target in the pool fails and none are scraped while it is over the limit.
- The enforced fields were described as cluster-level settings. They belong to an individual `Prometheus` or `PrometheusAgent` custom resource and affect the scrape objects selected into that instance's configuration. Changed the scope description to instance-wide.
- The post stated that an enforced value of zero means no upstream limit. In the Operator, zero disables that enforced ceiling but does not erase a positive per-monitor or Prometheus-level global limit. Corrected the zero-value explanation and clarified that Prometheus is unlimited by default only when all applicable limits are omitted or zero.
- The PromQL examples assumed that `job="checkout"` follows from the shown ServiceMonitor. A ServiceMonitor's name does not set the final `job` label; by default, the selected Service's name does, unless `jobLabel` selects another Service label. Added a short instruction to substitute the actual target label value.

## Review Notes

- Both YAML snippets parse successfully and use current Prometheus Operator field names and placement.
- The documented version floors are correct: Prometheus 2.21.0 for `targetLimit`, 2.27.0 for the label count and length limits, and 2.28.0 for `bodySizeLimit`.
- The sample and label limits are correctly described as post-metric-relabeling, whole-scrape failure controls rather than truncation controls. Label lengths are correctly described as byte lengths.
- Upstream Prometheus still documents `target_limit` and `body_size_limit` as experimental.
- Each displayed `max_over_time` query returns a maximum per matching target series, which is appropriate for a per-target scrape limit; it is not a single job-wide aggregate.
- Internally, `label_limit` counts the metric-name label (`__name__`) as part of the final label set. This is a useful sizing caveat but does not make the post's documented definition incorrect.
- All external documentation URLs in the post returned HTTP 200, and their fragments resolved to the intended sections.
