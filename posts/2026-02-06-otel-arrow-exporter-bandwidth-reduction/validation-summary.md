# Validation Summary: Replace OTLP/gRPC with OTel Arrow Exporter for 30-70% Bandwidth Savings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- OTLP/gRPC
- Apache Arrow
- Zstd compression
- iptables
- Prometheus metrics and PromQL

## Sources Consulted
- OpenTelemetry blog: OpenTelemetry Protocol with Apache Arrow in Production, https://opentelemetry.io/blog/2024/otel-arrow-production/
- OpenTelemetry Collector Contrib otelarrowexporter README/package documentation, https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/otelarrowexporter
- OpenTelemetry Collector Contrib otelarrowreceiver README/package documentation, https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/otelarrowreceiver
- OpenTelemetry Collector internal telemetry documentation, https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation, https://opentelemetry.io/docs/collector/configuration/
- Apache Arrow columnar format documentation, https://arrow.apache.org/docs/format/Columnar.html
- Local iptables help output from iptables v1.8.10

## Issues Found
- The post described protobuf as a row-oriented format and said each span, metric point, or log record is serialized independently. Updated the wording to explain that OTLP protobuf payloads are not columnar and use a resource, scope, and record hierarchy, while repeated values can still occur across records, scopes, and batches.
- The post attributed specific 20-40% and 15-30% reductions to dictionary encoding and columnar layout without official support. Replaced those figures with the supported high-level mechanisms and the official 30-70% bandwidth reduction claim for similarly configured OTLP/gRPC pipelines with large batches and Zstd compression.
- The examples compared OTel Arrow against OTLP/gRPC with gzip, while the official production comparison is against OTLP/gRPC with large batches and Zstd compression. Updated the OTLP example and OTel Arrow examples to use `compression: zstd`.
- The text said OTel Arrow applies Zstd compression to Arrow record batches. Updated it to reflect the exporter documentation: Zstd is used by default at the gRPC level, and Arrow IPC payload compression is also supported.
- The PromQL example used `otelcol_exporter_sent_bytes_total`, which is not the OTel Arrow byte metric documented by the component. Replaced it with `otelcol_exporter_sent_wire_total` for Prometheus scraping of the wire-byte counter.
- The final recommendation claimed a specific 50-65% reduction for deployments with 50+ attributes per span. Replaced it with the documented 30-70% range and tied it to repetitive attributes and large batches.

## Review Notes
The OTel Arrow exporter and receiver are beta components in the OpenTelemetry Collector Contrib distribution. The `otelarrow` receiver supports standard OTLP/gRPC as well as OTel Arrow, so the rollout guidance is technically correct. The iptables commands are syntactically valid, but production measurement should account for existing firewall rule order and counter reset practices.
