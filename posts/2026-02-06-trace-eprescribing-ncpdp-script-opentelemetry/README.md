# How to Trace Prescription E-Prescribing Workflows (NCPDP SCRIPT) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Prescribing, NCPDP SCRIPT, Pharmacy

Description: Trace the complete e-prescribing workflow from prescription creation through NCPDP SCRIPT transmission to pharmacy fulfillment using OpenTelemetry.

E-prescribing through the NCPDP SCRIPT standard is how most prescriptions move from a physician's EHR to a pharmacy system in the United States. The workflow involves multiple parties: the prescriber's system, a clearinghouse (like Surescripts), and the pharmacy management system. When a prescription gets lost or delayed, patient care suffers directly. A patient standing at the pharmacy counter waiting for a prescription that never arrived is a real and common problem.

This post shows how to trace the full e-prescribing workflow with OpenTelemetry, from the moment a clinician signs a prescription through delivery confirmation from the pharmacy.

## The E-Prescribing Flow

The standard NCPDP SCRIPT flow works like this: The prescriber's system creates a NewRx message and sends it to the Surescripts network. Surescripts validates the message, routes it to the correct pharmacy, and the pharmacy responds with a Status message. There may also be RxChangeRequest and RxChangeResponse messages if the pharmacy needs a substitution.

Let us instrument each step.

## Tracing Prescription Creation and Submission

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import time

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("eprescribing-service", "1.0.0")

def create_and_send_prescription(prescription_data):
    """
    Handle the full lifecycle of creating and sending an e-prescription.
    """
    with tracer.start_as_current_span("eprescribing.new_rx.workflow") as span:
        rx_id = prescription_data["prescription_id"]
        span.set_attribute("eprescribing.prescription_id", rx_id)
        span.set_attribute("eprescribing.message_type", "NewRx")
        span.set_attribute("eprescribing.version", "2017071")  # NCPDP SCRIPT version

        # Step 1: Validate the prescription data
        with tracer.start_as_current_span("eprescribing.validate") as val_span:
            validation_result = validate_prescription(prescription_data)
            val_span.set_attribute("eprescribing.validation.passed", validation_result["valid"])
            val_span.set_attribute(
                "eprescribing.validation.warnings",
                len(validation_result.get("warnings", []))
            )

            if not validation_result["valid"]:
                span.set_status(trace.Status(
                    trace.StatusCode.ERROR, "Prescription validation failed"
                ))
                return {"status": "validation_failed", "errors": validation_result["errors"]}

        # Step 2: Build the NCPDP SCRIPT XML message
        with tracer.start_as_current_span("eprescribing.build_script_message") as build_span:
            script_xml = build_ncpdp_script_message(prescription_data)
            build_span.set_attribute("eprescribing.message_size_bytes", len(script_xml))
            build_span.set_attribute("eprescribing.drug_coded", True)
            build_span.set_attribute(
                "eprescribing.controlled_substance",
                prescription_data.get("dea_schedule", 0) > 0
            )

        # Step 3: Sign the message (required for controlled substances via EPCS)
        if prescription_data.get("dea_schedule", 0) > 0:
            with tracer.start_as_current_span("eprescribing.epcs_sign") as sign_span:
                sign_span.set_attribute("eprescribing.dea_schedule", prescription_data["dea_schedule"])
                signed_xml = sign_epcs_message(script_xml, prescription_data["prescriber_id"])
                sign_span.set_attribute("eprescribing.epcs.signed", True)
                script_xml = signed_xml

        # Step 4: Send to the Surescripts network
        with tracer.start_as_current_span("eprescribing.send_to_network") as send_span:
            send_span.set_attribute("eprescribing.network", "surescripts")
            send_span.set_attribute("eprescribing.pharmacy_ncpdp_id",
                                   prescription_data["pharmacy_ncpdp_id"])

            response = send_to_surescripts(script_xml)

            send_span.set_attribute("eprescribing.network_status", response["status"])
            send_span.set_attribute("eprescribing.network_message_id",
                                   response.get("message_id", ""))

            if response["status"] != "accepted":
                send_span.set_status(trace.Status(
                    trace.StatusCode.ERROR,
                    f"Network rejected: {response.get('error_code', 'unknown')}"
                ))

        return response
