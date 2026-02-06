# How to Monitor ACH and Wire Transfer Processing Latency Across Banking Middleware with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, ACH, Wire Transfer, Banking Middleware

Description: Monitor and reduce ACH and wire transfer processing latency across banking middleware layers using OpenTelemetry tracing and metrics.

ACH and wire transfers pass through multiple middleware layers before they reach the Federal Reserve or correspondent banks. Each layer adds latency: message transformation, compliance checks, duplicate detection, routing decisions, and queue processing. When a wire transfer that should complete in minutes takes hours, you need to know exactly which middleware component is the bottleneck. OpenTelemetry gives you that visibility.

## The Middleware Stack

A typical wire transfer passes through these layers:

1. **Origination API** - Receives the transfer request
2. **Message Formatter** - Converts to SWIFT MT103 or ISO 20022 format
3. **Compliance Engine** - OFAC screening, sanctions checks
4. **Duplicate Detection** - Prevents double-sends
5. **Routing Engine** - Determines correspondent bank path
6. **Queue Manager** - Batches and sends to the payment network

For ACH, the flow is similar but uses NACHA file formats and different batch windows.

## Instrumenting the Wire Transfer Pipeline

Let's trace a wire transfer through each middleware component.

```python
# wire_transfer_pipeline.py
from opentelemetry import trace, metrics
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

tracer = trace.get_tracer("banking.wire.transfer")
meter = metrics.get_meter("banking.wire.transfer")

# Metrics for monitoring latency at each stage
stage_latency = meter.create_histogram(
    "wire.stage.duration_ms",
    description="Duration of each wire transfer processing stage",
    unit="ms"
)

wire_total_latency = meter.create_histogram(
    "wire.total.duration_ms",
    description="Total wire transfer processing time",
    unit="ms"
)

wire_queue_depth = meter.create_up_down_counter(
    "wire.queue.depth",
    description="Current number of wires waiting in queue"
)

def process_wire_transfer(request):
    with tracer.start_as_current_span("wire.transfer.process") as root_span:
        root_span.set_attribute("wire.reference", request.reference)
        root_span.set_attribute("wire.type", request.transfer_type)
        root_span.set_attribute("wire.currency", request.currency)
        root_span.set_attribute("wire.amount_bucket", get_amount_bucket(request.amount))
        root_span.set_attribute("wire.priority", request.priority)

        start_time = time.monotonic()

        # Stage 1: Format the message
        with tracer.start_as_current_span("wire.format_message") as span:
            t0 = time.monotonic()

            if request.transfer_type == "international":
                message = swift_formatter.to_mt103(request)
                span.set_attribute("wire.format", "MT103")
            else:
                message = fedwire_formatter.format(request)
                span.set_attribute("wire.format", "FEDWIRE")

            span.set_attribute("wire.message_size_bytes", len(message.serialize()))
            duration = (time.monotonic() - t0) * 1000
            stage_latency.record(duration, {"stage": "format", "type": request.transfer_type})

        # Stage 2: Compliance screening
        with tracer.start_as_current_span("wire.compliance_check") as span:
            t0 = time.monotonic()

            screening_result = compliance_engine.screen(message)
            span.set_attribute("wire.compliance.ofac_checked", True)
            span.set_attribute("wire.compliance.hit_count", screening_result.hit_count)
            span.set_attribute("wire.compliance.status", screening_result.status)
            span.set_attribute("wire.compliance.lists_checked",
                str(screening_result.lists_checked))

            duration = (time.monotonic() - t0) * 1000
            stage_latency.record(duration, {"stage": "compliance", "type": request.transfer_type})

            if screening_result.status == "hold":
                root_span.set_attribute("wire.outcome", "compliance_hold")
                span.add_event("wire.held_for_review", {
                    "reason": "compliance_hit",
                    "hit_count": screening_result.hit_count
                })
                return WireResult(status="held", reason="compliance_review")

        # Stage 3: Duplicate detection
        with tracer.start_as_current_span("wire.duplicate_check") as span:
            t0 = time.monotonic()

            is_duplicate = duplicate_detector.check(message)
            span.set_attribute("wire.duplicate.detected", is_duplicate)

            duration = (time.monotonic() - t0) * 1000
            stage_latency.record(duration, {"stage": "duplicate_check", "type": request.transfer_type})

            if is_duplicate:
                root_span.set_attribute("wire.outcome", "duplicate_rejected")
                return WireResult(status="rejected", reason="duplicate")

        # Stage 4: Routing
        with tracer.start_as_current_span("wire.routing") as span:
            t0 = time.monotonic()

            route = routing_engine.determine_route(message)
            span.set_attribute("wire.route.correspondent_bank", route.correspondent)
            span.set_attribute("wire.route.hops", route.hop_count)
            span.set_attribute("wire.route.estimated_settlement", route.settlement_estimate)
            span.set_attribute("wire.route.cost_bucket", route.cost_bucket)

            duration = (time.monotonic() - t0) * 1000
            stage_latency.record(duration, {"stage": "routing", "type": request.transfer_type})

        # Stage 5: Queue for sending
        with tracer.start_as_current_span("wire.queue_for_send") as span:
            t0 = time.monotonic()

            wire_queue_depth.add(1, {"priority": request.priority})

            queue_position = send_queue.enqueue(message, route, request.priority)
            span.set_attribute("wire.queue.position", queue_position)
            span.set_attribute("wire.queue.priority", request.priority)

            duration = (time.monotonic() - t0) * 1000
            stage_latency.record(duration, {"stage": "queue", "type": request.transfer_type})

        total_duration = (time.monotonic() - start_time) * 1000
        wire_total_latency.record(total_duration, {"type": request.transfer_type})

        root_span.set_attribute("wire.outcome", "queued")
        root_span.set_attribute("wire.total_processing_ms", total_duration)

        return WireResult(status="queued", reference=request.reference)
```

