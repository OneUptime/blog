# Validation Summary: How to Use OpenTelemetry Span Events to Record Security Audit Trail Entries

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry tracing API
- OpenTelemetry Python API
- OpenTelemetry Collector
- OpenTelemetry Collector Filter Processor
- OTLP receiver and exporter
- Flask
- SQL-style telemetry querying
- Security audit trails and compliance logging

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- Flask API documentation for view return values and JSON responses: https://flask.palletsprojects.com/en/stable/api/
- HHS HIPAA Security Rule guidance: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- HHS HIPAA Audit Protocol for 45 CFR 164.312(b): https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/audit/protocol-edited/index.html
- PCI Security Standards Council FAQ on PCI DSS audit logging: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/can-you-provide-clarification-for-logging-audit-trail-per-pci-dss-requirements-10-2-5-and-10-2-6/

## Issues Found
- The Flask usage example called `trace.get_tracer(...)` without importing `trace`. Added `from opentelemetry import trace` so the snippet is syntactically complete.
- The Collector Filter Processor example used older include-style filter configuration. Updated it to the current OTTL-based `trace_conditions` format and inverted the predicate so the audit pipeline drops spans that do not have `audit.has_audit_events`.
- The audit pipeline exported audit spans to both the audit backend and the observability backend, while the main pipeline already exported all spans to the observability backend. Removed the duplicate observability exporter from the audit pipeline.
- The post implied that span-event audit data automatically satisfies compliance requirements and shares the same retention policy as regular observability data. Adjusted the wording to say it supports compliance requirements, can be routed to separate retention, and requires tracing configuration that records and exports spans carrying audit events.
- The Collector example referred to a fixed seven-year retention period for compliance. Replaced that with retention configured for the organization's compliance needs, because retention periods vary by framework, policy, and data type.

## Review Notes
- The Python snippets parse successfully with `python3` AST checks.
- The YAML snippet parses successfully with PyYAML.
- The SQL query is backend-specific illustrative SQL, not portable OpenTelemetry syntax. This is acceptable because the post presents it as an example query rather than a standard API.
- OpenTelemetry span events can be a useful audit signal, but production compliance audit trails still need controls outside the code snippet, such as sampling/export guarantees, access controls, tamper resistance, retention policy enforcement, and regular log review procedures.
