# Validation Summary: How to Instrument Clinical Decision Support System Response Times

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing and metrics
- OTLP exporters
- Python performance timing
- Flask route handling
- CDS Hooks
- FHIR resource access for CDS services

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry span naming guidance: https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/
- CDS Hooks current specification: https://cds-hooks.org/specification/current/
- CDS Hooks medication-prescribe hook documentation: https://cds-hooks.org/hooks/medication-prescribe/
- Python time module documentation: https://docs.python.org/3/library/time.html#time.perf_counter

## Issues Found
- The metric names included Prometheus-style or unit suffixes (`cdss.response_time_ms`, `cdss.rules_evaluated_total`, `cdss.alerts_generated_total`). OpenTelemetry naming guidance says units should be represented with metric metadata and counters should not append `_total`, so the names were changed to `cdss.response.duration`, `cdss.rules.evaluated`, and `cdss.alerts.generated`.
- The clinical rule span name included `rule.id`, which can create high-cardinality span names. OpenTelemetry guidance says span names must be low cardinality, so the span name was changed to `cdss.rule.evaluate` while preserving the rule id as a span attribute.
- The clinical rule counter used `cdss.rule.id` as a metric attribute, which can create high-cardinality metric streams. The counter now keeps only the lower-cardinality rule category attribute.
- The timing examples used `time.time()` for elapsed-duration measurements. Python recommends `time.perf_counter()` for measuring short durations with a high-resolution monotonic clock, so elapsed timing was updated to use `time.perf_counter()`.
- The CDS Hooks example used the deprecated `medication-prescribe` hook and read the patient id from a non-standard top-level `patient` field. It now uses the replacement `order-sign` hook and reads `context.patientId`, matching CDS Hooks request structure.
- The CDS Hooks example used Python's built-in `hash()` for a patient hash. Since built-in hash values are not stable across interpreter processes, this was changed to a deterministic SHA-256 hash for the illustrative `patient_id_hash` value.
- The performance budget section claimed CDS Hooks responses have a practical one-second timeout. The CDS Hooks specification says services should respond quickly, on the order of 500ms, while concrete client timeouts vary by EHR implementation, so the statement was corrected.

## Review Notes
The examples are syntactically valid Python, but they remain illustrative and depend on application-specific functions such as `load_interaction_database`, `create_clinical_alert`, `query_fhir_server`, `extract_medication_code`, and `format_as_cds_cards`. In production, teams should also configure an OpenTelemetry `Resource` with `service.name`, as many backends expect it for service attribution.
