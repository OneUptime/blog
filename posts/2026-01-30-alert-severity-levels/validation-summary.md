# Validation Summary: How to Build Alert Severity Levels

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules and PromQL
- Prometheus Alertmanager routing and receivers
- PagerDuty, Slack, webhook notification routing
- Python asyncio, dataclasses, and Enum
- Kubernetes kube-state-metrics
- PostgreSQL exporter and Node Exporter metrics
- Incident escalation policy design

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Python asyncio tasks documentation: https://docs.python.org/3/library/asyncio-task.html
- PostgreSQL exporter project documentation: https://github.com/prometheus-community/postgres_exporter
- kube-state-metrics deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md

## Issues Found
- The PostgreSQL connection pool alert divided `pg_stat_activity_count{state="active"}` directly by `pg_settings_max_connections`. In common postgres_exporter output, the active connection metric has extra labels such as state and database, so the binary operation may not match the max connection metric. Changed the expression to aggregate both sides by `instance`.
- The Alertmanager routing example used the older `match` route key. Current Alertmanager documentation uses `matchers`. Updated the severity routes to `matchers` with explicit equality matchers.
- The auto-scaling info alert used `changes(kube_deployment_spec_replicas[5m]) > 0` but described `$value` as the new replica count. `changes()` returns the number of value changes in the range. Updated the annotation to say the replica count changed and report the change count.

## Review Notes
- Python examples compile under Python 3.12.3.
- YAML snippets parse successfully as YAML.
- `promtool` and `amtool` were not installed locally, so Prometheus and Alertmanager validation was done against official documentation rather than local CLI schema checks.
