# How to Instrument Cruise Line Shore Excursion Booking and Capacity Management with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cruise Line, Shore Excursions, Capacity Management

Description: Instrument cruise line shore excursion booking and capacity management systems using OpenTelemetry for reliable guest experiences.

Cruise lines offer dozens of shore excursions at each port of call, and managing the booking and capacity for these activities is a complex logistics problem. Each excursion has hard capacity limits (the bus holds 40 people, the snorkeling trip can take 12), time-window dependencies (the ship is only in port for 8 hours), and needs to coordinate with third-party local operators. This post shows how to instrument shore excursion booking and capacity management with OpenTelemetry.

## Shore Excursion System Architecture

The excursion system handles:

- Excursion catalog management (descriptions, pricing, capacity per port)
- Availability checking (considering ship schedule, capacity, and time conflicts)
- Booking and waitlist management
- Third-party operator coordination
- Day-of logistics (manifest generation, check-in tracking)

## Instrumenting Excursion Search and Availability

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind
import time

tracer = trace.get_tracer("cruise.excursions")
meter = metrics.get_meter("cruise.excursions")

search_latency = meter.create_histogram(
    "excursion.search_latency_ms",
    description="Time to search available excursions for a port",
    unit="ms",
)

def search_excursions(cruise_id, port_id, guest_id):
    """Search available excursions for a specific port on a specific sailing."""
    with tracer.start_as_current_span(
        "excursion.search",
        kind=SpanKind.SERVER,
        attributes={
            "excursion.cruise_id": cruise_id,
            "excursion.port_id": port_id,
            "excursion.guest_id": guest_id,
        }
    ) as span:
        start = time.time()

        # Get the ship's schedule for this port
        with tracer.start_as_current_span("excursion.get_port_schedule") as sched_span:
            schedule = get_port_schedule(cruise_id, port_id)
            sched_span.set_attribute("excursion.port_name", schedule.port_name)
            sched_span.set_attribute("excursion.arrival_time", str(schedule.arrival))
            sched_span.set_attribute("excursion.departure_time", str(schedule.departure))
            sched_span.set_attribute("excursion.hours_in_port", schedule.hours_in_port)

        # Get all excursions offered at this port
        with tracer.start_as_current_span("excursion.load_catalog") as catalog_span:
            excursions = get_excursion_catalog(port_id, cruise_id)
            catalog_span.set_attribute("excursion.total_offered", len(excursions))

        # Check availability for each excursion
        with tracer.start_as_current_span("excursion.check_availability") as avail_span:
            available_excursions = []
            for exc in excursions:
                availability = check_excursion_availability(exc.id, cruise_id)
                if availability.spots_remaining > 0:
                    exc.availability = availability
                    available_excursions.append(exc)

            avail_span.set_attribute("excursion.available_count", len(available_excursions))
            avail_span.set_attribute("excursion.sold_out_count",
                                     len(excursions) - len(available_excursions))

        # Check for time conflicts with guest's existing bookings
        with tracer.start_as_current_span("excursion.check_conflicts") as conflict_span:
            guest_bookings = get_guest_excursion_bookings(guest_id, cruise_id, port_id)
            conflict_span.set_attribute("excursion.existing_bookings", len(guest_bookings))

            for exc in available_excursions:
                exc.has_conflict = has_time_conflict(exc, guest_bookings)

        # Apply guest-specific pricing (loyalty tier, package deals)
        with tracer.start_as_current_span("excursion.apply_pricing") as price_span:
            guest = load_guest_profile(guest_id)
            for exc in available_excursions:
                exc.guest_price = calculate_guest_price(exc, guest)

            price_span.set_attribute("excursion.loyalty_tier", guest.loyalty_tier)

        latency = (time.time() - start) * 1000
        search_latency.record(latency, {"excursion.port_id": port_id})

        span.set_attribute("excursion.results_count", len(available_excursions))
        return available_excursions
```

## Instrumenting the Booking Flow

Booking an excursion requires capacity reservation and coordination with the local operator:

```python
booking_latency = meter.create_histogram(
    "excursion.booking_latency_ms",
    description="Time to complete an excursion booking",
    unit="ms",
)

booking_outcomes = meter.create_counter(
    "excursion.booking_outcomes_total",
    description="Excursion booking outcomes",
)

capacity_utilization = meter.create_observable_gauge(
    "excursion.capacity_utilization_percent",
    description="Percentage of excursion capacity booked",
    unit="%",
)

