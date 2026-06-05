# Validation Summary: How to Monitor Fintech Payment APIs for PCI DSS Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry Collector OTLP receiver/exporter configuration
- OpenTelemetry Collector transform and attributes processors
- Prometheus alerting rules and PromQL
- PCI DSS account data handling concepts
- Distributed tracing and W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector redaction processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- PCI DSS v4.0 SAQ A account data definitions: https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-A.pdf
- PCI SSC FAQ on keyed cryptographic hashing for PAN: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/do-pci-dss-requirements-for-keyed-cryptographic-hashing-apply-to-previously-hashed-pans/

## Issues Found
- Corrected PCI DSS terminology. The original text grouped CVV with cardholder data and omitted service code. Updated it to distinguish cardholder data from sensitive authentication data and clarify that CVV must not be stored after authorization.
- Corrected the CDE boundary guidance. The original text said the OpenTelemetry Collector must sit outside the CDE. Updated it to explain that a collector receiving unsanitized cardholder data is in scope, while collectors/backends outside the CDE must receive only sanitized telemetry.
- Replaced a bare truncated SHA-256 PAN hash with a keyed HMAC example. A plain hash of a PAN is not an appropriate non-reversible telemetry token because PANs have limited search space and PCI DSS v4.0 introduces keyed hash expectations for PAN protection. Added key-management caveats and QSA review language.
- Updated the OpenTelemetry Collector transform processor snippet to use current OTTL path names such as `span.attributes[...]` and `log.body`, and added `error_mode: ignore`.
- Corrected the gateway error metric description. A Counter tracks cumulative errors, not consecutive failures.
- Fixed the PromQL histogram quantile query by aggregating bucket rates with `sum by (le)` before calling `histogram_quantile`.
- Replaced the non-existent `otelcol_processor_transform_match_count` metric with an explicitly described custom redaction/audit metric, since the transform processor does not emit that built-in match-count metric.
- Added the missing `import time` to the integration-test snippet.

## Review Notes
The snippets remain illustrative and assume application-specific objects such as `gateway`, `GatewayTimeoutError`, `gateway_client`, `send_test_span`, and `fetch_exported_spans`. The post now calls out that PAN-derived correlation values and key management can affect PCI scope and should be reviewed with a QSA.
