# How to Monitor HL7 v2 Message Processing (ADT, ORM, ORU) Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HL7v2, Healthcare Messaging, Latency Monitoring

Description: Monitor the processing latency of HL7 v2 ADT, ORM, and ORU messages through your healthcare integration engine with OpenTelemetry.

HL7 v2 messages are the backbone of hospital system integration. ADT (Admit/Discharge/Transfer) messages keep patient locations current, ORM (Order) messages trigger lab tests and procedures, and ORU (Result) messages deliver lab findings back to clinicians. When any of these message types slow down, clinical workflows break. A delayed ADT message means a patient shows up in the wrong room on the nurse's screen. A slow ORU message means a critical lab result sits in a queue instead of alerting the physician.

This post covers how to instrument HL7 v2 message processing with OpenTelemetry to measure and alert on latency for each message type.

## Parsing and Tracing HL7 v2 Messages

HL7 v2 messages are pipe-delimited text, not JSON or XML. You need to parse the message header (MSH segment) to extract the message type and other metadata before creating spans. Here is a Python implementation using the `hl7` library:

```python
import hl7
import time
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("hl7v2-processor", "1.0.0")

# Set up metrics
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metric_provider = MeterProvider(metric_readers=[metric_reader])
metrics.set_meter_provider(metric_provider)
meter = metrics.get_meter("hl7v2-processor", "1.0.0")

# Histogram for message processing latency, bucketed by message type
processing_latency = meter.create_histogram(
    "hl7v2.message.processing_duration_ms",
    description="Time to process an HL7 v2 message end-to-end",
    unit="ms",
)

# Counter for messages processed
message_counter = meter.create_counter(
    "hl7v2.messages_processed_total",
    description="Total HL7 v2 messages processed",
    unit="messages",
)

# Counter for processing errors
error_counter = meter.create_counter(
    "hl7v2.messages_errors_total",
    description="Total HL7 v2 message processing errors",
    unit="errors",
)
```

## Processing Different Message Types

Each HL7 v2 message type has different processing requirements. Let us trace them individually:

```python
def process_hl7_message(raw_message):
    """
    Main entry point for HL7 v2 message processing.
    Parses the message, identifies its type, and routes it.
    """
    start_time = time.time()

    # Parse the raw HL7 message
    parsed = hl7.parse(raw_message)

    # Extract metadata from the MSH segment
    msh = parsed.segment("MSH")
    message_type = str(msh[9])       # e.g., "ADT^A01", "ORM^O01", "ORU^R01"
    sending_app = str(msh[3])        # e.g., "EPIC", "CERNER"
    sending_facility = str(msh[4])
    message_control_id = str(msh[10])
    message_datetime = str(msh[7])

    # Parse the message type into category and trigger event
    msg_parts = message_type.split("^")
    msg_category = msg_parts[0] if len(msg_parts) > 0 else "UNKNOWN"
    trigger_event = msg_parts[1] if len(msg_parts) > 1 else "UNKNOWN"

    with tracer.start_as_current_span("hl7v2.process") as span:
        span.set_attribute("hl7v2.message_type", msg_category)
        span.set_attribute("hl7v2.trigger_event", trigger_event)
        span.set_attribute("hl7v2.sending_application", sending_app)
        span.set_attribute("hl7v2.sending_facility", sending_facility)
        span.set_attribute("hl7v2.message_control_id", message_control_id)
        span.set_attribute("hl7v2.version", str(msh[12]))

        attrs = {
            "hl7v2.message_type": msg_category,
            "hl7v2.trigger_event": trigger_event,
            "hl7v2.sending_application": sending_app,
        }

        try:
            # Route to the appropriate handler based on message type
            if msg_category == "ADT":
                process_adt_message(parsed, trigger_event)
            elif msg_category == "ORM":
                process_orm_message(parsed, trigger_event)
            elif msg_category == "ORU":
                process_oru_message(parsed, trigger_event)
            else:
                span.add_event("unknown_message_type", {"type": message_type})

            message_counter.add(1, attrs)

        except Exception as e:
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            error_counter.add(1, attrs)
            raise
        finally:
            # Record processing duration regardless of success/failure
            duration_ms = (time.time() - start_time) * 1000
            processing_latency.record(duration_ms, attrs)
```

