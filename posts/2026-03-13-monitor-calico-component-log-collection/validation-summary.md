# Validation Summary: How to Monitor Calico Component Log Collection

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Fluent Bit
- Prometheus and Prometheus Operator
- Grafana
- Grafana Loki and logcli
- Bash and jq

## Sources Consulted
- Fluent Bit official monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Prometheus official alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus official query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- PrometheusRule API documentation for monitoring.coreos.com/v1: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1
- Grafana official dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana Loki official logcli documentation: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- Kubernetes official kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes official kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes official JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The Prometheus and Grafana snippets used `fluentbit_output_records_total`, which is not the documented Fluent Bit output metric for successfully forwarded records. Updated the snippets to use `fluentbit_output_proc_records_total`.
- The Calico log silence alert used `absent()` by itself, which only detects missing time series and would not detect a present counter that stopped increasing. Updated the alert to check for a zero 15-minute record rate and also handle an absent metric.
- The Grafana dashboard queried `fluentbit_output_records_total` with a `tag` label, but Fluent Bit output metrics are documented with a `name` label for the output instance, not a Kubernetes log tag label. Updated the panel to query Calico-named output instances and use `{{name}}` in the legend.
- The Grafana panel type used `graph`, an older visualization type. Updated it to `timeseries`, the current Grafana time series visualization type.
- The Loki example used `--limit=1` against all calico-node streams, which returns one latest log line overall rather than the latest timestamp for each pod. Updated it to iterate over calico-node pods and query each pod stream separately.
- The Loki example omitted `--quiet`, so logcli metadata could be mixed with JSON output and break the `jq` pipeline. Added `--quiet`.

## Review Notes
- The Fluent Bit Prometheus examples assume Calico logs are routed through output instances whose Fluent Bit `name` or alias includes `calico`. If a deployment uses a shared output for all Kubernetes logs, Fluent Bit output metrics alone cannot distinguish Calico records; Loki or another log backend query is needed for per-component coverage.
