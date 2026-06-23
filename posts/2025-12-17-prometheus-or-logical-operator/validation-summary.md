# Validation Summary: How to Write OR Logical Operator in Prometheus Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus recording rules
- Node Exporter metrics

## Sources Consulted
- Prometheus documentation: Operators - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus documentation: Recording rules - https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus documentation: Monitoring Linux host metrics with the Node Exporter - https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- Corrected the description of the `or` operator to specify that logical/set operators work on instant vectors, matching the Prometheus operator documentation.
- Fixed the flowchart guidance so regex matchers are recommended for multiple values of the same label, not broadly for any use of the same metric.
- Removed the inaccurate "union in subquery" flowchart recommendation, because PromQL does not have a separate subquery union method for this use case.
- Corrected CPU utilization examples that summed non-idle `node_cpu_seconds_total` rates without normalizing by CPU count. The examples now use `1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))`, which produces a per-instance utilization ratio.
- Clarified the multi-region `or` example so it describes choosing between metric sources that may exist, rather than implying that `or` totals both sources.
- Replaced `or on()` with `or on(instance)` in the label matching example. Matching on an empty label list can collapse unrelated series; the corrected version demonstrates matching on a shared label.

## Review Notes
The remaining PromQL examples and rule snippets are syntactically consistent with the documented Prometheus query and rule-file formats. Regex matcher examples are valid under Prometheus RE2 syntax and fully anchored matching behavior.
