# Validation Summary: How to Use OpenTelemetry to Meet PCI DSS Compliance Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Python tracing and metrics APIs
- PCI DSS v4.0/v4.0.1 compliance controls
- TLS/mTLS
- Prometheus alerting rules
- AWS S3 exporter for OpenTelemetry Collector

## Sources Consulted
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector AWS S3 exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/README.md
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK trace source for ReadableSpan behavior: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/__init__.py
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PCI SSC PCI DSS document library for PCI DSS v4.0.1: https://www.pcisecuritystandards.org/document_library?class=pcidss&doc=pci_dss
- PCI SSC TLS FAQ: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-pci-dss-define-which-versions-of-tls-must-be-used/

## Issues Found
- The Python `SpanProcessor` example attempted to mutate `span.attributes` in `on_end`. OpenTelemetry Python passes a `ReadableSpan` to `on_end`, and its attributes are exposed as a read-only mapping. Replaced it with a helper that redacts values before calling `span.set_attribute`.
- The first Collector redaction snippet referenced `otlp`, `batch`, and `otlp/backend` without defining them. Added minimal receiver, batch processor, exporter, and `error_mode: ignore` so the example is coherent.
- The TLS pipeline snippet referenced the redaction processor without defining it in that snippet. Changed the Requirement 4 example to focus on TLS and use only a defined `batch` processor.
- The clock synchronization Kubernetes DaemonSet claimed to ensure host NTP synchronization, but a regular pod does not configure or verify node time synchronization reliably. Replaced it with a Prometheus alerting rule for host clock synchronization status.
- The PCI audit filter used old include-style matcher syntax. Updated it to the current OTTL-based filter processor syntax, where matching conditions drop telemetry.
- The OpenTelemetry counter was named `cde.access.total`, but Prometheus compatibility rules add a `_total` suffix to counters, which could produce an incorrect Prometheus metric name. Renamed the OTel counter to `cde.access` so the PromQL examples use `cde_access_total` correctly.
- The histogram unit used `events/min`, which is not a standard OpenTelemetry unit. Changed it to `1`.
- Several statements implied OpenTelemetry could make a system PCI compliant by itself. Adjusted those statements to say OpenTelemetry can help support PCI controls and evidence, while preserving the article's guidance.
- The Requirement 11 discussion overstated anomaly monitoring as a replacement for PCI testing/detection requirements. Clarified that OpenTelemetry metrics do not replace vulnerability scanning, penetration testing, intrusion-detection, or change-detection controls.

## Review Notes
The AWS S3 exporter and filter processor are currently alpha components in upstream OpenTelemetry Collector documentation. The post is technically valid as a guide, but production PCI environments should pin Collector versions, confirm component availability in their Collector distribution, and validate final configurations with their QSA.
