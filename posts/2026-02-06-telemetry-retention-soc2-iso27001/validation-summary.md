# Validation Summary: How to Use Telemetry Data Retention Policies That Satisfy SOC 2

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK resource attributes
- OpenTelemetry Python tracing API
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector attributes processor
- SOC 2 Trust Services Criteria
- ISO/IEC 27001:2022 Annex A
- GDPR/UK GDPR storage limitation principles
- Python requests and datetime APIs

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- AICPA Trust Services Criteria download page: https://www.aicpa-cima.com/resources/download/trust-services-criteria
- ISO/IEC 27001:2022 standard page: https://www.iso.org/standard/27001
- UK ICO storage limitation guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/

## Issues Found
- The opening SOC 2 wording overstated CC6.5 as a general telemetry data retention requirement. Updated it to describe CC6.5 as addressing disposal of assets containing data and software, while keeping the telemetry retention guidance framed as a control implementation pattern.
- The security audit telemetry recommendation said "SOC 2 typically needs 1 year." SOC 2 does not prescribe a fixed retention period, so this was changed to say many SOC 2 programs use about 1 year but the duration must be justified.
- The Python span example used `retention.reason = "soc2_cc6.1"` even though the post discusses CC6.5. Updated it to `soc2_cc6.5`.
- The OpenTelemetry Collector routing snippet used invalid multi-line `statement` YAML and mixed trace and log pipeline targets in the same routing connector table. Replaced it with current `context` and `condition` routing connector syntax and separate trace, log, and metric routing connectors.
- The Collector example discussed metrics but only routed traces and logs. Added metric ingress and retention pipelines so the configuration matches the surrounding explanation.
- The compliance exporter used a 730-day retention header, but the compliance pipelines added 365-day retention metadata. Added an `attributes/retention_730` processor and used it for compliance pipelines.
- The Python validation and legal hold snippets used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc)` calls and RFC 3339-style UTC timestamps.

## Review Notes
The backend query endpoint in the validation script is an internal example API, not an OpenTelemetry standard API. That is acceptable for an illustrative retention validation script, but a production version should adapt the query to the actual storage backend and call `response.raise_for_status()` before parsing JSON.