```

## Tracing Pharmacy Status Responses

When the pharmacy processes the prescription, they send back a Status message. We need to trace the receipt and processing of these responses:

```python
def handle_pharmacy_status(status_message):
    """
    Handle a Status message returned from the pharmacy.
    This closes the loop on the prescription workflow.
    """
    with tracer.start_as_current_span("eprescribing.status.received") as span:
        # Parse the NCPDP SCRIPT Status message
        parsed = parse_ncpdp_script(status_message)

        rx_id = parsed.get("relates_to_message_id", "unknown")
        status_code = parsed.get("status_code", "unknown")

        span.set_attribute("eprescribing.prescription_id", rx_id)
        span.set_attribute("eprescribing.message_type", "Status")
        span.set_attribute("eprescribing.status_code", status_code)

        # Map NCPDP status codes to human-readable names
        status_map = {
            "000": "accepted",       # Prescription received successfully
            "001": "accepted_changes", # Accepted with changes
            "010": "rejected",       # Pharmacy rejected the prescription
        }
        human_status = status_map.get(status_code, "unknown")
        span.set_attribute("eprescribing.status_description", human_status)

        # Calculate the round-trip time from NewRx to Status
        original_send_time = get_original_send_time(rx_id)
        if original_send_time:
            round_trip_seconds = time.time() - original_send_time
            span.set_attribute("eprescribing.round_trip_seconds", round_trip_seconds)

        # Route based on status
        if status_code == "010":
            with tracer.start_as_current_span("eprescribing.rejection.handle") as rej_span:
                rejection_reason = parsed.get("rejection_reason", "")
                rej_span.set_attribute("eprescribing.rejection_reason", rejection_reason)
                notify_prescriber_of_rejection(rx_id, rejection_reason)
```

## Tracing RxChangeRequest and RxChangeResponse

Pharmacies sometimes need to request changes to a prescription. This back-and-forth needs tracing too:

```python
def handle_rx_change_request(change_request_message):
    """Handle an RxChangeRequest from the pharmacy."""
    with tracer.start_as_current_span("eprescribing.rx_change.request_received") as span:
        parsed = parse_ncpdp_script(change_request_message)

        span.set_attribute("eprescribing.message_type", "RxChangeRequest")
        span.set_attribute("eprescribing.change_type",
                          parsed.get("change_request_type", "unknown"))
        span.set_attribute("eprescribing.original_rx_id",
                          parsed.get("original_prescription_id", ""))

        change_type = parsed.get("change_request_type", "")
        span.set_attribute("eprescribing.change_reason", change_type)

        # Possible change types:
        # - "generic_substitution" -- pharmacy wants to use generic
        # - "therapeutic_alternative" -- different drug in same class
        # - "prior_authorization" -- insurance requires PA
        # - "drug_not_in_stock" -- pharmacy does not have the drug

        # Queue for prescriber review
        with tracer.start_as_current_span("eprescribing.rx_change.queue_for_review") as q_span:
            queue_position = queue_change_for_prescriber(parsed)
            q_span.set_attribute("eprescribing.queue_position", queue_position)

        return {"status": "queued_for_review"}


def send_rx_change_response(original_rx_id, approved, prescriber_notes=""):
    """Send an RxChangeResponse back to the pharmacy."""
    with tracer.start_as_current_span("eprescribing.rx_change.response_send") as span:
        span.set_attribute("eprescribing.message_type", "RxChangeResponse")
        span.set_attribute("eprescribing.original_rx_id", original_rx_id)
        span.set_attribute("eprescribing.change_approved", approved)

        response_xml = build_rx_change_response(original_rx_id, approved, prescriber_notes)

        with tracer.start_as_current_span("eprescribing.send_to_network") as send_span:
            result = send_to_surescripts(response_xml)
            send_span.set_attribute("eprescribing.network_status", result["status"])

        return result
```

## Metrics for E-Prescribing SLAs

Track the metrics that your operations team and compliance officers care about:

```python
from opentelemetry import metrics

meter = metrics.get_meter("eprescribing-metrics", "1.0.0")

# Time from prescriber signing to network acceptance
submission_latency = meter.create_histogram(
    "eprescribing.submission_latency_ms",
    description="Time from prescription creation to network acceptance",
    unit="ms",
)

# Time from NewRx to pharmacy Status response
round_trip_time = meter.create_histogram(
    "eprescribing.round_trip_seconds",
    description="Round-trip time from NewRx send to pharmacy Status receipt",
    unit="s",
)

# Count of rejections by reason
rejection_counter = meter.create_counter(
    "eprescribing.rejections_total",
    description="Total prescription rejections",
)

# Count of change requests by type
change_request_counter = meter.create_counter(
    "eprescribing.change_requests_total",
    description="Total RxChangeRequests received",
)
```

## Wrapping Up

Tracing e-prescribing workflows gives you visibility into one of the most important healthcare data flows. The key spans to capture are prescription validation, NCPDP SCRIPT message construction, network submission, and pharmacy status receipt. Track the round-trip time as your primary SLA metric since that is what determines whether the patient is waiting at the pharmacy. Alert on rejection spikes since those often indicate a systemic issue like an expired DEA number or a misconfigured pharmacy routing table.
