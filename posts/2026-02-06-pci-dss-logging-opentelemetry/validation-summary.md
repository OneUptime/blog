# Validation Summary: How to Use OpenTelemetry to Meet PCI-DSS Logging and Monitoring Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PCI DSS v4.0 logging and monitoring requirements
- OpenTelemetry tracing
- OpenTelemetry logging instrumentation
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Python logging
- SQL reporting queries

## Sources Consulted
- PCI Security Standards Council, PCI DSS v4.0 SAQ C, Requirement 10 excerpts: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf
- PCI Security Standards Council, Effective Daily Log Monitoring guidance: https://www.pcisecuritystandards.org/documents/Effective-Daily-Log-Monitoring-Guidance.pdf
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry semantic convention registry for end-user attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/

## Issues Found
- The post used older PCI DSS Requirement 10 numbering while describing PCI DSS v4.0. Updated the mappings and section references to v4.0 numbering, including 10.2.1.1, 10.2.1.2, 10.2.1.4, 10.2.1.5, 10.2.2, 10.3, and 10.5.1.
- The cardholder data access Python example set origination and resource attributes after returning from the `try` block, making those required fields unreachable on successful reads. Moved those attributes before the vault lookup.
- The Python example used deprecated `enduser.role`. Replaced it with `user.roles` while keeping `enduser.id`, which remains a valid end-user attribute but may contain PII.
- The Python example imported `datetime` and `timezone` without using them. Removed the unused import.
- The authentication failure section described the standard `logging` example as direct use of the OpenTelemetry Logs SDK. Reworded it to refer to Python logging with OpenTelemetry logging instrumentation or an OpenTelemetry log handler.
- The Collector transform processor snippet used older unqualified OTTL paths inside statement groups. Updated it to current documented OTTL-style paths such as `span.attributes` and `log.body`, and added `error_mode: ignore`.
- The Collector filter processor snippet used an obsolete `spans.include.match_type` shape. Replaced it with a current OTTL filter condition that drops spans without `pci.event_type` from the PCI audit trace pipeline.

## Review Notes
The Collector configuration is illustrative and still depends on the chosen Collector distribution including the transform and filter processors. Retention, tamper evidence, and daily review workflows also require backend storage, access control, alerting, and documented operating procedures beyond OpenTelemetry configuration alone.
