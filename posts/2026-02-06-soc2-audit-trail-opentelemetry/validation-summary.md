# Validation Summary: How to Build a SOC 2 Audit Trail from OpenTelemetry Traces and Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry logs for Python
- OpenTelemetry Collector
- Collector filter, attributes, and batch processors
- OTLP exporters
- SOC 2 Trust Services Criteria
- Tamper-evident audit storage patterns

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry semantic convention registry for end-user attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- AICPA Trust Services Criteria reference: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf

## Issues Found
- The span example used `enduser.role`, which is deprecated in current OpenTelemetry semantic conventions. Changed it to `user.roles` with a list value.
- The Collector filter processor example used the older include-style filter configuration. Updated it to the current OTTL-based `trace_conditions` configuration and inverted the condition so the audit pipeline drops spans without `audit.action`.
- The Collector metadata example claimed to add an ISO 8601 collector timestamp but inserted an empty string attribute. Removed that attribute and kept the static audit pipeline metadata.
- The Python logs example configured an OpenTelemetry `LoggerProvider` and exporter, but did not attach a `LoggingHandler`, so standard `logging` calls would not be exported as OpenTelemetry log records. Added a `LoggingHandler` to the audit logger.
- The Python logs example imported `LogRecord` but did not use it. Replaced it with the required `LoggingHandler` import.

## Review Notes
The examples are syntactically valid after the fixes. The SOC 2 guidance remains intentionally implementation-oriented; actual auditor expectations vary by organization, selected trust service categories, and control design.
