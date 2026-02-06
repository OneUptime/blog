# How to Trace HL7 FHIR API Request Flows (Patient Lookup, Clinical Data Retrieval) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, FHIR, HL7, Healthcare APIs

Description: A practical guide to tracing HL7 FHIR API request flows including patient lookups and clinical data retrieval using OpenTelemetry.

HL7 FHIR (Fast Healthcare Interoperability Resources) has become the standard for exchanging healthcare data between systems. When your FHIR server handles patient lookups, clinical data bundles, and resource searches, understanding the performance characteristics of each request becomes critical. A single patient lookup might fan out into multiple resource fetches across different backends, and without distributed tracing, you are flying blind.

This post shows you how to instrument FHIR API request flows with OpenTelemetry so you can trace every step from the initial HTTP request through to the backend data stores.

## Instrumenting a FHIR Server with OpenTelemetry

Let us start with a Python-based FHIR server using Flask. We will add OpenTelemetry tracing that captures FHIR-specific attributes on each span.

```python
from flask import Flask, request, jsonify
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)

# Set up the tracer provider with OTLP export
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="localhost:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Auto-instrument Flask for HTTP-level spans
FlaskInstrumentor().instrument_app(app)

tracer = trace.get_tracer("fhir-server", "1.0.0")
```

## Tracing Patient Lookup Requests

A FHIR Patient search typically hits `/Patient?family=Smith&given=John`. Let us trace the full flow:

```python
@app.route("/Patient", methods=["GET"])
def search_patient():
    family = request.args.get("family", "")
    given = request.args.get("given", "")

    # Create a span for the FHIR search operation
    with tracer.start_as_current_span("fhir.patient.search") as span:
        # Record FHIR-specific attributes (no PHI - just operation metadata)
        span.set_attribute("fhir.resource_type", "Patient")
        span.set_attribute("fhir.interaction", "search-type")
        span.set_attribute("fhir.search_params_count", len(request.args))

        # Step 1: Query the patient index
        patients = query_patient_index(family, given)

        # Step 2: Build the FHIR Bundle response
        bundle = build_search_bundle(patients)

        span.set_attribute("fhir.bundle.total", len(patients))
        span.set_attribute("fhir.bundle.type", "searchset")

        return jsonify(bundle)


def query_patient_index(family, given):
    """Query the patient database index."""
    with tracer.start_as_current_span("db.patient_index.query") as span:
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.operation", "SELECT")
        span.set_attribute("db.table", "patient_index")

        # Simulate database query - replace with actual DB call
        # Note: we do NOT log the actual search values since they are PHI
        results = database.execute(
            "SELECT id, resource FROM patient_index WHERE family = %s AND given = %s",
            (family, given)
        )
        span.set_attribute("db.result_count", len(results))
        return results
```

## Tracing Clinical Data Retrieval with Resource Includes

FHIR requests often use `_include` and `_revinclude` parameters to pull related resources in a single call. Tracing these fan-out patterns is where OpenTelemetry really shines:

```python
@app.route("/Patient/<patient_id>/$everything", methods=["GET"])
def patient_everything(patient_id):
    """
    FHIR $everything operation - returns all data for a patient.
    This fans out to multiple resource stores.
    """
    with tracer.start_as_current_span("fhir.patient.everything") as span:
        span.set_attribute("fhir.resource_type", "Patient")
        span.set_attribute("fhir.interaction", "operation")
        span.set_attribute("fhir.operation", "$everything")

        # Fetch resources from different backend stores in parallel
        resources = []

        # Each of these creates a child span automatically
        conditions = fetch_resources("Condition", patient_id)
        medications = fetch_resources("MedicationRequest", patient_id)
        observations = fetch_resources("Observation", patient_id)
        encounters = fetch_resources("Encounter", patient_id)
        allergies = fetch_resources("AllergyIntolerance", patient_id)

        resources.extend(conditions + medications + observations +
                        encounters + allergies)

        span.set_attribute("fhir.everything.resource_count", len(resources))
        span.set_attribute("fhir.everything.resource_types_fetched", 5)

        bundle = {
            "resourceType": "Bundle",
            "type": "searchset",
            "total": len(resources),
            "entry": [{"resource": r} for r in resources]
        }
        return jsonify(bundle)


def fetch_resources(resource_type, patient_id):
    """Fetch FHIR resources of a given type for a patient."""
    with tracer.start_as_current_span(f"fhir.fetch.{resource_type.lower()}") as span:
        span.set_attribute("fhir.resource_type", resource_type)
        span.set_attribute("fhir.search.reference", "patient")

        results = database.execute(
            f"SELECT resource FROM {resource_type.lower()} WHERE patient_ref = %s",
            (patient_id,)
        )

        span.set_attribute("fhir.fetch.result_count", len(results))
        return results
```

## Recording FHIR-Specific Semantic Conventions

To make your traces consistent across services, define a set of semantic conventions for FHIR operations:

```python
# fhir_conventions.py
# Custom semantic conventions for FHIR tracing

class FHIRAttributes:
    RESOURCE_TYPE = "fhir.resource_type"       # e.g., "Patient", "Observation"
    INTERACTION = "fhir.interaction"            # e.g., "read", "search-type", "create"
    OPERATION = "fhir.operation"               # e.g., "$everything", "$validate"
    BUNDLE_TYPE = "fhir.bundle.type"           # e.g., "searchset", "transaction"
    BUNDLE_TOTAL = "fhir.bundle.total"         # Number of entries in bundle
    FHIR_VERSION = "fhir.version"              # e.g., "R4", "STU3"
    SEARCH_PARAMS = "fhir.search.params_count" # Number of search parameters
    RESOURCE_ID = "fhir.resource.id"           # Only if non-PHI (use hashed IDs)
    CONFORMANCE_MODE = "fhir.conformance"      # "strict" or "lenient"
```

## Tracing FHIR Transaction Bundles

Transaction bundles contain multiple operations that must succeed or fail together. Tracing each entry in the bundle helps you identify which operation is slow:

```python
@app.route("/", methods=["POST"])
def process_transaction():
    """Process a FHIR transaction bundle."""
    bundle = request.get_json()

    with tracer.start_as_current_span("fhir.transaction") as span:
        span.set_attribute("fhir.bundle.type", "transaction")
        span.set_attribute("fhir.bundle.entry_count", len(bundle.get("entry", [])))

        results = []
        for i, entry in enumerate(bundle.get("entry", [])):
            method = entry.get("request", {}).get("method", "")
            resource_type = entry.get("resource", {}).get("resourceType", "")

            with tracer.start_as_current_span(f"fhir.transaction.entry.{i}") as entry_span:
                entry_span.set_attribute("fhir.interaction", method.lower())
                entry_span.set_attribute("fhir.resource_type", resource_type)
                entry_span.set_attribute("fhir.transaction.entry_index", i)

                result = process_single_entry(entry)
                results.append(result)

        return jsonify(build_transaction_response(results))
```

## Wrapping Up

Tracing FHIR API requests with OpenTelemetry gives you visibility into the full lifecycle of healthcare data exchanges. The key is recording FHIR-specific attributes (resource type, interaction type, bundle sizes) while being careful never to log PHI in your span attributes. With these traces in place, you can quickly identify whether a slow patient lookup is caused by a database bottleneck, a particular resource type, or a bundle that is too large. Use the semantic conventions consistently across all your FHIR services so traces are easy to filter and compare in your observability backend.