## Instrumenting ACH Batch Processing

ACH works differently from wire transfers. Transactions are collected into batches and submitted during specific processing windows. Monitoring the batch assembly and submission process is critical.

```python
# ach_batch_processor.py
tracer = trace.get_tracer("banking.ach")

ach_batch_size = meter.create_histogram(
    "ach.batch.size",
    description="Number of transactions per ACH batch",
    unit="transactions"
)

ach_batch_latency = meter.create_histogram(
    "ach.batch.processing_ms",
    description="Time to process an ACH batch",
    unit="ms"
)

def process_ach_batch(batch_window: str):
    with tracer.start_as_current_span("ach.batch.process") as span:
        span.set_attribute("ach.window", batch_window)

        # Collect pending ACH transactions for this window
        with tracer.start_as_current_span("ach.collect_pending") as collect_span:
            pending = ach_queue.get_pending(window=batch_window)
            collect_span.set_attribute("ach.pending_count", len(pending))

            # Separate debits and credits
            debits = [t for t in pending if t.type == "debit"]
            credits = [t for t in pending if t.type == "credit"]
            collect_span.set_attribute("ach.debit_count", len(debits))
            collect_span.set_attribute("ach.credit_count", len(credits))

        # Build the NACHA file
        with tracer.start_as_current_span("ach.build_nacha_file") as nacha_span:
            nacha_file = nacha_builder.build(pending)
            nacha_span.set_attribute("ach.file.batch_count", nacha_file.batch_count)
            nacha_span.set_attribute("ach.file.entry_count", nacha_file.entry_count)
            nacha_span.set_attribute("ach.file.total_debits", float(nacha_file.total_debits))
            nacha_span.set_attribute("ach.file.total_credits", float(nacha_file.total_credits))
            nacha_span.set_attribute("ach.file.size_bytes", nacha_file.size)

        # Validate the file
        with tracer.start_as_current_span("ach.validate") as val_span:
            validation = nacha_validator.validate(nacha_file)
            val_span.set_attribute("ach.validation.passed", validation.passed)
            val_span.set_attribute("ach.validation.errors", str(validation.errors))

        # Submit to the ACH operator
        with tracer.start_as_current_span("ach.submit") as submit_span:
            result = ach_operator.submit(nacha_file)
            submit_span.set_attribute("ach.submission.id", result.submission_id)
            submit_span.set_attribute("ach.submission.accepted", result.accepted)
            submit_span.set_attribute("ach.submission.settlement_date",
                str(result.settlement_date))

        ach_batch_size.record(len(pending), {"window": batch_window})
        span.set_attribute("ach.outcome", "submitted" if result.accepted else "rejected")
```

## Tracking Queue Wait Times

One of the biggest sources of latency in wire and ACH processing is queue wait time. Transactions sit in queues between middleware components, and these wait times are often invisible without proper instrumentation.

```python
# queue_monitor.py
def monitor_queue_wait_times():
    """Periodically sample queue depths and wait times."""
    queues = ["wire_compliance", "wire_routing", "wire_send", "ach_pending", "ach_submit"]

    for queue_name in queues:
        stats = queue_manager.get_stats(queue_name)

        wire_queue_depth.add(
            stats.current_depth - stats.previous_depth,
            {"queue": queue_name}
        )

        stage_latency.record(
            stats.avg_wait_time_ms,
            {"stage": f"queue_wait_{queue_name}", "type": "queue"}
        )
```

## What to Watch For

After instrumenting your ACH and wire middleware, focus your dashboards on these signals:

- **Stage latency percentiles** (p50, p95, p99) broken down by transfer type. Compliance checks often dominate processing time.
- **Queue wait times** between stages. A growing queue indicates a downstream bottleneck.
- **Batch processing time vs window deadline** for ACH. If batch assembly takes longer than the submission window, you will miss settlement cutoffs.
- **Compliance hold rates** that might indicate overly aggressive screening rules or a new sanctions list that is causing false positives.

With OpenTelemetry providing visibility into every stage, you can identify and fix bottlenecks before they cause SLA violations or missed settlement windows.
