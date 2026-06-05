# Validation Summary: How to Use HIPAA-Compliant Telemetry Pipelines with OpenTelemetry PII Redaction

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Flask instrumentation
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor and OTTL functions
- HIPAA Security Rule technical safeguards
- Python regular expressions
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- HHS HIPAA Security Rule overview: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- HHS HIPAA encryption FAQ: https://www.hhs.gov/hipaa/for-professionals/faq/2001/is-the-use-of-encryption-mandatory-in-the-security-rule/index.html
- 45 CFR 164.312 technical safeguards: https://ecfr.io/Title-45/Section-164.312

## Issues Found
- The opening HIPAA claim said PHI must be removed or encrypted before leaving a controlled environment. Updated it to say HIPAA requires appropriate safeguards for electronic PHI, including access controls and transmission security, and that encryption is addressable based on risk assessment.
- The Python exporter wrapper used `span._replace(attributes=clean_attrs)`, but OpenTelemetry Python `ReadableSpan` is not a named tuple and is documented as read-only. Replaced it with a source-side `SpanProcessor` for start-time attributes plus a `set_safe_attribute` helper for application-owned attributes set later.
- The Collector transform snippet used unqualified paths and multi-line OTTL statements that were less consistent with current transform processor examples. Rewrote the statements to use documented `span.attributes`, `log.body`, `resource.attributes`, `replace_pattern`, `delete_key`, and `keep_keys` forms.
- The database redaction example only handled the older `db.statement` attribute. Added `db.query.text` while retaining `db.statement` for older instrumentation.
- The allowlist block used the attributes processor with `action: update`, which does not drop non-listed attributes and was not included in the pipelines. Replaced it with a `transform/allowlist` processor using `keep_keys`, and added it to the trace and log pipelines.
- The Flask example used a `url_filter` argument that is not documented for `FlaskInstrumentor.instrument` or `instrument_app`. Replaced it with the documented `instrument_app(app)` usage and noted that Flask instrumentation emits `http.route` from the matched route.

## Review Notes
The validation script is syntactically straightforward but pattern-based PHI scanning is incomplete by nature. Future improvements could expand it to parse structured OTLP JSON and scan span events, log attributes, resource attributes, and metric datapoint attributes separately.
