# Validation Summary: Why Does Time-Window Alert Correlation Merge Unrelated Incidents? Tuning Keys and Boundaries

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Time-window alert and incident correlation
- Alert deduplication and episode modeling
- Prometheus alerting rules
- Prometheus Alertmanager grouping, inhibition, and notification timing
- OpenTelemetry resource semantic conventions
- Grafana Tempo service graphs

## Sources Consulted

- [Prometheus Alertmanager overview](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Prometheus Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Prometheus Alertmanager Alerts API](https://prometheus.io/docs/alerting/latest/alerts_api/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [OpenTelemetry service semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry deployment attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/)
- [Grafana Tempo service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/)

## Issues Found
No technical issues found.

## Review Notes
The correlation rules, episode boundaries, asymmetric timing allowances, and replay methodology are implementation guidance rather than fields or algorithms prescribed by the referenced products. They are technically reasonable design recommendations. The JSON decision-record example is syntactically valid. The OpenTelemetry `deployment.environment.name` attribute is current and stable; the older `deployment.environment` attribute is deprecated. No version-specific commands or configuration snippets require updates.
