# Validation Summary: How to Include HTTP Status Codes in Blackbox Probe Alerts

## Status

Validated through documentation review and the checks below. Deployment verification remains environment-specific.

## Post Type

Practical tutorial.

## Technologies Covered

Prometheus, Alertmanager, Monitoring

## Sources Consulted

- https://github.com/prometheus/blackbox_exporter/blob/master/README.md
- https://prometheus.io/docs/prometheus/latest/querying/operators/
- https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found

No outstanding issues identified in the performed checks. Live service behavior was not tested.

## Review Notes

- Reviewed official documentation and example semantics; checked metadata, title uniqueness, and fenced-block structure.
- Python 3 parsed 1 example(s) and executed all self-contained fixtures successfully.
- JSON examples parsed and shell examples syntax-checked where present. No production services contacted by examples.
- Executed status-selection fixture; reviewed PromQL set-operator semantics and alert annotations. Prometheus rule evaluation and live failure probes were not executed.
- Parsed all 1 YAML example(s) with PyYAML 6.0.3; this checks YAML syntax, not a running service configuration.
- Parsed all 2 PromQL expression(s), including applicable YAML rule expressions, with the official Prometheus parser v0.55.1. Live metric availability and alert evaluation were not tested.
