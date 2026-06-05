# Validation Summary: How to Monitor Clinical Trial Data Collection Platform Performance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- FastAPI
- OpenTelemetry Python tracing API and SDK
- OpenTelemetry Python metrics API and SDK
- OTLP gRPC trace and metric exporters
- Clinical trial EDC / CRF workflows
- 21 CFR Part 11 audit trail concepts

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- FastAPI Request reference: https://fastapi.tiangolo.com/reference/request/
- FDA guidance, Computerized Systems Used in Clinical Trials: https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/fda-bioresearch-monitoring-information/guidance-industry-computerized-systems-used-clinical-trials
- FDA guidance, Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/electronic-systems-electronic-records-and-electronic-signatures-clinical-investigations-questions

## Issues Found
- The CRF submission example passed the raw request payload to `run_edit_checks`, but the later cross-form check logic reads `form_data.get("subject_id")`. Since `subject_id` comes from the route path, cross-form checks could receive `None`. Updated the call to include the path `subject_id` in the data passed to `run_edit_checks`.
- The cross-form edit check example fetched `cross_data` but did not pass it to `evaluate_single_check`, so the shown cross-form query result was unused. Initialized `cross_data` per check and passed it into the evaluator.
- The metrics section said regulatory deadlines often require query resolution within a set period. FDA guidance supports audit trails and data integrity controls, but the specific query resolution timing is more accurately a study protocol, monitoring plan, or SOP target. Reworded the sentence to avoid overstating a regulatory requirement.

## Review Notes
The OpenTelemetry setup uses current Python SDK patterns for `TracerProvider`, `BatchSpanProcessor`, OTLP exporters, `MeterProvider`, `PeriodicExportingMetricReader`, histograms, counters, span attributes, and span status. The examples are illustrative and still depend on application-specific helper functions such as `validate_form_structure`, `run_edit_checks`, `persist_form_data`, and `create_audit_trail_entries`.
