# Validation Summary: How to Fix Collector Config Errors When the OTLP Exporter insecure Flag Moved

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC exporter
- OTLP HTTP exporter
- Collector TLS configuration
- Kubernetes ConfigMaps
- OpenTelemetry Collector Helm chart values

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector TLS configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector HTTP configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector Helm chart README: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/README.md
- OpenTelemetry Collector source metadata for current OTLP exporter component IDs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/metadata.yaml and https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/metadata.yaml

## Issues Found
- Current Collector releases use `otlp_grpc` and `otlp_http` as the preferred OTLP exporter component IDs. Updated the NEW examples to use those IDs and added notes that `otlp` and `otlphttp` are deprecated aliases in newer releases.
- The post described receiver TLS changes as the same top-level `insecure` move. Clarified that receiver server TLS settings specifically changed from `tls_settings` to `tls`.
- The summary overstated that both exporter and receiver fields moved in the same way. Updated it to distinguish exporter TLS settings from receiver `tls_settings`.
- The Helm values example needed to reflect the current `otlp_grpc` exporter ID in the NEW values.

## Review Notes
The validation command format is consistent with current Collector documentation, which shows `otelcol validate --config=customconfig.yaml`; the contrib distribution uses the same Collector command structure. The post intentionally keeps OLD snippets to show the legacy configuration shape that triggers the migration.
