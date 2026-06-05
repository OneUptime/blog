# Validation Summary: How to Trace HL7 FHIR API Request Flows with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP gRPC trace exporter
- OpenTelemetry Flask instrumentation
- OpenTelemetry database semantic conventions
- Flask
- Python
- HL7 FHIR REST API, Patient search, `$everything`, includes, and transaction bundles

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- HL7 FHIR R4 search documentation, including `_include` and `_revinclude`: https://hl7.org/fhir/R4/search.html
- HL7 FHIR Patient `$everything` operation: https://hl7.org/fhir/patient-operation-everything.html
- HL7 FHIR Bundle resource documentation: https://hl7.org/fhir/bundle.html

## Issues Found
- The OTLP gRPC exporter example used `endpoint="localhost:4317"` without the URL scheme or `insecure=True`. The OpenTelemetry Python OTLP exporter documentation shows local plaintext gRPC export as `endpoint="http://localhost:4317", insecure=True`, so the example was updated to match.
- The database span example used older database semantic convention attributes: `db.system`, `db.operation`, and `db.table`. These were updated to the stable current attributes `db.system.name`, `db.operation.name`, and `db.collection.name`.
- The `$everything` example commented that the resource fetches were parallel, but the code executes them sequentially. The comment was corrected to avoid claiming parallel execution while preserving the same illustrative flow.

## Review Notes
The code snippets are illustrative and depend on application-specific helpers such as `database.execute`, `build_search_bundle`, `process_single_entry`, and `build_transaction_response`. The FHIR examples are technically consistent with HL7 FHIR behavior: Patient search parameters such as `family` and `given` are valid, `_include` and `_revinclude` are valid search mechanisms for related resources, the Patient `$everything` operation returns a Bundle of type `searchset`, and transaction Bundle entries require request metadata.
