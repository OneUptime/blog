# How to Trace Student Assignment Submission and Auto-Grading Pipeline Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Auto-Grading, EdTech, Pipeline Monitoring

Description: Trace student assignment submission and auto-grading pipeline performance with OpenTelemetry for reliable EdTech systems.

Assignment submission and auto-grading pipelines are among the most latency-sensitive systems in education technology. When a student clicks "Submit" on an assignment, they expect immediate confirmation. When the system auto-grades their work, they expect results within seconds for simple assignments and within minutes for complex code submissions. This post covers how to trace the entire flow from submission to grade delivery using OpenTelemetry.

## The Submission and Grading Pipeline

A typical auto-grading pipeline involves these steps:

1. Student submits their work (file upload or text entry)
2. Submission is validated (file type, size, deadline check)
3. Submission is queued for grading
4. Grading worker picks up the task
5. Code is compiled/executed in a sandbox (for programming assignments)
6. Test cases are run against the submission
7. Grade is calculated and recorded
8. Student is notified of their results

Each step can fail or become slow, and you need visibility into all of them.

## Instrumenting the Submission Endpoint

Start with the API endpoint where students submit their work:

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind, StatusCode
from datetime import datetime, timezone

tracer = trace.get_tracer("grading.submission")

def submit_assignment(student_id, assignment_id, files, submission_time):
    with tracer.start_as_current_span(
        "submission.receive",
        kind=SpanKind.SERVER,
        attributes={
            "grading.student_id": student_id,
            "grading.assignment_id": assignment_id,
            "grading.file_count": len(files),
            "grading.total_size_bytes": sum(f.size for f in files),
        }
    ) as span:
        # Check if submission is before the deadline
        assignment = get_assignment(assignment_id)
        is_late = submission_time > assignment.deadline

        span.set_attribute("grading.is_late", is_late)
        span.set_attribute("grading.assignment_type", assignment.type)

        # Validate files
        with tracer.start_as_current_span("submission.validate") as val_span:
            validation_result = validate_submission(files, assignment.requirements)
            val_span.set_attribute("grading.validation_passed", validation_result.passed)

            if not validation_result.passed:
                val_span.set_status(StatusCode.ERROR, validation_result.error)
                return {"status": "rejected", "reason": validation_result.error}

        # Store the submission
        with tracer.start_as_current_span("submission.store") as store_span:
            submission_id = store_submission(student_id, assignment_id, files)
            store_span.set_attribute("grading.submission_id", submission_id)

        # Queue for auto-grading if the assignment supports it
        if assignment.auto_grade_enabled:
            with tracer.start_as_current_span("submission.enqueue") as queue_span:
                queue_grading_task(submission_id, assignment)
                queue_span.set_attribute("grading.queue_name", assignment.grading_queue)

        span.set_attribute("grading.submission_id", submission_id)
        return {"status": "accepted", "submission_id": submission_id}
```

## Tracing the Grading Worker

The grading worker runs asynchronously. To maintain trace context across the queue boundary, propagate the trace context in the message:

```python
from opentelemetry import trace, context
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer("grading.worker")

def queue_grading_task(submission_id, assignment):
    """Producer: enqueue a grading task with trace context."""
    carrier = {}
    # Inject current trace context into the message headers
    inject(carrier)

    message = {
        "submission_id": submission_id,
        "assignment_id": assignment.id,
        "assignment_type": assignment.type,
        "trace_context": carrier,
    }
    queue.publish("grading-tasks", message)


def process_grading_task(message):
    """Consumer: pick up a grading task and execute it."""
    # Extract trace context from the message to continue the trace
    ctx = extract(message["trace_context"])

    with tracer.start_as_current_span(
        "grading.execute",
        context=ctx,
        kind=SpanKind.CONSUMER,
        attributes={
            "grading.submission_id": message["submission_id"],
            "grading.assignment_type": message["assignment_type"],
        }
    ) as span:
        submission = load_submission(message["submission_id"])

        if message["assignment_type"] == "code":
            result = grade_code_submission(submission)
        elif message["assignment_type"] == "multiple_choice":
            result = grade_multiple_choice(submission)
        elif message["assignment_type"] == "essay":
            result = grade_essay_submission(submission)
        else:
            span.set_status(StatusCode.ERROR, f"Unknown type: {message['assignment_type']}")
            return

        span.set_attribute("grading.score", result.score)
        span.set_attribute("grading.max_score", result.max_score)
        span.set_attribute("grading.tests_passed", result.tests_passed)
        span.set_attribute("grading.tests_total", result.tests_total)

        save_grade(message["submission_id"], result)
        notify_student(submission.student_id, result)
```

## Instrumenting Code Execution Sandboxes

For programming assignments, the code execution sandbox is the most complex and risky part:

```python
tracer_sandbox = trace.get_tracer("grading.sandbox")

def grade_code_submission(submission):
    with tracer_sandbox.start_as_current_span(
        "grading.sandbox.run",
        attributes={
            "grading.language": submission.language,
            "grading.submission_id": submission.id,
        }
    ) as span:
        # Compile the student's code
        with tracer_sandbox.start_as_current_span("grading.sandbox.compile") as compile_span:
            compile_result = compile_code(submission.code, submission.language)
            compile_span.set_attribute("grading.compile_success", compile_result.success)
            compile_span.set_attribute("grading.compile_time_ms", compile_result.duration_ms)

            if not compile_result.success:
                compile_span.set_status(StatusCode.ERROR, "Compilation failed")
                return GradeResult(score=0, feedback=compile_result.error)

        # Run test cases one by one
        test_results = []
        for i, test_case in enumerate(submission.assignment.test_cases):
            with tracer_sandbox.start_as_current_span(
                f"grading.sandbox.test_case_{i}",
                attributes={
                    "grading.test_case_index": i,
                    "grading.test_case_name": test_case.name,
                    "grading.timeout_ms": test_case.timeout_ms,
                }
            ) as test_span:
                result = run_test_case(
                    compile_result.binary,
                    test_case,
                    timeout_ms=test_case.timeout_ms
                )
                test_span.set_attribute("grading.test_passed", result.passed)
                test_span.set_attribute("grading.test_runtime_ms", result.runtime_ms)
                test_span.set_attribute("grading.test_memory_kb", result.memory_kb)

                if result.timed_out:
                    test_span.add_event("test_timeout")

                test_results.append(result)

        passed = sum(1 for r in test_results if r.passed)
        total = len(test_results)
        span.set_attribute("grading.tests_passed", passed)
        span.set_attribute("grading.tests_total", total)

        score = (passed / total) * submission.assignment.max_score
        return GradeResult(score=score, tests_passed=passed, tests_total=total)
```

## Monitoring Queue Depth and Processing Latency

Track how long submissions wait in the queue before being graded:

```python
meter = metrics.get_meter("grading.pipeline")

queue_depth = meter.create_observable_gauge(
    "grading.queue_depth",
    description="Number of submissions waiting to be graded",
)

grading_latency = meter.create_histogram(
    "grading.end_to_end_latency_seconds",
    description="Time from submission to grade delivery",
    unit="s",
)

queue_wait_time = meter.create_histogram(
    "grading.queue_wait_seconds",
    description="Time a submission spends waiting in the queue",
    unit="s",
)
```

## Conclusion

By tracing the entire submission and grading pipeline with OpenTelemetry, you get clear visibility into where time is spent and where failures occur. Propagating trace context across queue boundaries ensures you can follow a single submission from the student's browser click all the way through sandboxed code execution and back to grade delivery. This is especially important during assignment deadlines when hundreds of submissions arrive simultaneously.
