# How to Monitor Clinical Trial Data Collection Platform Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Clinical Trials, EDC, Data Collection

Description: Monitor clinical trial data collection platforms with OpenTelemetry to ensure data integrity, track form submission latency, and maintain audit trails.

Clinical trial data collection platforms (Electronic Data Capture, or EDC systems) are under intense regulatory scrutiny. Every data point entered into a case report form (CRF) must be traceable, and the system must perform well enough that research coordinators at hundreds of sites worldwide can enter data without frustration. When the system is slow at a site in Tokyo during their peak hours, data entry backlogs build up and trial timelines slip.

This post walks through instrumenting a clinical trial EDC platform with OpenTelemetry to monitor form submission performance, query resolution workflows, and data validation pipelines.

## Instrumenting CRF Form Submissions

CRF submissions are the core operation. Each submission involves validation, edit checks, and audit trail logging:

```python
from fastapi import FastAPI, Request
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Tracing setup
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("edc-platform", "1.0.0")

# Metrics setup
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("edc-platform", "1.0.0")

form_submission_latency = meter.create_histogram(
    "edc.form.submission_latency_ms",
    description="CRF form submission latency end-to-end",
    unit="ms",
)

edit_check_latency = meter.create_histogram(
    "edc.edit_check.latency_ms",
    description="Edit check execution latency",
    unit="ms",
)

queries_generated = meter.create_counter(
    "edc.queries_generated_total",
    description="Total data queries generated from edit checks",
)

app = FastAPI()


@app.post("/api/v1/studies/{study_id}/subjects/{subject_id}/forms/{form_id}")
async def submit_crf_form(study_id: str, subject_id: str, form_id: str, request: Request):
    """Submit a CRF form for a study subject."""
    start = time.time()
    payload = await request.json()

    with tracer.start_as_current_span("edc.form.submit") as span:
        span.set_attribute("edc.study_id", study_id)
        span.set_attribute("edc.form_id", form_id)
        span.set_attribute("edc.form_name", payload.get("form_name", ""))
        span.set_attribute("edc.visit_name", payload.get("visit_name", ""))
        span.set_attribute("edc.site_id", payload.get("site_id", ""))
        span.set_attribute("edc.fields_count", len(payload.get("fields", {})))
        span.set_attribute("edc.user_role", payload.get("user_role", "coordinator"))

        # Step 1: Validate form structure against study definition
        with tracer.start_as_current_span("edc.form.validate_structure") as val_span:
            structure_valid = validate_form_structure(study_id, form_id, payload)
            val_span.set_attribute("edc.validation.structure_valid", structure_valid)

            if not structure_valid:
                span.set_status(trace.Status(trace.StatusCode.ERROR, "Invalid form structure"))
                return {"status": "error", "message": "Form structure does not match study definition"}

        # Step 2: Run edit checks (validation rules defined by the study protocol)
        with tracer.start_as_current_span("edc.edit_checks.run") as ec_span:
            ec_start = time.time()
            edit_check_results = run_edit_checks(study_id, form_id, payload)

            ec_duration = (time.time() - ec_start) * 1000
            ec_span.set_attribute("edc.edit_checks.count", edit_check_results["total_checks"])
            ec_span.set_attribute("edc.edit_checks.failures", edit_check_results["failures"])
            ec_span.set_attribute("edc.edit_checks.warnings", edit_check_results["warnings"])

            edit_check_latency.record(ec_duration, {
                "study_id": study_id,
                "form_id": form_id,
            })

        # Step 3: Generate queries for failed edit checks
        new_queries = []
        if edit_check_results["failures"] > 0:
            with tracer.start_as_current_span("edc.queries.generate") as q_span:
                for failure in edit_check_results["failed_checks"]:
                    query = generate_data_query(
                        study_id, subject_id, form_id,
                        failure["field"], failure["message"]
                    )
                    new_queries.append(query)

                q_span.set_attribute("edc.queries.generated", len(new_queries))
                queries_generated.add(len(new_queries), {
                    "study_id": study_id,
                    "form_id": form_id,
                })

        # Step 4: Write the audit trail (21 CFR Part 11 requirement)
        with tracer.start_as_current_span("edc.audit_trail.write") as audit_span:
            audit_entries = create_audit_trail_entries(
                study_id, subject_id, form_id, payload
            )
            audit_span.set_attribute("edc.audit.entries_written", len(audit_entries))
            audit_span.set_attribute("edc.audit.includes_reason",
                                   payload.get("change_reason") is not None)

        # Step 5: Persist the form data
        with tracer.start_as_current_span("edc.form.persist") as persist_span:
            persist_result = persist_form_data(study_id, subject_id, form_id, payload)
            persist_span.set_attribute("edc.persist.version", persist_result["version"])
            persist_span.set_attribute("db.system", "postgresql")

        duration_ms = (time.time() - start) * 1000
        form_submission_latency.record(duration_ms, {
            "study_id": study_id,
            "form_id": form_id,
            "site_id": payload.get("site_id", "unknown"),
        })

        span.set_attribute("edc.form.submission_result", "success")
        return {
            "status": "success",
            "version": persist_result["version"],
            "queries": new_queries,
            "edit_check_warnings": edit_check_results["warnings"],
        }
```

