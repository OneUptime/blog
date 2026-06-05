# Validation Summary: How to Configure the Jaeger Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Jaeger receiver
- Jaeger trace ingestion protocols
- Jaeger remote sampling
- OpenTelemetry Collector processors and exporters
- OTLP export
- TLS and mTLS configuration
- Linux UDP socket buffer tuning

## Sources Consulted
- OpenTelemetry Collector Contrib Jaeger receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector TLS configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector Debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Contrib Jaeger remote sampling extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/jaegerremotesampling/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry blog, "Migrating away from the Jaeger exporter in the Collector": https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Jaeger deployment configuration documentation: https://www.jaegertracing.io/docs/2.18/deployment/configuration/

## Issues Found
- Replaced the deprecated `logging` exporter in the basic configuration with the current `debug` exporter and updated the surrounding explanation.
- Corrected the remote sampling section. Current Collector versions no longer configure remote sampling under the Jaeger receiver; they use the `jaegerremotesampling` extension instead. Updated the YAML to enable that extension and added a minimal valid pipeline.
- Updated the production configuration to use `jaegerremotesampling` as an extension rather than `remote_sampling` under the receiver.
- Replaced the removed native `jaeger` exporter in the production configuration with an OTLP exporter instance (`otlp/jaeger`) pointed at Jaeger's OTLP/gRPC port.
- Updated Collector internal telemetry metrics configuration from the ignored `service.telemetry.metrics.address` field to the current `readers.pull.exporter.prometheus` form.
- Adjusted the Thrift HTTP description to avoid implying it is primarily the current Jaeger agent-to-collector path.

## Review Notes
Validated the revised Collector snippets with `otel/opentelemetry-collector-contrib:latest validate`. The post still uses illustrative certificate and backend paths, which are appropriate placeholders but must be replaced with real files and endpoints in a live deployment.
