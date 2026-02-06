# How to Trace Number Portability (LNP) Request Processing with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, LNP, Number Portability, Tracing, Telecommunications

Description: Trace Local Number Portability request processing workflows with OpenTelemetry for end-to-end visibility into porting operations.

Local Number Portability (LNP) lets subscribers keep their phone number when switching carriers. The porting process involves multiple parties and systems, and when it fails or gets delayed, customers get upset. Tracing the entire LNP workflow with OpenTelemetry gives you visibility into every handoff and helps you meet regulatory timelines.

## LNP Process Overview

A number port typically follows these steps:

1. **Port Request Submission**: New carrier (recipient) submits a port request
2. **Validation**: Number is checked against the NPAC (Number Portability Administration Center) database
3. **Donor Notification**: Current carrier (donor) is notified and validates the request
4. **FOC (Firm Order Confirmation)**: Donor confirms or rejects the port
5. **Activation**: On the scheduled date, the number is switched in the NPAC
6. **Network Updates**: Both carriers update their routing tables
7. **Verification**: Test call to confirm the port worked

## Instrumenting the Port Request Lifecycle

```python
# lnp_tracing.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode, SpanKind
import time
from datetime import datetime

tracer = trace.get_tracer("lnp.porting")
meter = metrics.get_meter("lnp.porting")

# Track port request lifecycle
port_request_counter = meter.create_counter(
    "lnp.port_request.count",
    description="Number of port requests by status",
    unit="{request}",
)

port_duration = meter.create_histogram(
    "lnp.port_request.duration",
    description="Total duration of port request lifecycle",
    unit="h",  # measured in hours since porting takes days
)

validation_latency = meter.create_histogram(
    "lnp.validation.latency",
    description="Time to validate a port request",
    unit="ms",
)

foc_response_time = meter.create_histogram(
    "lnp.foc.response_time",
    description="Time from port request to FOC response",
    unit="h",
)

# Store active port request contexts
active_ports = {}


class PortRequestTracer:
    """Manages OpenTelemetry tracing for a single LNP port request."""

    def __init__(self, port_request_id: str):
        self.port_request_id = port_request_id
        self.root_span = None

    def start_port_request(self, request_data: dict):
        """Begin tracing when a new port request is submitted."""
        self.root_span = tracer.start_span(
            "lnp.port_request.lifecycle",
            kind=SpanKind.SERVER,
            attributes={
                "lnp.port_request_id": self.port_request_id,
                "lnp.ported_number": request_data["tn"],
                "lnp.recipient_spid": request_data["new_carrier_spid"],
                "lnp.donor_spid": request_data["old_carrier_spid"],
                "lnp.port_type": request_data.get("port_type", "simple"),
                "lnp.requested_due_date": request_data["due_date"],
            },
        )
        active_ports[self.port_request_id] = self
        port_request_counter.add(1, {"status": "submitted"})

    def trace_validation(self, tn: str):
        """Trace the number validation step."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "lnp.validate", context=ctx
        ) as span:
            start = time.time()

            span.set_attributes({
                "lnp.ported_number": tn,
                "lnp.port_request_id": self.port_request_id,
            })

            # Check NPAC database for number ownership
            npac_result = query_npac(tn)
            span.set_attribute("lnp.npac.current_lrn", npac_result.lrn)
            span.set_attribute("lnp.npac.current_spid", npac_result.spid)

            # Validate number is portable
            if not npac_result.is_portable:
                span.set_status(StatusCode.ERROR, "Number not portable")
                port_request_counter.add(1, {"status": "validation_failed"})
                return False

            # Check for pending port conflicts
            if npac_result.has_pending_port:
                span.set_status(StatusCode.ERROR, "Conflicting port in progress")
                port_request_counter.add(1, {"status": "conflict"})
                return False

            elapsed = (time.time() - start) * 1000
            validation_latency.record(elapsed)
            return True

    def trace_donor_notification(self):
        """Trace the notification sent to the donor carrier."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "lnp.donor_notification", context=ctx
        ) as span:
            span.set_attribute("lnp.port_request_id", self.port_request_id)

            # Send LSR (Local Service Request) to donor
            lsr_response = send_lsr_to_donor(self.port_request_id)
            span.set_attributes({
                "lnp.lsr.message_id": lsr_response.message_id,
                "lnp.lsr.sent_at": lsr_response.timestamp,
                "lnp.lsr.delivery_status": lsr_response.status,
            })

            if lsr_response.status != "delivered":
                span.set_status(StatusCode.ERROR, "LSR delivery failed")

    def trace_foc_received(self, foc_data: dict):
        """Trace the FOC response from the donor carrier."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "lnp.foc_received", context=ctx
        ) as span:
            span.set_attributes({
                "lnp.port_request_id": self.port_request_id,
                "lnp.foc.result": foc_data["result"],
                "lnp.foc.confirmed_due_date": foc_data.get("due_date"),
            })

            if foc_data["result"] == "confirmed":
                port_request_counter.add(1, {"status": "foc_confirmed"})
                # Calculate time from submission to FOC
                submission_time = self.root_span.start_time
                hours_elapsed = calculate_hours_elapsed(submission_time)
                foc_response_time.record(hours_elapsed)
            elif foc_data["result"] == "rejected":
                span.set_status(StatusCode.ERROR,
                    f"FOC rejected: {foc_data.get('reason', 'unknown')}")
                span.set_attribute("lnp.foc.reject_reason", foc_data.get("reason"))
                port_request_counter.add(1, {"status": "foc_rejected"})

    def trace_activation(self):
        """Trace the number activation in NPAC."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "lnp.activation", context=ctx
        ) as span:
            span.set_attribute("lnp.port_request_id", self.port_request_id)

            # Submit activation to NPAC
            activation_result = activate_in_npac(self.port_request_id)
            span.set_attributes({
                "lnp.activation.new_lrn": activation_result.new_lrn,
                "lnp.activation.broadcast_status": activation_result.broadcast_status,
                "lnp.activation.timestamp": activation_result.activated_at,
            })

            if activation_result.success:
                port_request_counter.add(1, {"status": "activated"})
            else:
                span.set_status(StatusCode.ERROR, "Activation failed in NPAC")
                port_request_counter.add(1, {"status": "activation_failed"})

            return activation_result

    def trace_network_update(self, carrier_type: str):
        """Trace the routing table update in the carrier network."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "lnp.network_update", context=ctx
        ) as span:
            span.set_attributes({
                "lnp.port_request_id": self.port_request_id,
                "lnp.carrier_type": carrier_type,  # "donor" or "recipient"
            })

            # Update LRN routing in the switch/SBC
            update_result = update_lrn_routing(self.port_request_id, carrier_type)
            span.set_attribute("lnp.routing.switches_updated",
                             update_result.switches_updated)
            span.set_attribute("lnp.routing.propagation_time_ms",
                             update_result.propagation_time)

    def complete(self):
        """Mark the port request as complete and end the root span."""
        if self.root_span:
            self.root_span.set_status(StatusCode.OK)
            self.root_span.end()
            del active_ports[self.port_request_id]
```

## Metrics Dashboard Recommendations

Build dashboards that track:

- **Port requests by status** over time (submitted, validated, FOC confirmed, activated, completed, rejected)
- **Average FOC response time** by donor carrier (some carriers are slower than others)
- **Rejection rate** by reason code (helps identify common issues to fix upstream)
- **Activation success rate** (should be near 100%, failures need immediate attention)
- **End-to-end port duration** compared to regulatory requirements

## Regulatory Compliance

In many jurisdictions, number porting must complete within a specific timeframe (e.g., 1 business day for simple ports in the US). The traces and metrics captured here give you the evidence you need to demonstrate compliance and to identify which party caused a delay when ports miss the deadline.

With OpenTelemetry tracing, every step of the porting process is documented with timestamps and outcomes. When a regulator asks why a port took 5 days instead of 1, you can pull the trace and show exactly where the delay occurred.
