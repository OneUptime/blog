# How to Monitor SCORM/xAPI Learning Record Store (LRS) Data Ingestion with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SCORM, xAPI, Learning Analytics

Description: Monitor SCORM and xAPI Learning Record Store data ingestion pipelines with OpenTelemetry for reliable learning analytics.

Learning Record Stores (LRS) are the central repositories for learner activity data in modern education systems. They ingest xAPI statements and SCORM data from dozens of content sources, and any delay or data loss in this pipeline means incomplete learning analytics, broken progress tracking, and inaccurate compliance reporting. This post walks through instrumenting your LRS data ingestion pipeline with OpenTelemetry.

## Understanding the Data Flow

An LRS receives data from multiple sources:

- SCORM packages running inside an LMS send completion and score data
- xAPI-enabled content sends granular interaction statements
- Mobile learning apps send offline activity batches
- Third-party tools like video players and simulation engines send engagement data

Each source sends data in slightly different patterns. SCORM sends a burst of data at course completion, while xAPI can send statements continuously throughout a learning session.

## Instrumenting the xAPI Statement Endpoint

The primary entry point for an LRS is the xAPI statements endpoint. Here is how to instrument it:

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind, StatusCode
import json

tracer = trace.get_tracer("lrs.ingestion")
meter = metrics.get_meter("lrs.ingestion")

# Metrics for ingestion monitoring
statements_received = meter.create_counter(
    "lrs.statements_received_total",
    description="Total xAPI statements received",
)

statements_rejected = meter.create_counter(
    "lrs.statements_rejected_total",
    description="Total xAPI statements rejected due to validation errors",
)

ingestion_latency = meter.create_histogram(
    "lrs.ingestion_latency_ms",
    description="Time to process and store an xAPI statement batch",
    unit="ms",
)

def handle_xapi_statements(request):
    """Handle incoming xAPI statement submissions."""
    with tracer.start_as_current_span(
        "lrs.receive_statements",
        kind=SpanKind.SERVER,
        attributes={
            "lrs.content_type": request.content_type,
            "lrs.source_ip": request.remote_addr,
        }
    ) as span:
        statements = json.loads(request.body)

        # Handle both single statement and batch submissions
        if isinstance(statements, dict):
            statements = [statements]

        span.set_attribute("lrs.batch_size", len(statements))
        span.set_attribute("lrs.submission_type", "batch" if len(statements) > 1 else "single")

        # Validate each statement
        valid_statements = []
        for i, stmt in enumerate(statements):
            with tracer.start_as_current_span(
                "lrs.validate_statement",
                attributes={
                    "lrs.statement_index": i,
                    "lrs.verb": stmt.get("verb", {}).get("id", "unknown"),
                    "lrs.actor_type": stmt.get("actor", {}).get("objectType", "Agent"),
                }
            ) as val_span:
                validation = validate_xapi_statement(stmt)
                val_span.set_attribute("lrs.validation_passed", validation.is_valid)

                if validation.is_valid:
                    valid_statements.append(stmt)
                    statements_received.add(1, {"lrs.verb": stmt["verb"]["id"]})
                else:
                    statements_rejected.add(1, {"lrs.reason": validation.error_code})
                    val_span.set_status(StatusCode.ERROR, validation.error_message)

        # Store valid statements
        if valid_statements:
            with tracer.start_as_current_span(
                "lrs.store_statements",
                attributes={
                    "lrs.store_count": len(valid_statements),
                }
            ) as store_span:
                result = store_statements_batch(valid_statements)
                store_span.set_attribute("lrs.stored_count", result.stored_count)
                store_span.set_attribute("lrs.store_duration_ms", result.duration_ms)

        span.set_attribute("lrs.valid_count", len(valid_statements))
        span.set_attribute("lrs.rejected_count", len(statements) - len(valid_statements))

        return {"stored": len(valid_statements)}
```

## Monitoring SCORM Data Translation

SCORM data arrives in a different format and needs to be translated to xAPI before storage. This translation step is a common source of data quality issues:

```python
tracer_scorm = trace.get_tracer("lrs.scorm")

