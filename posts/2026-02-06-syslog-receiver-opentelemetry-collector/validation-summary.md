# Validation Summary: How to Configure the Syslog Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry syslog receiver
- Syslog RFC 3164, RFC 5424, RFC 5425, and RFC 6587 octet counting
- UDP and TCP syslog transport
- OpenTelemetry Collector processors, exporters, extensions, and internal telemetry
- rsyslog, syslog-ng, Python logging, and network-device syslog forwarding

## Sources Consulted
- OpenTelemetry Collector Contrib syslog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- OpenTelemetry Collector Contrib syslog parser operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/syslog_parser.md
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector troubleshooting docs: https://opentelemetry.io/docs/collector/troubleshooting/
- RFC 3164: https://www.rfc-editor.org/rfc/rfc3164
- RFC 5424: https://www.rfc-editor.org/rfc/rfc5424
- RFC 5425: https://www.rfc-editor.org/rfc/rfc5425
- RFC 6587: https://www.rfc-editor.org/rfc/rfc6587

## Issues Found
- Replaced the deprecated `logging` exporter examples with the current `debug` exporter.
- Removed invalid or obsolete syslog receiver fields: `udp.max_message_size`, `udp.workers`, `tcp.max_message_size`, `tcp.max_connections`, and `preserve_timestamp`.
- Updated UDP concurrency examples to use the receiver's `udp.async` configuration.
- Updated TCP size-limit examples to use `tcp.max_log_size`.
- Removed RFC 3164 octet-counting and RFC 5424 timezone examples where the receiver docs do not support or apply those settings as described.
- Changed JSON parsing examples to parse from `attributes.message`, which is where the syslog parser puts the message payload, instead of the raw log body.
- Removed redundant severity parser examples that parsed syslog priority as severity; the syslog parser already sets severity information from the syslog message.
- Changed Elasticsearch `index` to `logs_index` and fixed the authenticator reference to `basicauth/elasticsearch`.
- Updated internal telemetry metrics examples to use `service.telemetry.metrics.level` and removed the ignored `service.telemetry.metrics.address` setting for Collector v0.123.0 and later.
- Added the missing Python `socket` import required by `socket.SOCK_STREAM`.
- Updated filter processor examples from deprecated include/exclude matching to current OTTL `log_conditions`.
- Replaced a PagerDuty Events API endpoint shown under `otlphttp` with generic OTLP/HTTP-compatible alerting and SIEM endpoints.
- Replaced the non-existent `syslog_parse_errors` metric with guidance to inspect Collector error logs for syslog parse failures.

## Review Notes
Representative Collector snippets were validated with the cached `otel/opentelemetry-collector-contrib:latest` image, which reports `otelcol-contrib version 0.153.0`. A broader production-style validation reached certificate-file loading, confirming schema and component wiring before failing as expected because the example certificate paths are placeholders.
