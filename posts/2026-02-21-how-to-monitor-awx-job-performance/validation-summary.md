# Validation Summary: How to Monitor AWX Job Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- Ansible
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana
- Python
- Bash

## Sources Consulted
- AWX Metrics documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/metrics.html
- AWX Performance and Monitoring documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/performance.html
- AWX API filtering documentation: https://docs.ansible.com/projects/awx/en/latest/rest_api/filtering.html
- AWX API sorting documentation: https://docs.ansible.com/projects/awx/en/latest/rest_api/sorting.html
- AWX API pagination documentation: https://docs.ansible.com/projects/awx/en/latest/rest_api/pagination.html
- AWX metrics source code: https://github.com/ansible/awx/blob/devel/awx/main/analytics/metrics.py
- AWX API serializer source code: https://github.com/ansible/awx/blob/devel/awx/api/serializers.py
- AWX Operator service template source: https://github.com/ansible/awx-operator/blob/devel/roles/installer/templates/networking/service.yaml.j2
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- Python datetime deprecations documentation: https://docs.python.org/3.12/deprecations/index.html

## Issues Found
- The ServiceMonitor selector used `app.kubernetes.io/name: awx-service`, which does not match the AWX Operator service labels. Updated it to select the AWX service using `app.kubernetes.io/part-of: awx` and `app.kubernetes.io/component: awx`, matching the AWX Operator service template.
- The Python report script used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to use `datetime.now(timezone.utc)`.
- The P95 calculation indexed `durations[int(len(durations) * 0.95)]`, which over-selects the percentile position for small lists. Updated it to index against `len(durations) - 1`.
- The Grafana and alerting examples used `rate()` on `awx_status_total`. AWX defines this metric as a Prometheus Gauge, and Prometheus documents `rate()` for counters. Updated the examples to use current aggregate status ratios and counts instead.
- The health check script used `date -u -v-1d`, which is BSD/macOS-specific and fails on typical Linux systems. Replaced it with a Python UTC timestamp expression.

## Review Notes
The built-in AWX status metrics are aggregate gauges, not per-job duration or event counters. Time-windowed failure rates and per-template duration percentiles are better handled through the AWX API or a custom exporter, as the post later demonstrates.
