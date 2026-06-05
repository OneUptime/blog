# Validation Summary: Migrate from OTLP/gRPC Exporter to OTel Arrow Exporter Without Pipeline Downtime

## Status
validated

## Post Type
Migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- OTLP/gRPC
- Kubernetes DaemonSet rolling updates
- Prometheus-style Collector metrics

## Sources Consulted
- OpenTelemetry blog: OpenTelemetry Protocol with Apache Arrow in Production: https://opentelemetry.io/blog/2024/otel-arrow-production/
- OTel Arrow project README: https://github.com/open-telemetry/otel-arrow
- OpenTelemetry Collector Contrib `otelarrowreceiver` package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/otelarrowreceiver
- OpenTelemetry Collector Contrib `otelarrowexporter` package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/otelarrowexporter
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Kubernetes DaemonSet update strategy documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/

## Issues Found
- The gateway `otelarrow` receiver example configured `protocols.grpc.arrow.memory_limit_mib`, but the receiver documentation defines `arrow` as a sibling of `grpc` under `protocols`. I moved `arrow.memory_limit_mib` to `protocols.arrow.memory_limit_mib`.
- The post showed an HTTP protocol stanza under the `otelarrow` receiver and described the replacement broadly as standard OTLP. Current `otelarrowreceiver` documentation describes support for OTel Arrow and standard OTLP via gRPC, so I narrowed the post to OTLP/gRPC and removed the invalid HTTP receiver stanza from the examples.
- The fallback section referenced `otelcol_exporter_otelarrow_streams{protocol="arrow"}` and `protocol="otlp_fallback"` metrics. The current exporter and receiver docs list byte-oriented metrics such as `otelcol_exporter_sent`, `otelcol_exporter_sent_wire`, `otelcol_receiver_recv`, and `otelcol_receiver_recv_wire`, not those stream metrics. I replaced the invented metric examples with documented metric checks.
- The fallback explanation said the exporter falls back on the same connection. The exporter docs describe a downgrade to standard OTLP unless `arrow.disable_downgrade` is set, so I changed the wording to "same endpoint" and mentioned `arrow.disable_downgrade`.

## Review Notes
The OTel Arrow receiver/exporter components are currently documented as beta in OpenTelemetry Collector Contrib. The migration guidance is valid for Collector distributions that include `otelarrowreceiver` and `otelarrowexporter`, such as recent `otelcol-contrib` and `otelcol-k8s` builds.