scorm_translation_errors = meter.create_counter(
    "lrs.scorm_translation_errors_total",
    description="Errors during SCORM to xAPI translation",
)

def translate_scorm_to_xapi(scorm_data, course_id, student_id):
    """Convert SCORM 1.2 or 2004 data model to xAPI statements."""
    with tracer_scorm.start_as_current_span(
        "lrs.scorm_translate",
        attributes={
            "lrs.scorm_version": scorm_data.get("version", "1.2"),
            "lrs.course_id": course_id,
            "lrs.student_id": student_id,
        }
    ) as span:
        statements = []

        # Translate completion status
        if "cmi.core.lesson_status" in scorm_data:
            status = scorm_data["cmi.core.lesson_status"]
            span.set_attribute("lrs.scorm_status", status)

            verb_map = {
                "completed": "http://adlnet.gov/expapi/verbs/completed",
                "passed": "http://adlnet.gov/expapi/verbs/passed",
                "failed": "http://adlnet.gov/expapi/verbs/failed",
                "incomplete": "http://adlnet.gov/expapi/verbs/progressed",
            }

            if status in verb_map:
                statements.append(build_xapi_statement(
                    actor_id=student_id,
                    verb=verb_map[status],
                    object_id=course_id,
                ))

        # Translate score
        if "cmi.core.score.raw" in scorm_data:
            try:
                raw_score = float(scorm_data["cmi.core.score.raw"])
                max_score = float(scorm_data.get("cmi.core.score.max", 100))
                scaled = raw_score / max_score if max_score > 0 else 0

                span.set_attribute("lrs.scorm_score_raw", raw_score)
                span.set_attribute("lrs.scorm_score_scaled", scaled)

                statements.append(build_xapi_statement(
                    actor_id=student_id,
                    verb="http://adlnet.gov/expapi/verbs/scored",
                    object_id=course_id,
                    result={"score": {"raw": raw_score, "max": max_score, "scaled": scaled}},
                ))
            except (ValueError, ZeroDivisionError) as e:
                scorm_translation_errors.add(1, {"lrs.error_type": "score_parse"})
                span.record_exception(e)

        # Translate time spent
        if "cmi.core.session_time" in scorm_data:
            duration = parse_scorm_timespan(scorm_data["cmi.core.session_time"])
            span.set_attribute("lrs.session_duration_seconds", duration)

        span.set_attribute("lrs.statements_generated", len(statements))
        return statements
```

## Tracking Batch Processing Performance

Many LRS implementations process statements in batches for efficiency. Monitor batch processing to detect throughput degradation:

```python
batch_size_histogram = meter.create_histogram(
    "lrs.batch_processing_size",
    description="Number of statements processed per batch",
)

batch_duration = meter.create_histogram(
    "lrs.batch_processing_duration_ms",
    description="Time to process a batch of statements",
    unit="ms",
)

def process_statement_batch(statements):
    with tracer.start_as_current_span(
        "lrs.process_batch",
        attributes={
            "lrs.batch_size": len(statements),
        }
    ) as span:
        import time
        start = time.time()

        # Deduplicate by statement ID
        unique = deduplicate_statements(statements)
        span.set_attribute("lrs.duplicates_removed", len(statements) - len(unique))

        # Enrich with additional context
        enriched = enrich_statements(unique)

        # Write to primary store
        write_to_store(enriched)

        # Forward to analytics pipeline
        forward_to_analytics(enriched)

        duration_ms = (time.time() - start) * 1000
        batch_size_histogram.record(len(statements))
        batch_duration.record(duration_ms)

        span.set_attribute("lrs.processing_duration_ms", duration_ms)
```

## Conclusion

Monitoring your LRS data ingestion pipeline with OpenTelemetry ensures that learning activity data flows reliably from content sources to your analytics systems. By instrumenting validation, SCORM translation, and batch processing, you can quickly identify data quality issues and throughput bottlenecks that would otherwise result in incomplete learner records.
