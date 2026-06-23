# Validation Summary: How to Secure OpenTelemetry Data (PII Masking, Data Filtering)

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry SDKs for Go, Python, and JavaScript/TypeScript
- OpenTelemetry Collector receivers, processors, exporters, and internal telemetry
- OpenTelemetry Transformation Language (OTTL)
- Prometheus alert rules
- GDPR, HIPAA, and PCI-DSS security considerations

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JS 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry semantic conventions package documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS HIPAA medical record retention FAQ: https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- PCI Security Standards Council document library: https://www.pcisecuritystandards.org/document_library/

## Issues Found
- Corrected the definition of PII from "Personal Identifiable Information" to "Personally Identifiable Information."
- Updated the Go span processor example to preserve non-string attribute values instead of converting every attribute to a string during masking.
- Corrected the Collector hashing explanation. The attributes processor supports `hash`, but the article incorrectly stated SHA256 specifically.
- Replaced invalid `attributes` processor regex-replacement examples. The attributes processor `extract` action extracts named regex matches into attributes and does not support `replacement`; masking belongs in the transform processor with OTTL `replace_pattern`.
- Corrected filter processor log conditions from invalid `body contains "..."` syntax to OTTL `IsMatch(...)` conditions.
- Updated the Collector internal telemetry metrics configuration from the older `metrics.address` style to the current `metrics.readers` pull/Prometheus configuration.
- Reframed the Python example as an exporter wrapper rather than a real masking span processor chain, because the masking occurs in `MaskedSpanExporter`.
- Replaced Python `any` type annotations with `Any` and added `force_flush` to the exporter wrapper.
- Updated the JavaScript NodeSDK example for current OpenTelemetry JS APIs by replacing `new Resource(...)` with `resourceFromAttributes(...)` and deprecated `spanProcessor` with `spanProcessors`.
- Replaced deprecated `SemanticResourceAttributes` usage with current semantic convention constants for service attributes and a literal deployment environment attribute.
- Clarified HIPAA language so it does not overstate encryption as an unconditional current Security Rule requirement, and changed the audit retention comment so it is presented as an example to align with policy and applicable law.
- Replaced nonstandard Collector alert metric names with examples that either use a custom detector metric or explicitly require metrics from a certificate/authentication monitoring component.

## Review Notes
Some examples remain intentionally illustrative. Real deployments should validate Collector YAML with the exact Collector distribution and version in use, because contrib processor availability and OTTL behavior can vary by release and distribution.
