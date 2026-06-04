# Validation Summary: How to Implement Prometheus Metric Relabeling to Drop High-Cardinality Labels

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus metric relabeling
- Prometheus recording rules and alerting rules
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Kubernetes
- promtool

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus data model documentation: https://prometheus.io/docs/concepts/data_model/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus unit testing for rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus promtool command documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described metric relabeling as a way to aggregate labels. Metric relabeling can drop or rewrite labels before ingestion, but aggregation should be done with PromQL or recording rules. Updated the wording to avoid implying that metric relabeling sums or aggregates samples.
- The status-code and path examples dropped or rewrote labels in ways that could collapse multiple scraped samples into the same metric name and label set. Updated the examples to keep the original status label when adding `status_class` and added a warning to use recording rules if a rewrite would create duplicate series.
- The conditional label dropping example was invalid. `labeldrop` matches label names and cannot be made conditional with `sourceLabels`; one snippet also used duplicate YAML keys and the Prometheus `target_label` field name inside a Prometheus Operator `metricRelabelings` block. Replaced the section with recording-rule examples for metric-specific aggregation.
- The "top N and other" recording rule used `label_replace` in a way that retained the original high-cardinality `endpoint` label on the "other" series instead of actually aggregating everything else. Replaced it with top-k recording plus a summed `endpoint: other` rule.
- The comprehensive example dropped `status_code` after adding `status_class`, which could create duplicate series. Removed that label drop and clarified that path normalization must preserve unique series.
- The testing section used `promtool test rules` to test a relabel config, but that command is for rule unit tests. Replaced it with a `promtool check config` example using a minimal Prometheus config containing `metric_relabel_configs`.
- The post said to verify metric relabeling on the Prometheus targets page. The targets page is useful for target relabeling, but post-scrape metric labels should be checked by querying metrics or using the series API. Updated the verification guidance.

## Review Notes
`promtool` was not installed in the local environment, so I could not execute the sample config check. The corrected command and configuration format were verified against the official Prometheus documentation.
