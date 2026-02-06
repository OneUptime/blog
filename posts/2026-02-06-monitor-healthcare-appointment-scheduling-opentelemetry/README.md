# How to Monitor Healthcare Appointment Scheduling System Performance with OpenTelemetry Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Appointment Scheduling, Healthcare, Performance Monitoring

Description: Monitor healthcare appointment scheduling systems with OpenTelemetry tracing to identify bottlenecks and improve patient booking experiences.

Healthcare appointment scheduling is deceptively complex. A patient booking a simple follow-up appointment triggers a cascade of operations: checking provider availability across multiple calendars, verifying insurance eligibility, applying scheduling rules (new patient vs. established, time block restrictions, resource dependencies), and reserving the slot atomically to prevent double-booking. When this system is slow, front desk staff and patients suffer through long hold times and abandoned online bookings.

This post covers how to instrument a healthcare scheduling system with OpenTelemetry to trace every step of the booking process and identify performance bottlenecks.

## Instrumenting the Scheduling API

Let us start with a Python FastAPI-based scheduling service:

```python
from fastapi import FastAPI, HTTPException
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Tracing setup
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("scheduling-service", "1.0.0")

# Metrics setup
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("scheduling-service", "1.0.0")

# Key scheduling metrics
booking_latency = meter.create_histogram(
    "scheduling.booking_latency_ms",
    description="End-to-end booking latency",
    unit="ms",
)

slot_search_latency = meter.create_histogram(
    "scheduling.slot_search_latency_ms",
    description="Time to search for available slots",
    unit="ms",
)

bookings_created = meter.create_counter(
    "scheduling.bookings_created_total",
    description="Total appointments booked",
)

booking_failures = meter.create_counter(
    "scheduling.booking_failures_total",
    description="Total booking failures",
)

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
```

## Tracing Availability Search

Searching for available appointment slots is usually the slowest operation because it queries multiple provider calendars:

```python
@app.get("/api/v1/availability")
async def search_availability(
    specialty: str,
    location: str = None,
    date_start: str = None,
    date_end: str = None,
    visit_type: str = "follow_up",
):
    """Search for available appointment slots."""
    start = time.time()

    with tracer.start_as_current_span("scheduling.availability.search") as span:
        span.set_attribute("scheduling.specialty", specialty)
        span.set_attribute("scheduling.location", location or "any")
        span.set_attribute("scheduling.visit_type", visit_type)

        # Step 1: Find providers matching the criteria
        with tracer.start_as_current_span("scheduling.providers.lookup") as prov_span:
            providers = await find_providers(specialty, location)
            prov_span.set_attribute("scheduling.providers_found", len(providers))

            if not providers:
                span.set_attribute("scheduling.result", "no_providers")
                return {"slots": [], "message": "No providers found for this specialty"}

        # Step 2: Query each provider's calendar for open slots
        all_slots = []
        with tracer.start_as_current_span("scheduling.calendars.query") as cal_span:
            for provider in providers:
                with tracer.start_as_current_span("scheduling.calendar.single") as single_span:
                    single_span.set_attribute("scheduling.provider_id", provider["id"])
                    single_span.set_attribute("scheduling.provider_specialty", specialty)

                    slots = await query_provider_calendar(
                        provider["id"], date_start, date_end, visit_type
                    )
                    single_span.set_attribute("scheduling.slots_found", len(slots))
                    all_slots.extend(slots)

            cal_span.set_attribute("scheduling.total_slots_found", len(all_slots))

        # Step 3: Apply scheduling rules (visit type restrictions, new patient limits)
        with tracer.start_as_current_span("scheduling.rules.apply") as rules_span:
            filtered_slots = apply_scheduling_rules(all_slots, visit_type)
            rules_span.set_attribute("scheduling.slots_after_rules", len(filtered_slots))
            rules_span.set_attribute("scheduling.slots_filtered_out",
                                   len(all_slots) - len(filtered_slots))

        duration_ms = (time.time() - start) * 1000
        slot_search_latency.record(duration_ms, {
            "specialty": specialty,
            "visit_type": visit_type,
        })

        span.set_attribute("scheduling.response.slot_count", len(filtered_slots))
        return {"slots": filtered_slots}
```

## Tracing the Booking Process

The actual booking requires an atomic slot reservation to prevent double-booking:

```python
@app.post("/api/v1/appointments")
async def book_appointment(booking_request: dict):
    """Book an appointment in the selected slot."""
    start = time.time()

    with tracer.start_as_current_span("scheduling.booking.create") as span:
        slot_id = booking_request["slot_id"]
        visit_type = booking_request.get("visit_type", "follow_up")

        span.set_attribute("scheduling.slot_id", slot_id)
        span.set_attribute("scheduling.visit_type", visit_type)
        span.set_attribute("scheduling.source", booking_request.get("source", "portal"))

        try:
            # Step 1: Verify insurance eligibility
            with tracer.start_as_current_span("scheduling.insurance.verify") as ins_span:
                eligibility = await verify_insurance_eligibility(
                    booking_request["insurance_info"],
                    visit_type,
                )
                ins_span.set_attribute("scheduling.insurance.eligible", eligibility["eligible"])
                ins_span.set_attribute("scheduling.insurance.payer",
                                      eligibility.get("payer_name", "unknown"))

                if not eligibility["eligible"]:
                    booking_failures.add(1, {"reason": "insurance_ineligible"})
                    raise HTTPException(
                        status_code=400,
                        detail="Insurance eligibility check failed"
                    )

            # Step 2: Attempt to reserve the slot atomically
            with tracer.start_as_current_span("scheduling.slot.reserve") as reserve_span:
                reserve_span.set_attribute("scheduling.slot_id", slot_id)
                reservation = await reserve_slot_atomic(slot_id)

                if not reservation["success"]:
                    reserve_span.set_attribute("scheduling.reservation.conflict", True)
                    booking_failures.add(1, {"reason": "slot_conflict"})
                    raise HTTPException(
                        status_code=409,
                        detail="Slot is no longer available"
                    )

                reserve_span.set_attribute("scheduling.reservation.success", True)

            # Step 3: Create the appointment record
            with tracer.start_as_current_span("scheduling.appointment.create") as create_span:
                appointment = await create_appointment_record(
                    slot_id=slot_id,
                    patient_info=booking_request["patient_info"],
                    visit_type=visit_type,
                    insurance=eligibility,
                )
                create_span.set_attribute("scheduling.appointment_id",
                                        appointment["appointment_id"])

            # Step 4: Send confirmation notifications
            with tracer.start_as_current_span("scheduling.notifications.send") as notif_span:
                await send_booking_confirmation(appointment)
                notif_span.set_attribute("scheduling.notification.channels",
                                       ["email", "sms"])

            duration_ms = (time.time() - start) * 1000
            booking_latency.record(duration_ms, {
                "visit_type": visit_type,
                "source": booking_request.get("source", "portal"),
                "result": "success",
            })
            bookings_created.add(1, {
                "visit_type": visit_type,
                "source": booking_request.get("source", "portal"),
            })

            span.set_attribute("scheduling.booking.result", "success")
            return {"appointment": appointment}

        except HTTPException:
            raise
        except Exception as e:
            booking_failures.add(1, {"reason": "internal_error"})
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
```

## Tracing Cancellation and Rescheduling

Cancellations and reschedules involve releasing slots and potentially triggering waitlist notifications:

```python
@app.delete("/api/v1/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str, reason: str = "patient_request"):
    """Cancel an appointment and process the waitlist."""
    with tracer.start_as_current_span("scheduling.cancellation") as span:
        span.set_attribute("scheduling.appointment_id", appointment_id)
        span.set_attribute("scheduling.cancellation_reason", reason)

        # Release the slot
        with tracer.start_as_current_span("scheduling.slot.release") as release_span:
            released_slot = await release_appointment_slot(appointment_id)
            release_span.set_attribute("scheduling.slot_id",
                                      released_slot.get("slot_id", ""))

        # Check the waitlist for this provider/time
        with tracer.start_as_current_span("scheduling.waitlist.check") as wait_span:
            waitlist_entries = await check_waitlist(released_slot)
            wait_span.set_attribute("scheduling.waitlist.entries", len(waitlist_entries))

            if waitlist_entries:
                with tracer.start_as_current_span("scheduling.waitlist.notify") as notif_span:
                    notified = await notify_waitlist_patients(waitlist_entries, released_slot)
                    notif_span.set_attribute("scheduling.waitlist.notified", notified)

        return {"status": "cancelled", "waitlist_notified": len(waitlist_entries) > 0}
```

## Performance Benchmarks

For scheduling systems, these are reasonable performance targets: availability search should return in under 3 seconds (patients will abandon a slow search), slot reservation should complete in under 1 second (to minimize double-booking windows), insurance eligibility checks should return in under 5 seconds, and the complete booking flow should finish in under 8 seconds end-to-end. Track the p95 of each operation with OpenTelemetry histograms, and you will quickly find whether your bottleneck is in the calendar queries, the insurance verification, or the database writes.
