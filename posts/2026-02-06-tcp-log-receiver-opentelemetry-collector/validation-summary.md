# Validation Summary: How to Configure the TCP Log Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- TCP Log receiver
- Stanza log operators
- Collector processors and exporters
- Grafana Loki OTLP ingestion
- Python, Node.js, and Go TCP clients
- Netcat and Telnet connectivity testing

## Sources Consulted
- OpenTelemetry Collector Contrib TCP Log Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/tcplogreceiver/README.md
- OpenTelemetry Collector Contrib TCP input operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/tcp_input.md
- OpenTelemetry Collector Contrib Stanza parser/operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/stanza/docs/operators
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Grafana Loki OpenTelemetry Collector ingestion docs: https://grafana.com/docs/loki/latest/send-data/otel/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Node.js net module documentation: https://nodejs.org/api/net.html
- Go net package documentation: https://pkg.go.dev/net

## Issues Found
- The post used the deprecated `tcplog` component type. Updated all receiver IDs and pipeline references to `tcp_log`, which is the current receiver type.
- The minimal config used the deprecated `logging` exporter. Replaced it with the current `debug` exporter.
- Several snippets used unsupported TCP Log receiver fields: `max_connections`, `read_timeout`, `tcp_keep_alive`, and `tcp_keep_alive_period`. Replaced them with supported fields such as `max_log_size`, `one_log_per_packet`, and `add_attributes`.
- The plain-text parser wrote captures to `attributes.message` and attempted to add `timestamp` with `EXPR(now())`. Updated the parser to write captures to `attributes` and removed the invalid timestamp add operator.
- The JSON timestamp parser layout used `%f%z` for a millisecond timestamp ending in `Z`. Updated it to `%LZ`.
- The severity mapping used invalid/reversed aliases for `warning` and `critical`. Updated the mapping to map `warning` to `warn` and `critical` to `fatal`.
- The production Loki example used the legacy Loki exporter and `/loki/api/v1/push` label configuration. Updated it to use the `otlphttp/loki` exporter with Loki's native OTLP endpoint.
- The internal telemetry config used `service.telemetry.metrics.address`, which current Collector docs note is ignored. Updated examples to use `level: detailed`.
- Removed the unsupported `tcplog_active_connections` metric and replaced it with documented Collector metrics.
- Fixed Python examples by replacing deprecated `datetime.utcnow()`, adding missing imports in the connection-pool example, and generating UTC timestamps consistently.

## Review Notes
Representative Collector configurations were validated with `otel/opentelemetry-collector-contrib:latest` using `otelcol-contrib validate`. TLS examples still require real certificate files at runtime.
