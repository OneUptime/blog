# Validation Summary: How to Configure OpenTelemetry Receivers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver
- Prometheus receiver
- Jaeger receiver
- Host Metrics receiver
- Kafka receiver
- File Log receiver
- Zipkin receiver
- Syslog receiver
- Collector processors, exporters, and extensions

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector security best practices: https://opentelemetry.io/docs/security/config-best-practices/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector gRPC configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector authentication configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configauth/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Jaeger receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector Host Metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector File Log receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Zipkin receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zipkinreceiver/README.md
- OpenTelemetry Collector Syslog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- Bearer Token Authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/README.md
- Stanza field syntax documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry configuration data model environment substitution rules: https://opentelemetry.io/docs/specs/otel/configuration/data-model/

## Issues Found
- Removed `compression: gzip` from the OTLP gRPC receiver example because `compression` is a client/exporter gRPC setting, not a gRPC server receiver setting.
- Replaced `bearer_token` / `bearertoken` with the current `bearertokenauth` extension type and authenticator ID, and enabled it in `service.extensions`.
- Escaped Prometheus relabel replacement capture groups as `$${1}` and `$${2}:$${1}` so Collector environment substitution does not treat `${1}` and `${2}` as variables.
- Corrected Host Metrics filesystem filter fields from generic `include` / `exclude` blocks to `include_fs_types`, `include_mount_points`, and `exclude_mount_points`.
- Corrected Host Metrics regex examples to use valid regular expressions for device and interface prefix matching, and changed process name matching to `strict`.
- Updated Kafka receiver configuration to use `initial_offset: earliest`, signal-specific `traces.topics` / `traces.encoding`, and top-level `tls`; removed deprecated/incorrect top-level topic and encoding usage.
- Corrected File Log resource attribute field syntax from `resource.service.name` to `resource["service.name"]` so the semantic attribute key is not interpreted as nested fields.
- Corrected Syslog receiver configuration to use nested `tcp.listen_address`, `tcp.tls`, and top-level `protocol` instead of unsupported `protocol`, `listen_address`, and `protocol_type` fields.
- Updated the zpages comment in the complete configuration from Prometheus metrics to in-process diagnostic pages.
- Updated the final authentication example to reference and enable `bearertokenauth`.

## Review Notes
All YAML snippets were parsed successfully with PyYAML after the corrections. Component-level validation was performed against current official OpenTelemetry Collector and Collector Contrib documentation; an `otelcol-contrib validate` binary was not available in the local environment.
