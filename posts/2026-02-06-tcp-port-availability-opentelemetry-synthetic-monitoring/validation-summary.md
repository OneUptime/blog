# Validation Summary: How to Configure TCP Port Availability Checks

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- TCP Check Receiver
- Collector resource, batch, and transform processors
- OTLP metrics export
- Prometheus-style alerting rules
- TCP port availability monitoring

## Sources Consulted
- OpenTelemetry Collector Contrib `tcpcheckreceiver` package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/tcpcheckreceiver
- OpenTelemetry Collector Contrib `tcpcheckreceiver` metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/tcpcheckreceiver/metadata.yaml
- OpenTelemetry Collector `confignet.TCPAddrConfig` and dialer configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confignet/confignet.go
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus OpenTelemetry guide for metric and label name translation: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The post used the deprecated `tcpcheck` receiver type. Updated examples and prose to use the current `tcp_check` receiver type. The deprecated alias still works, but the current documented type is `tcp_check`.
- The examples placed `timeout` at the receiver level while describing it as the TCP connection establishment timeout. Updated the configuration to use `dialer.timeout` under each target, which is the documented per-target TCP dial timeout.
- The alert examples used labels named `tcp_endpoint`, but the receiver emits the endpoint attribute as `tcpcheck.endpoint`. Updated the Prometheus-style label references to `tcpcheck_endpoint`.
- The TCP duration alert used `tcpcheck_duration_ms`, which does not match the receiver metric name. Updated it to `tcpcheck_duration_milliseconds`, matching the default Prometheus/OpenMetrics translation for the `tcpcheck.duration` metric with unit `ms`.
- The enrichment processor example added `associated_service` without an actual condition, despite the comment saying it should apply only to PostgreSQL targets. Replaced it with a conditional Transform Processor example that sets the attribute only for the PostgreSQL TCP check endpoints.

## Review Notes
The `tcp_check` receiver is currently documented as alpha for metrics, and its emitted metrics are marked development in the receiver metadata. Alert metric names can vary if a backend disables default Prometheus name translation or uses native OpenTelemetry metric names instead of Prometheus-compatible names.
