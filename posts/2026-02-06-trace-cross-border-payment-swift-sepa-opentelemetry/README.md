# How to Trace Cross-Border Payment (SWIFT/SEPA) Message Flows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cross-Border Payments, SWIFT, SEPA

Description: Trace SWIFT and SEPA cross-border payment message flows end-to-end using OpenTelemetry distributed tracing and metrics.

Cross-border payments are inherently complex. A single payment might pass through the originating bank, a correspondent bank, a clearing system like SWIFT or SEPA, another correspondent bank, and finally the beneficiary bank. At each hop, the message can be delayed, transformed, or rejected. Without proper tracing, investigating a failed or slow payment means manually correlating logs across multiple systems. This post shows how to use OpenTelemetry to trace these message flows end-to-end.

## Understanding the Message Flow

A typical SWIFT MT103 (single customer credit transfer) flow looks like this:

```
Originator Bank -> SWIFT Network -> Intermediary Bank -> SWIFT Network -> Beneficiary Bank
```

Each leg involves message creation, validation, compliance screening, and forwarding. For SEPA Credit Transfers (SCT), the flow goes through a CSM (Clearing and Settlement Mechanism) like STEP2 or RT1.

## Initializing Tracing for Payment Services

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
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

tracer = trace.get_tracer("cross-border-payments")
meter = metrics.get_meter("cross-border-payments")
```

## Tracing Payment Initiation

When a customer initiates a cross-border payment, the originating bank creates the SWIFT message and sends it. This is where the trace begins.

```python
def initiate_cross_border_payment(payment_request):
    """Initiate a SWIFT MT103 payment from the originating bank."""
    with tracer.start_as_current_span("payment.initiate") as span:
        # Set payment attributes for searchability
        uetr = generate_uetr()  # Unique End-to-End Transaction Reference
        span.set_attribute("payment.uetr", uetr)
        span.set_attribute("payment.amount", payment_request.amount)
        span.set_attribute("payment.currency", payment_request.currency)
        span.set_attribute("payment.originator_bic", payment_request.sender_bic)
        span.set_attribute("payment.beneficiary_bic", payment_request.receiver_bic)
        span.set_attribute("payment.message_type", "MT103")

        # Step 1: Validate the payment request
        with tracer.start_as_current_span("payment.validate") as val_span:
            validation = validate_payment(payment_request)
            val_span.set_attribute("validation.passed", validation.passed)
            if not validation.passed:
                span.set_status(trace.StatusCode.ERROR, "Validation failed")
                return {"status": "rejected", "reason": validation.errors}

        # Step 2: Run compliance screening (sanctions, AML)
        with tracer.start_as_current_span("payment.compliance_screening") as comp_span:
            screening = run_compliance_checks(payment_request)
            comp_span.set_attribute("screening.hits", len(screening.hits))
            comp_span.set_attribute("screening.result", screening.result)
            if screening.result == "blocked":
                record_blocked_payment(uetr, screening)
                return {"status": "blocked", "reason": "compliance"}

        # Step 3: Build the SWIFT MT103 message
        with tracer.start_as_current_span("payment.build_message"):
            mt103 = build_mt103_message(payment_request, uetr)

        # Step 4: Send to SWIFT network
        with tracer.start_as_current_span("payment.send_to_swift") as swift_span:
            send_result = send_to_swift_alliance(mt103)
            swift_span.set_attribute("swift.session_id", send_result.session_id)
            swift_span.set_attribute("swift.ack_received", send_result.acked)

        # Persist the span context so we can link it when we receive status updates
        persist_trace_context(uetr, span.get_span_context())

        return {"status": "sent", "uetr": uetr}
```

## Tracing Intermediary Bank Processing

When an intermediary bank receives the message, it processes and forwards it. We link back to the originator's trace using the UETR.

```python
from opentelemetry.trace import Link