## Handler for ADT Messages

ADT messages track patient movement through the hospital. Each trigger event represents a different action:

```python
def process_adt_message(parsed, trigger_event):
    """Process ADT (Admit/Discharge/Transfer) messages."""
    with tracer.start_as_current_span("hl7v2.adt.process") as span:
        span.set_attribute("hl7v2.trigger_event", trigger_event)

        # Extract the PV1 (Patient Visit) segment for location info
        pv1 = parsed.segment("PV1")
        if pv1:
            # Record the assigned location (ward/room/bed) - not PHI
            assigned_location = str(pv1[3])
            span.set_attribute("hl7v2.adt.patient_location", assigned_location)

        adt_handlers = {
            "A01": handle_admit,
            "A02": handle_transfer,
            "A03": handle_discharge,
            "A04": handle_registration,
            "A08": handle_update,
        }

        handler = adt_handlers.get(trigger_event)
        if handler:
            with tracer.start_as_current_span(f"hl7v2.adt.{trigger_event}") as event_span:
                handler(parsed)
                event_span.set_attribute("hl7v2.adt.handler", handler.__name__)
        else:
            span.add_event("unhandled_adt_event", {"trigger": trigger_event})
```

## Handler for ORU (Result) Messages

ORU messages are the most latency-sensitive because they carry lab results that might be critical:

```python
def process_oru_message(parsed, trigger_event):
    """Process ORU (Observation Result) messages."""
    with tracer.start_as_current_span("hl7v2.oru.process") as span:
        span.set_attribute("hl7v2.trigger_event", trigger_event)

        # Extract OBR segment (Observation Request) for test info
        obr = parsed.segment("OBR")
        if obr:
            test_code = str(obr[4])  # Universal service identifier
            span.set_attribute("hl7v2.oru.test_code", test_code)
            result_status = str(obr[25])  # Result status (F=Final, P=Preliminary)
            span.set_attribute("hl7v2.oru.result_status", result_status)

        # Count the OBX (Observation) segments to know how many results
        obx_count = 0
        for segment in parsed:
            if str(segment[0]) == "OBX":
                obx_count += 1

        span.set_attribute("hl7v2.oru.observation_count", obx_count)

        # Route the result to the appropriate clinical system
        with tracer.start_as_current_span("hl7v2.oru.route_result") as route_span:
            route_result_to_ehr(parsed)
            route_span.set_attribute("hl7v2.oru.routed", True)

        # Check if this is a critical result that needs immediate alerting
        with tracer.start_as_current_span("hl7v2.oru.check_critical") as crit_span:
            is_critical = check_critical_result(parsed)
            crit_span.set_attribute("hl7v2.oru.is_critical", is_critical)
            if is_critical:
                trigger_critical_alert(parsed)
```

## Collector Configuration for HL7 v2 Monitoring

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  # Group metrics by message type for easier dashboarding
  groupbyattrs:
    keys:
      - hl7v2.message_type
      - hl7v2.trigger_event
      - hl7v2.sending_application

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [groupbyattrs, batch]
      exporters: [otlp]
```

## What to Monitor

Set up dashboards and alerts around these key indicators: ADT message processing should stay under 500ms because nurses need real-time bed management. ORM messages should process within 2 seconds to avoid order entry delays. ORU messages carrying critical results should be processed and routed in under 1 second. If you see latency spikes on a specific trigger event (say, ADT^A08 updates), you know exactly where to investigate. That specificity is what makes per-message-type tracing so valuable in healthcare integration.
