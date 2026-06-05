# Validation Summary: How to Configure the OTel Arrow Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- OTLP over gRPC
- Apache Arrow
- TLS and mTLS configuration
- Collector exporter queue, retry, timeout, and internal telemetry settings

## Sources Consulted
- OpenTelemetry Collector Contrib otelarrowexporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/otelarrowexporter/README.md
- OpenTelemetry Collector Contrib otelarrowreceiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/README.md
- OpenTelemetry Collector Contrib otelarrowexporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/otelarrowexporter/config.go
- OpenTelemetry Collector Contrib otelarrowreceiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/config.go
- OpenTelemetry Collector gRPC configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector TLS configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector exporterhelper configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib load_balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry otel-arrow README: https://github.com/open-telemetry/otel-arrow/blob/main/README.md

## Issues Found
- The prerequisites stated that OTel Arrow was available in Collector Contrib version 0.80.0 or later. The OTel Arrow project documents that the Go Collector components were included in Collector Contrib starting with v0.104.0, so the prerequisite was updated to v0.104.0 or later.
- The introduction and performance comparison overstated bandwidth savings as "up to 10x" and "5-10x". Current upstream Collector Contrib docs describe a typical reduction of about 50% compared with compressed OTLP/gRPC, with results dependent on data shape and compression settings. The claims were softened to match upstream guidance.
- The `disable_downgrade` comment incorrectly described dictionary encoding behavior. It actually prevents fallback to standard OTLP when Arrow is unavailable, so the comment was corrected.
- The `max_stream_lifetime` comment described a byte-size batch limit. The setting is a duration controlling Arrow stream recycling, so the comment was corrected.
- The receiving-side configuration placed `tls` and `arrow.memory_limit_mib` at the wrong receiver level. The OTel Arrow receiver config nests gRPC TLS under `protocols.grpc.tls` and Arrow settings under `protocols.arrow`, so the YAML was updated.
- The multi-destination example included an unused `loadbalancing` exporter block. Current upstream documentation names this exporter `load_balancing`, with `loadbalancing` preserved only as a deprecated alias, and the example did not route any pipeline to it. The unused standard-OTLP block was removed so the section accurately demonstrates Arrow exporter fan-out for redundancy.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. It was replaced with the current `service.telemetry.metrics.readers.pull.exporter.prometheus` form.
- The related resources pointed to a duplicated, unrelated internal URL. They were replaced with official OpenTelemetry Collector configuration and OTLP specification links.

## Review Notes
- YAML snippets were parsed successfully after edits.
- The post remains a high-level configuration guide and does not pin to a specific future Collector release beyond the minimum version for the Arrow components.