## Tracing Edit Check Execution

Edit checks are protocol-defined validation rules. Some are simple range checks, but others involve cross-form logic that queries data from multiple visits:

```python
def run_edit_checks(study_id, form_id, form_data):
    """Execute all edit checks defined for this form in the study protocol."""
    with tracer.start_as_current_span("edc.edit_checks.execute") as span:
        # Load the edit check definitions for this form
        with tracer.start_as_current_span("edc.edit_checks.load_definitions") as load_span:
            checks = load_edit_check_definitions(study_id, form_id)
            load_span.set_attribute("edc.edit_checks.definitions_loaded", len(checks))

        results = {"total_checks": len(checks), "failures": 0, "warnings": 0, "failed_checks": []}

        for check in checks:
            with tracer.start_as_current_span(f"edc.edit_check.{check['id']}") as check_span:
                check_span.set_attribute("edc.check.id", check["id"])
                check_span.set_attribute("edc.check.type", check["type"])
                check_span.set_attribute("edc.check.severity", check["severity"])

                # Some checks need data from other forms/visits
                if check["type"] == "cross_form":
                    with tracer.start_as_current_span("edc.edit_check.fetch_cross_data") as xd_span:
                        cross_data = fetch_cross_form_data(
                            study_id, form_data.get("subject_id"),
                            check["referenced_forms"]
                        )
                        xd_span.set_attribute("edc.cross_form.forms_queried",
                                            len(check["referenced_forms"]))

                check_result = evaluate_single_check(check, form_data)
                check_span.set_attribute("edc.check.passed", check_result["passed"])

                if not check_result["passed"]:
                    if check["severity"] == "error":
                        results["failures"] += 1
                        results["failed_checks"].append({
                            "field": check_result["field"],
                            "message": check_result["message"],
                        })
                    elif check["severity"] == "warning":
                        results["warnings"] += 1

        span.set_attribute("edc.edit_checks.total_failures", results["failures"])
        return results
```

## Tracing Data Query Resolution

Data queries are how monitors and medical reviewers flag issues with collected data:

```python
@app.post("/api/v1/studies/{study_id}/queries/{query_id}/respond")
async def respond_to_query(study_id: str, query_id: str, request: Request):
    """Handle a response to a data query from a site coordinator."""
    payload = await request.json()

    with tracer.start_as_current_span("edc.query.respond") as span:
        span.set_attribute("edc.study_id", study_id)
        span.set_attribute("edc.query_id", query_id)
        span.set_attribute("edc.query.response_type", payload.get("response_type", ""))

        # Fetch the original query
        with tracer.start_as_current_span("edc.query.fetch") as fetch_span:
            query = get_query(query_id)
            fetch_span.set_attribute("edc.query.age_hours",
                                   (time.time() - query["created_at"]) / 3600)
            fetch_span.set_attribute("edc.query.status", query["status"])

        # Record query resolution time
        resolution_hours = (time.time() - query["created_at"]) / 3600
        span.set_attribute("edc.query.resolution_hours", resolution_hours)

        # Write the response and update audit trail
        with tracer.start_as_current_span("edc.query.update") as update_span:
            update_query_status(query_id, payload)
            update_span.set_attribute("edc.query.new_status", payload.get("response_type"))

        with tracer.start_as_current_span("edc.audit_trail.write") as audit_span:
            create_audit_trail_entries(
                study_id, query["subject_id"], query["form_id"],
                {"action": "query_response", "query_id": query_id}
            )

        return {"status": "updated"}
```

## Key Metrics for Clinical Trials

The metrics that trial operations teams care about are: form submission latency by site (slow sites might have connectivity issues), edit check execution time (complex protocols with many cross-form checks can get slow), query generation rate (a spike might indicate a data entry training issue at a site), and query resolution time (regulatory deadlines often require queries to be resolved within a set period). With OpenTelemetry tracing on the EDC platform, you get site-level performance visibility that helps keep global clinical trials running on schedule.
