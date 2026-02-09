# How to Instrument Regulatory Reporting Pipeline (MiFID II, Basel III) Generation with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Regulatory Reporting, MiFID II, Basel III

Description: Instrument your MiFID II and Basel III regulatory reporting pipelines with OpenTelemetry to ensure timely and accurate report generation.

Regulatory reporting is one of those things that absolutely cannot fail. Missing a Basel III submission deadline or producing an inaccurate MiFID II transaction report carries real penalties. Yet many financial institutions treat their reporting pipelines as batch jobs that either work or do not, with minimal observability in between. This post shows how to instrument these pipelines with OpenTelemetry so you have full visibility into every step of report generation.

## Anatomy of a Reporting Pipeline

Whether you are generating MiFID II transaction reports, Basel III capital adequacy reports, or any other regulatory submission, the pipeline typically follows this pattern:

1. **Data extraction** - pull raw data from trading systems, risk engines, and reference data stores
2. **Transformation** - apply regulatory logic, calculations, and formatting rules
3. **Validation** - check the report against regulatory schemas and business rules
4. **Submission** - send to the regulator or approved reporting mechanism (ARM)
5. **Reconciliation** - verify acceptance and handle rejections

## Setting Up the Instrumentation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanExporter(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317")
)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

tracer = trace.get_tracer("regulatory-reporting")
meter = metrics.get_meter("regulatory-reporting")
```

## Tracing the Data Extraction Phase

Data extraction is where most problems start. You are pulling from multiple source systems, each of which might be slow, down, or returning stale data.

```python
import time
from datetime import datetime, timezone

# Metrics for tracking extraction completeness and performance
extraction_duration = meter.create_histogram(
    name="reporting.extraction_duration_seconds",
    description="Time to extract data from each source system",
    unit="s"
)

extraction_record_count = meter.create_counter(
    name="reporting.extracted_records_total",
    description="Total records extracted from each source"
)

extraction_errors = meter.create_counter(
    name="reporting.extraction_errors_total",
    description="Errors encountered during data extraction"
)

def extract_reporting_data(report_type, reporting_date):
    """Extract data from all source systems for a regulatory report."""
    with tracer.start_as_current_span("reporting.extract") as span:
        span.set_attribute("report.type", report_type)
        span.set_attribute("report.date", reporting_date.isoformat())

        source_configs = get_source_configs(report_type)
        extracted_data = {}

        for source in source_configs:
            with tracer.start_as_current_span(f"reporting.extract.{source.name}") as src_span:
                src_span.set_attribute("source.name", source.name)
                src_span.set_attribute("source.type", source.db_type)

                start = time.monotonic()
                try:
                    records = source.extract(reporting_date)
                    elapsed = time.monotonic() - start

                    extraction_duration.record(elapsed, {
                        "report_type": report_type,
                        "source": source.name,
                    })
                    extraction_record_count.add(len(records), {
                        "report_type": report_type,
                        "source": source.name,
                    })

                    src_span.set_attribute("source.record_count", len(records))
                    src_span.set_attribute("source.duration_s", elapsed)
                    extracted_data[source.name] = records

                except Exception as e:
                    extraction_errors.add(1, {
                        "report_type": report_type,
                        "source": source.name,
                        "error_type": type(e).__name__,
                    })
                    src_span.set_status(trace.StatusCode.ERROR, str(e))
                    src_span.record_exception(e)
                    raise

        span.set_attribute("extract.total_sources", len(source_configs))
        span.set_attribute("extract.total_records",
                          sum(len(v) for v in extracted_data.values()))
        return extracted_data
```

## Instrumenting the Transformation Phase

The transformation phase applies regulatory calculations. For Basel III, this includes risk-weighted asset calculations, capital ratios, and leverage ratios. For MiFID II, it involves formatting transactions into the required XML schema.

```python
# Track transformation metrics
transform_duration = meter.create_histogram(
    name="reporting.transform_duration_seconds",
    description="Time to transform data for regulatory report",
    unit="s"
)

transform_record_count = meter.create_counter(
    name="reporting.transformed_records_total",
    description="Records successfully transformed"
)

transform_skip_count = meter.create_counter(
    name="reporting.transform_skipped_total",
    description="Records skipped during transformation with reason"
)

