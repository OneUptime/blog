# Validation Summary: How to Monitor Falco Alerts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Falco
- Falco Helm chart
- Falcosidekick and Falcosidekick UI
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- Alertmanager routing
- Kubernetes probes and kubectl logs

## Sources Consulted
- Falco metrics documentation: https://falco.org/docs/concepts/metrics/
- Falco default configuration (`falco.yaml`): https://github.com/falcosecurity/falco/blob/master/falco.yaml
- Falco Helm chart values and templates: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falcosidekick Prometheus output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/prometheus.md
- Falcosidekick metrics implementation: https://github.com/falcosecurity/falcosidekick/blob/master/stats_prometheus.go
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana panel visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- Falco's Prometheus endpoint was incomplete. Added `webserver.prometheus_metrics_enabled: true` and `metrics.rules_counters_enabled: true` because `/metrics` requires both metrics collection and the webserver Prometheus endpoint to be enabled.
- Helm values used the wrong nesting for the current Falco chart. Replaced `falco.metrics.enabled` with the chart-managed top-level `metrics.enabled`, `metrics.outputRule`, and `serviceMonitor.create` values.
- Several metric names were outdated or incorrect. Updated examples and PromQL to use current Falco metrics such as `falcosecurity_falco_rules_matches_total`, `falcosecurity_scap_n_evts_total`, and `falcosecurity_scap_n_drops_total`.
- The ServiceMonitor endpoint referenced `http-metrics`, but the Falco chart's metrics service uses the port name `metrics`. Updated the ServiceMonitor snippet.
- Dashboard and alerting examples used the wrong rule label name. Replaced `rule` with Falco's current `rule_name` label for native Falco metrics.
- The critical-alert PromQL matched `priority="Critical"`, but Falco's native rules metric exposes priority as a numeric label. Updated it to `priority="2"` for critical events.
- Falcosidekick output metrics were listed as non-existent `falco_outputs_*` metrics. Replaced them with `falcosecurity_falcosidekick_outputs_total` and updated the output-failure alert to match `status!="ok"`.
- Alertmanager routes used deprecated `match` syntax. Updated the example to use `matchers`.
- Grafana examples used the legacy `graph` panel type. Updated graph panels to `timeseries`.
- Log examples piped Falco logs to `jq` without stating the JSON-output prerequisite. Added that the commands assume `json_output: true`.

## Review Notes
The PromQL expressions are structurally correct for current Falco/Falcosidekick metrics, but real deployments may need label adjustments depending on whether alerts are counted through Falco's native metrics endpoint, Falcosidekick's event metrics, or both.
