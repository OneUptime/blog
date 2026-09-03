# Validation Summary: How to Use a Service Dependency Graph to Separate Root-Cause Alerts from Downstream Symptoms

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Grafana Tempo service graphs and metrics-generator
- Grafana Alloy service-graph processing
- Prometheus and PromQL
- Prometheus Alertmanager inhibition rules
- OpenTelemetry service resource attributes
- OpenTelemetry messaging span semantic conventions
- Distributed tracing, sampling, and context propagation
- Incident correlation and root-cause candidate ranking

## Sources Consulted

- [Grafana Tempo: Service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/)
- [Grafana Tempo: Metrics-generator](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/)
- [Grafana Tempo: Enable service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/enable-service-graphs/)
- [Grafana Tempo: Analyze service graph data](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/metrics-queries/)
- [Grafana Tempo: Troubleshoot metrics-generator](https://grafana.com/docs/tempo/latest/troubleshooting/metrics-generator/)
- [Grafana Tempo: Estimate cardinality from traces](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/estimate-cardinality/)
- [OpenTelemetry: Service semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry: Semantic conventions for messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [Prometheus Alertmanager: Configuration and inhibition rules](https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule)

## Issues Found
No technical issues found.

## Review Notes

- The PromQL example uses current Tempo service-graph counter names and the documented `client` and `server` labels. As the post notes, production rules still need explicit handling for absent series and zero denominators.
- Tempo and Grafana Alloy can differ in service-graph behavior and configuration details, so the post's instruction to confirm names and labels for the installed version is appropriate.
- OpenTelemetry messaging semantic conventions are currently marked Development and include compatibility guidance for instrumentations emitting older conventions. Implementations should confirm which semantic-convention version their instrumentation emits.
- Alertmanager treats a missing label and an empty label value as equivalent for labels listed in `equal`; the post's recommendation to ensure equality labels are present helps avoid unintended inhibition.