def transform_mifid_transactions(raw_data, reporting_date):
    """Transform raw trade data into MiFID II transaction reports."""
    with tracer.start_as_current_span("reporting.transform.mifid2") as span:
        start = time.monotonic()
        reports = []

        for record in raw_data:
            # Apply MiFID II field mapping and enrichment
            try:
                transformed = apply_mifid_mapping(record)

                # Enrich with LEI codes, instrument classification, etc.
                enriched = enrich_with_reference_data(transformed)

                # Validate individual record
                if validate_mifid_record(enriched):
                    reports.append(enriched)
                    transform_record_count.add(1, {"report_type": "mifid2"})
                else:
                    transform_skip_count.add(1, {
                        "report_type": "mifid2",
                        "reason": "validation_failed",
                    })
            except Exception as e:
                transform_skip_count.add(1, {
                    "report_type": "mifid2",
                    "reason": type(e).__name__,
                })

        elapsed = time.monotonic() - start
        transform_duration.record(elapsed, {"report_type": "mifid2"})
        span.set_attribute("transform.input_count", len(raw_data))
        span.set_attribute("transform.output_count", len(reports))
        span.set_attribute("transform.skip_count", len(raw_data) - len(reports))

        return reports
```

## Tracking Validation and Submission

```python
# Validation metrics
validation_errors = meter.create_counter(
    name="reporting.validation_errors_total",
    description="Validation errors by type and field"
)

# Submission metrics
submission_duration = meter.create_histogram(
    name="reporting.submission_duration_seconds",
    description="Time to submit report to regulator",
    unit="s"
)

submission_outcome = meter.create_counter(
    name="reporting.submissions_total",
    description="Report submissions by outcome"
)

def validate_and_submit_report(report, report_type):
    """Validate a regulatory report and submit it."""
    with tracer.start_as_current_span("reporting.validate_and_submit") as span:
        span.set_attribute("report.type", report_type)
        span.set_attribute("report.record_count", len(report.records))

        # Run schema validation
        with tracer.start_as_current_span("reporting.validate.schema") as val_span:
            schema_errors = validate_against_schema(report, report_type)
            val_span.set_attribute("validation.schema_errors", len(schema_errors))
            for err in schema_errors:
                validation_errors.add(1, {
                    "report_type": report_type,
                    "error_type": "schema",
                    "field": err.field,
                })

        # Run business rule validation
        with tracer.start_as_current_span("reporting.validate.business_rules") as br_span:
            rule_errors = validate_business_rules(report, report_type)
            br_span.set_attribute("validation.rule_errors", len(rule_errors))

        if schema_errors or rule_errors:
            span.set_status(trace.StatusCode.ERROR, "Validation failed")
            submission_outcome.add(1, {
                "report_type": report_type,
                "outcome": "validation_failed",
            })
            return {"status": "failed", "errors": schema_errors + rule_errors}

        # Submit to the regulator or ARM
        with tracer.start_as_current_span("reporting.submit") as sub_span:
            start = time.monotonic()
            result = submit_to_regulator(report, report_type)
            elapsed = time.monotonic() - start

            submission_duration.record(elapsed, {"report_type": report_type})
            sub_span.set_attribute("submission.response_code", result.status_code)
            sub_span.set_attribute("submission.reference_id", result.reference_id)

            outcome = "accepted" if result.status_code == 200 else "rejected"
            submission_outcome.add(1, {
                "report_type": report_type,
                "outcome": outcome,
            })

        return {"status": outcome, "reference": result.reference_id}
```

## Monitoring Deadline Compliance

Regulatory reports have strict deadlines. MiFID II transaction reports must be submitted by close of business on T+1. Basel III reports have quarterly deadlines. Track how close you are cutting it.

```python
deadline_buffer = meter.create_histogram(
    name="reporting.deadline_buffer_hours",
    description="Hours remaining before the regulatory deadline when report was submitted",
    unit="h"
)

def record_submission_timing(report_type, submission_time, deadline):
    """Record how much buffer time remained before the deadline."""
    buffer_hours = (deadline - submission_time).total_seconds() / 3600
    deadline_buffer.record(buffer_hours, {
        "report_type": report_type,
    })
    if buffer_hours < 2:
        # Fire an event for dangerously close submissions
        current_span = trace.get_current_span()
        current_span.add_event("deadline_warning", {
            "buffer_hours": buffer_hours,
            "report_type": report_type,
        })
```

## Conclusion

Regulatory reporting pipelines are high-stakes batch processes where failure has direct financial and legal consequences. By instrumenting each phase with OpenTelemetry, from data extraction through submission and reconciliation, you gain the visibility needed to catch problems early, understand processing times, and demonstrate to auditors that your reporting infrastructure is robust and well-monitored.
