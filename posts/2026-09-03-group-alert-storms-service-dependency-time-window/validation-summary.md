# Validation Summary: How to Group Alert Storms by Service, Dependency, and Time Window Without Hiding Root Causes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus Alertmanager
- Prometheus alert labels and notification templates
- Alert grouping, routing, deduplication, silences, and inhibition
- OpenTelemetry service semantic conventions
- Grafana Tempo service graphs
- Dependency-aware incident correlation

## Sources Consulted
- [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Alertmanager Notification Template Reference](https://prometheus.io/docs/alerting/latest/notifications/)
- [OpenTelemetry Service Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [Grafana Tempo Service Graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/)

## Issues Found
- The routing example was introduced as though it could be the beginning of a complete Alertmanager configuration, but the snippet references `default`, `pager`, and `platform` receivers without defining them. Changed the introduction to identify it explicitly as a routing-tree fragment and note that a complete configuration must define the named receivers. This preserves the focused example while preventing readers from treating it as a standalone loadable configuration.

## Review Notes
- The current `matchers`, `source_matchers`, and `target_matchers` fields are used instead of the deprecated `match`, `match_re`, `source_match`, `source_match_re`, `target_match`, and `target_match_re` forms.
- The descriptions of `group_wait`, `group_interval`, and `repeat_interval` agree with the current Alertmanager configuration reference. The example repeat intervals are multiples of their corresponding group intervals.
- The warning that missing and empty labels compare equally for inhibition is explicitly documented by Alertmanager.
- The explanation of `GroupLabels`, `CommonLabels`, per-alert labels, and `StartsAt` agrees with the current notification template data structures.
- The service-graph caveats are consistent with Tempo's documented reliance on paired spans and its handling of uninstrumented or unpaired sides of an edge. The correlation-layer design recommendations are architectural guidance rather than built-in Alertmanager behavior.
