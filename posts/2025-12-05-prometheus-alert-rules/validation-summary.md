# Validation Summary: How to Configure Alert Rules in Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (alerting rules, recording rules, PromQL)
- Alertmanager (routing, receivers, inhibition rules)
- promtool (rule syntax validation and unit testing)
- node_exporter / kube-state-metrics / kubelet metrics
- Kubernetes monitoring patterns
- Go templating (alert annotations and Alertmanager templates)

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus configuration / rule_files & alerting: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation (route, matchers, inhibit_rules, source_matchers/target_matchers): https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager example config: https://github.com/prometheus/alertmanager/blob/main/doc/examples/simple.yml
- Prometheus unit testing for rules (promtool): https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus templating / template functions (humanizePercentage, printf): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
No technical issues found.

The following items were specifically verified and confirmed correct:
- Rule file structure (`groups` → `rules` with `alert`, `expr`, `for`, `labels`, `annotations`) matches the official spec.
- PromQL expressions are valid, including CPU idle inversion, memory availability ratio, `predict_linear` for disk fill prediction, `histogram_quantile` for P95 latency, and `offset 1h` for the request-rate anomaly.
- `humanizePercentage`, `printf`, and `$value`/`$labels` template usage are all valid Prometheus template constructs.
- Kubernetes metric names (`kube_pod_status_ready`, `kube_pod_container_status_restarts_total`, `kube_deployment_status_replicas_available`, `kubelet_volume_stats_used_bytes`/`kubelet_volume_stats_capacity_bytes`, `kube_job_status_failed`) are correct for kube-state-metrics / kubelet.
- Alertmanager `route` block with `matchers` (list-of-strings PromQL syntax) and `inhibit_rules` with `source_matchers`/`target_matchers` are the current (Alertmanager ≥ v0.22.0) syntax, replacing the deprecated `match`/`match_re`/`source_match`/`target_match`.
- The `continue: true` pattern to fan a critical alert out to both PagerDuty and Slack is valid routing behavior.
- promtool unit test format is correct, including that `exp_labels` excludes `__name__` and `alertname` (so listing only `severity` and `service` is accurate).
- The uppercase `AND` logical operator in the "Avoid Alert Fatigue" example is valid — PromQL keyword operators are matched case-insensitively.

## Review Notes
- The unit-testing example references an external rule file (`/etc/prometheus/rules/alerts.yml`) rather than the inline `HighErrorRate` rule (which carries `for: 5m`). Readers adapting this example should note that for a rule with `for: 5m`, an `eval_time` of `5m` may land the alert in the *pending* state rather than *firing*; choosing an `eval_time` slightly greater than the `for` duration is generally needed for the alert to be active. This is an illustrative snippet and not an error, but worth keeping in mind when copying.
- The Alertmanager `matchers`/`source_matchers`/`target_matchers` syntax requires Alertmanager v0.22.0 or newer. Anyone on an older release would need the legacy `match`/`source_match` syntax. Current versions are well past 0.22, so this is the correct default.
- Credentials in the Alertmanager example (`smtp_auth_password`, PagerDuty routing key, Slack webhook URLs) are placeholders, as expected for documentation.
