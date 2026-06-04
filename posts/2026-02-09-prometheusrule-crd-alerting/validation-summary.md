# Validation Summary: How to Use PrometheusRule CRD to Define Recording and Alerting Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus Operator
- PrometheusRule CRD
- Kubernetes
- PromQL
- promtool
- kubectl
- jq

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator alerting guide: https://prometheus-operator.dev/docs/developer/alerting/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The memory usage alert divided raw cAdvisor series directly, which can fail to match series reliably and can alert on containers without memory limits. Updated the expression to aggregate by namespace, pod, and container, and require a positive memory limit.
- The alert component description said alert names must be unique within a group. Prometheus requires alert names to be valid label values, and duplicate-rule linting is a separate concern. Updated the wording to say the name should be distinctive.
- The CPU usage alerts compared CPU-seconds rate values to 0.8 and 0.95 but described them as 80% and 95%. `rate(container_cpu_usage_seconds_total[5m])` returns CPU cores, so the examples now aggregate by container and describe thresholds as CPU cores.
- The frequent restart alert used `rate(...[1h]) > 0.1`, which is a per-second restart rate, while the annotation described a restart count over the last hour. Changed the expression to `increase(...[1h]) > 5`.
- The deployment replica mismatch alert used a boolean inequality while the annotation implied `$value` was the available replica count. Changed the expression to calculate missing available replicas.
- The slow SLO burn-rate comment said 10% of the error budget in 6 hours, but a 6x burn rate over 6 hours consumes 5% of a 30-day budget. Updated the comment to 5%.
- The promtool validation command extracted `.spec` with kubectl JSONPath, which is less reliable for producing a valid rule file. Changed it to output JSON and use `jq '.spec'`, which is valid input for `promtool check rules`.

## Review Notes
All YAML snippets were parsed successfully with PyYAML. `promtool` was not installed in the workspace, so local Prometheus rule parser validation could not be executed. The external `grafana.example.com` and `runbooks.example.com` URLs are documentation placeholders and are technically plausible.