def process_incoming_swift_message(swift_message):
    """Process an incoming SWIFT message at the intermediary bank."""
    uetr = swift_message.get_uetr()

    # Try to retrieve the originator's span context for linking
    originator_ctx = retrieve_trace_context(uetr)
    links = [Link(originator_ctx)] if originator_ctx else []

    with tracer.start_as_current_span("payment.intermediary.process", links=links) as span:
        span.set_attribute("payment.uetr", uetr)
        span.set_attribute("payment.message_type", swift_message.msg_type)
        span.set_attribute("intermediary.bic", get_own_bic())

        # Run local compliance screening
        with tracer.start_as_current_span("payment.intermediary.compliance"):
            screening = run_local_compliance(swift_message)
            if screening.result != "clear":
                hold_for_review(uetr, screening)
                return

        # Determine the next hop
        with tracer.start_as_current_span("payment.intermediary.routing") as route_span:
            next_hop = determine_routing(swift_message)
            route_span.set_attribute("routing.next_bic", next_hop.bic)
            route_span.set_attribute("routing.method", next_hop.method)

        # Forward the message
        with tracer.start_as_current_span("payment.intermediary.forward") as fwd_span:
            forward_result = forward_message(swift_message, next_hop)
            fwd_span.set_attribute("forward.success", forward_result.success)

        persist_trace_context(uetr, span.get_span_context())
```

## Tracking Payment Status Updates

SWIFT gpi provides status updates via the tracker. When you receive a status update, record it as a metric and link it to the payment trace.

```python
# Payment lifecycle metrics
payment_duration = meter.create_histogram(
    name="payment.e2e_duration_minutes",
    description="End-to-end payment duration from initiation to credit",
    unit="min"
)

payment_status_counter = meter.create_counter(
    name="payment.status_updates_total",
    description="Count of payment status updates by type"
)

payments_in_flight = meter.create_up_down_counter(
    name="payment.in_flight",
    description="Number of payments currently in transit"
)

def handle_gpi_status_update(status_update):
    """Handle a SWIFT gpi tracker status update."""
    uetr = status_update.uetr
    status = status_update.transaction_status

    payment_status_counter.add(1, attributes={
        "status": status,
        "corridor": f"{status_update.from_country}-{status_update.to_country}",
    })

    if status == "ACCC":  # Accepted and credited
        payment = load_payment(uetr)
        duration_min = (
            status_update.timestamp - payment.initiated_at
        ).total_seconds() / 60

        payment_duration.record(duration_min, attributes={
            "corridor": f"{payment.from_country}-{payment.to_country}",
            "currency": payment.currency,
        })
        payments_in_flight.add(-1)

    elif status == "RJCT":  # Rejected
        payments_in_flight.add(-1)
        record_payment_rejection(uetr, status_update.reason)
```

## SEPA-Specific Monitoring

For SEPA payments, the flow is simpler but the SLA is tighter (same-day or instant). You should track whether payments meet the SCT Inst 10-second deadline.

```python
sepa_sla_breaches = meter.create_counter(
    name="payment.sepa.sla_breaches",
    description="SEPA payments that exceeded the processing time SLA"
)

def process_sepa_instant(payment):
    """Process a SEPA Instant Credit Transfer."""
    with tracer.start_as_current_span("payment.sepa_inst.process") as span:
        start = time.monotonic()
        span.set_attribute("payment.scheme", "SCT_Inst")
        span.set_attribute("payment.amount", payment.amount)

        result = execute_sepa_transfer(payment)
        elapsed_seconds = time.monotonic() - start

        span.set_attribute("processing.duration_seconds", elapsed_seconds)

        # SCT Inst SLA is 10 seconds end-to-end
        if elapsed_seconds > 10:
            sepa_sla_breaches.add(1, attributes={
                "corridor": f"{payment.from_country}-{payment.to_country}",
            })

        return result
```

## Conclusion

Cross-border payments involve multiple organizations and networks, making end-to-end observability a real challenge. By using the UETR as a correlation key, linking spans across organizational boundaries, and tracking payment lifecycle metrics, OpenTelemetry gives you the visibility you need to troubleshoot delays, demonstrate SLA compliance, and optimize your payment corridors.