def book_excursion(guest_id, excursion_id, cruise_id, guest_count, special_needs=None):
    """Book a shore excursion for one or more guests."""
    with tracer.start_as_current_span(
        "excursion.book",
        kind=SpanKind.SERVER,
        attributes={
            "excursion.guest_id": guest_id,
            "excursion.excursion_id": excursion_id,
            "excursion.cruise_id": cruise_id,
            "excursion.guest_count": guest_count,
            "excursion.has_special_needs": bool(special_needs),
        }
    ) as span:
        start = time.time()

        # Verify capacity with a distributed lock
        with tracer.start_as_current_span("excursion.reserve_capacity") as cap_span:
            reservation = reserve_excursion_capacity(
                excursion_id, cruise_id, guest_count
            )
            cap_span.set_attribute("excursion.capacity_total", reservation.total_capacity)
            cap_span.set_attribute("excursion.capacity_booked", reservation.booked)
            cap_span.set_attribute("excursion.capacity_remaining",
                                    reservation.total_capacity - reservation.booked)
            cap_span.set_attribute("excursion.reservation_granted", reservation.granted)

            if not reservation.granted:
                # Check if waitlist is available
                if reservation.waitlist_available:
                    span.set_attribute("excursion.booking_result", "waitlisted")
                    add_to_waitlist(guest_id, excursion_id, cruise_id, guest_count)
                    booking_outcomes.add(1, {"excursion.outcome": "waitlisted"})
                    return {"status": "waitlisted", "position": reservation.waitlist_position}
                else:
                    span.set_attribute("excursion.booking_result", "sold_out")
                    booking_outcomes.add(1, {"excursion.outcome": "sold_out"})
                    return {"status": "sold_out"}

        # Check for accessibility requirements
        if special_needs:
            with tracer.start_as_current_span("excursion.check_accessibility") as access_span:
                accessible = check_accessibility(excursion_id, special_needs)
                access_span.set_attribute("excursion.accessible", accessible.can_accommodate)
                if not accessible.can_accommodate:
                    release_capacity(reservation.id)
                    span.set_attribute("excursion.booking_result", "accessibility_issue")
                    return {"status": "cannot_accommodate", "reason": accessible.reason}

        # Notify the local operator
        with tracer.start_as_current_span("excursion.notify_operator") as op_span:
            operator = get_excursion_operator(excursion_id)
            notification = notify_operator_booking(operator, excursion_id, guest_count)
            op_span.set_attribute("excursion.operator_name", operator.name)
            op_span.set_attribute("excursion.operator_confirmed", notification.confirmed)

        # Charge the guest's onboard account
        with tracer.start_as_current_span("excursion.charge_account") as charge_span:
            charge = charge_onboard_account(guest_id, excursion_id, guest_count)
            charge_span.set_attribute("excursion.charge_amount", charge.amount)
            charge_span.set_attribute("excursion.charge_currency", charge.currency)
            charge_span.set_attribute("excursion.charge_status", charge.status)

        # Create the booking record
        with tracer.start_as_current_span("excursion.create_record") as record_span:
            booking = create_excursion_booking(
                guest_id=guest_id,
                excursion_id=excursion_id,
                cruise_id=cruise_id,
                guest_count=guest_count,
                charge=charge,
            )
            record_span.set_attribute("excursion.booking_id", booking.id)
            record_span.set_attribute("excursion.confirmation_code", booking.confirmation)

        # Send confirmation
        send_excursion_confirmation(guest_id, booking)

        duration = (time.time() - start) * 1000
        booking_latency.record(duration)
        booking_outcomes.add(1, {"excursion.outcome": "confirmed"})

        span.set_attribute("excursion.booking_result", "confirmed")
        span.set_attribute("excursion.booking_id", booking.id)

        return {
            "status": "confirmed",
            "booking_id": booking.id,
            "confirmation_code": booking.confirmation,
        }
```

## Monitoring Day-of Operations

On the day of the excursion, track check-in and manifest accuracy:

```python
def track_excursion_checkin(excursion_id, cruise_id, guest_id):
    """Track guest check-in for a shore excursion on the day of."""
    with tracer.start_as_current_span(
        "excursion.checkin",
        attributes={
            "excursion.excursion_id": excursion_id,
            "excursion.cruise_id": cruise_id,
            "excursion.guest_id": guest_id,
        }
    ) as span:
        booking = verify_guest_booking(guest_id, excursion_id, cruise_id)
        span.set_attribute("excursion.booking_verified", booking is not None)

        if booking:
            record_checkin(booking.id)

            # Track against manifest
            manifest = get_excursion_manifest(excursion_id, cruise_id)
            span.set_attribute("excursion.manifest_total", manifest.expected_guests)
            span.set_attribute("excursion.checked_in_count", manifest.checked_in)
            span.set_attribute("excursion.checkin_percent",
                               (manifest.checked_in / manifest.expected_guests) * 100
                               if manifest.expected_guests > 0 else 0)
```

## Tracking Cancellation and Refund Patterns

```python
cancellation_reasons = meter.create_counter(
    "excursion.cancellations_total",
    description="Excursion cancellations by reason",
)

def cancel_excursion_booking(booking_id, reason):
    with tracer.start_as_current_span(
        "excursion.cancel",
        attributes={
            "excursion.booking_id": booking_id,
            "excursion.cancellation_reason": reason,
        }
    ) as span:
        booking = load_booking(booking_id)
        refund_amount = calculate_refund(booking, reason)

        span.set_attribute("excursion.refund_amount", refund_amount)
        span.set_attribute("excursion.full_refund", refund_amount == booking.charge_amount)

        process_refund(booking.guest_id, refund_amount)
        release_capacity(booking.excursion_id, booking.cruise_id, booking.guest_count)

        # Promote from waitlist if applicable
        promote_from_waitlist(booking.excursion_id, booking.cruise_id, booking.guest_count)

        cancellation_reasons.add(1, {"excursion.reason": reason})
```

## Conclusion

Instrumenting cruise line shore excursion systems with OpenTelemetry gives both the technology team and the guest experience team visibility into booking performance, capacity utilization, and day-of operations. By tracing from excursion search through capacity management, operator coordination, and guest check-in, you can ensure that shore excursions run smoothly and guests have the experience they paid for.
