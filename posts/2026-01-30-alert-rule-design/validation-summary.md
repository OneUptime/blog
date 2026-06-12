# Validation Summary: How to Build Alert Rule Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules
- PromQL
- Alertmanager routing and receiver configuration
- PagerDuty, Slack, and email Alertmanager receivers
- PostgreSQL ordered-set aggregate functions
- Python prometheus_client and Pushgateway
- Kubernetes kube-state-metrics, kubelet metrics, and node exporter metrics
- Mermaid diagrams

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- PostgreSQL aggregate functions documentation: https://www.postgresql.org/docs/current/functions-aggregate.html
- Kubernetes kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus node exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The SLO fast-burn alert summary said the budget was exhausting in less than 2 hours. A 14x burn rate means the budget is burning 14x faster than sustainable, not necessarily exhausting in less than 2 hours. Updated the summary to describe the burn rate accurately.
- The Alertmanager route examples used deprecated `match` fields. Updated them to current `matchers` syntax.
- The PagerDuty receiver used `service_key`, while current Events API v2 integrations use `routing_key`. Updated the example key field.
- The alert health recording rules used `count_over_time()` on an acknowledgement counter and subtracted it from `ALERTS` sample counts. Updated the example to track firing samples explicitly and to use `increase(alert_acknowledged_total[7d])` for acknowledgement events.
- The Python alert test pushed a single static counter sample to Pushgateway, which would not produce a positive `rate()` in Prometheus. Updated it to push a zero baseline, wait for a scrape, push increased counter values, and wait long enough for the alert's `for: 5m` duration.
- The Python test called `/api/v1/alerts` with an unsupported `filter` parameter. Updated it to call the documented endpoint and filter by `alertname` in the returned alert labels.
- The Python rules validation request now uses the documented `/api/v1/rules?type=alert` filter and checks HTTP errors with `raise_for_status()`.

## Review Notes
The YAML snippets parse with PyYAML and the Python snippet parses with `python3`. `promtool` and `amtool` were not installed in the workspace, so native Prometheus/Alertmanager validation was not run. Some operational thresholds remain examples and should still be tuned per service traffic, SLO period, and on-call policy.
