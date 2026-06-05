# Validation Summary: How to Configure the Syslog Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry syslog exporter
- OTLP receiver
- Transform, filter, resource, attributes, and batch processors
- Syslog RFC 5424, RFC 3164, and RFC 6587 concepts
- TLS for syslog over TCP
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector exporter component registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib syslog exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/syslogexporter
- OpenTelemetry Collector Contrib syslog exporter config schema and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/syslogexporter
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- RFC 5424, The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424
- RFC 3164, The BSD Syslog Protocol: https://www.rfc-editor.org/rfc/rfc3164

## Issues Found
- The original examples treated `facility`, `severity_mapping`, `hostname`, `app_name`, and `tcp` connection-pool settings as syslog exporter configuration fields. These fields are not supported by the current OpenTelemetry Collector Contrib syslog exporter. Updated the examples to set syslog fields through log record attributes, especially `message`, `priority`, `hostname`, and `appname`.
- Several examples used `endpoint` values that already included a port while also implying or configuring a separate port. The syslog exporter combines `endpoint` and `port`, so the examples now keep the host in `endpoint` and use `port` separately.
- Cleartext TCP examples omitted `tls.insecure: true`. The exporter uses Collector TLS client settings, where `insecure: false` enables TLS. Updated cleartext TCP examples to explicitly disable TLS.
- The TLS examples referenced local certificate files that may not exist, making the snippets fail validation. Updated the runnable examples to use system trust by default and moved private CA/mTLS file paths into explanatory text.
- The filtering example used deprecated legacy filter processor syntax. Updated it to current OTTL `log_conditions` syntax.
- The monitoring example configured Collector internal metrics with the ignored `service.telemetry.metrics.address` setting and an unrelated Prometheus exporter in the service pipeline. Updated it to the current `service.telemetry.metrics.readers` Prometheus pull exporter format.
- The performance example used unsupported TCP connection-pool settings. Replaced them with documented `retry_on_failure` and `sending_queue` settings.

## Review Notes
All ten YAML snippets in the post were extracted and validated with `otel/opentelemetry-collector-contrib:latest validate`.
