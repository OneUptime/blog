# Validation Summary: How to Build Grafana Alert Rules Advanced

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Alerting
- Grafana alert rule file provisioning
- Grafana server-side expressions
- Grafana alert annotation templates
- Prometheus PromQL
- Prometheus recording rules

## Sources Consulted
- Grafana file provisioning for alerting resources: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana alert rule evaluation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/
- Grafana no-data and error states: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/
- Grafana expression queries: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/expression-queries/
- Grafana annotation and label template reference: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana alerting template language: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/language/
- Grafana labels and annotations: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/annotation-label/
- Grafana inhibition rules: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/inhibition-rules/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The CPU usage PromQL example averaged non-idle CPU modes directly, which does not correctly compute total CPU usage. Changed it to compute usage from idle CPU time: `100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))`.
- The no-data state list mixed provisioning values with the UI-only "Keep last state" wording. Kept the provisioning values as `NoData`, `Alerting`, and `OK`, and clarified that "Keep last state" is selected in the Grafana UI.
- The heartbeat PromQL expression returned no series when the service was healthy, which would interact badly with `noDataState: Alerting`. Changed it to return `0` when healthy and `1` when missing or down.
- Several annotation templates referenced `$values.B` and `$values.E` directly. Grafana's alert rule template reference exposes numeric values through `.Value`, so these were changed to `$values.B.Value` and `$values.E.Value`.
- The annotation examples used unavailable or inappropriate template data/functions, including `.Evaluation.Duration`, `.EvalTime`, `$labels.alertname`, `$labels.severity`, and string-case helpers. Replaced them with documented alert rule template variables and Go template functions.
- The dynamic runbook URL used unsupported string-case handling and did not URL-escape the query parameter correctly. Changed it to use documented label access and `urlquery`.
- The compound-condition PromQL examples produced vectors with labels that would not reliably join in Grafana math expressions. Added `sum by (job)` aggregation for request rates and `sum by (job, le)` for classic histogram quantiles.
- The alert dependency guidance implied notification policies provide suppression. Changed it to point to inhibition rules, which are the Grafana/Alertmanager mechanism for suppressing dependent alerts.
- The recording rule examples used a less clear aggregation form. Rewrote them as `avg by (instance) (...)` to match standard PromQL examples.

## Review Notes
The snippets are illustrative and assume Grafana-managed alert rules with a Prometheus data source UID named `prometheus`. Some provisioning examples remain partial snippets rather than full standalone provisioning files, which is acceptable for the guide but should be expanded if the post is later converted into a copy-paste deployment reference.
