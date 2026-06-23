# Validation Summary: How to Fix Prometheus Job Label Breaking Grafana Dashboards

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Prometheus scrape configuration
- Prometheus relabeling and metric relabeling
- Prometheus federation
- PromQL vector matching
- Grafana dashboard variables

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/

## Issues Found
- The Kubernetes relabeling example showed two alternative `job` relabeling rules as active rules in the same config. Because relabeling rules are processed sequentially, the namespace/name rule would overwrite the app-label rule. I commented the alternative rule so the example is copy-safe while preserving the intended option.
- The selective job-label preservation example used `relabel_configs` with `source_labels: [job]`, but scrape-time relabeling cannot read labels from scraped metric samples. I changed it to `metric_relabel_configs` using `exported_job`, which is the label Prometheus creates when `honor_labels` is false and a scraped metric conflicts with the server-side `job` label.
- The federation example used `/federate` without a `match[]` parameter. Prometheus federation requires at least one `match[]` selector, so I added a `params` block with a representative selector.

## Review Notes
Grafana's `label_values(metric, label)` classic variable syntax is still common and supported for existing dashboards, but Grafana's current documentation marks the classic query type as deprecated in favor of the dedicated Label values query type. The post remains technically valid, but future updates could modernize the Grafana variable examples.
