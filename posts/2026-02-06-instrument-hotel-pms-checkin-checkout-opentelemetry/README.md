# How to Instrument Hotel Property Management System (PMS) Check-In/Check-Out Flows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Hotel PMS, Property Management, Hospitality

Description: Instrument hotel property management system check-in and check-out flows with OpenTelemetry for faster guest service operations.

Hotel Property Management Systems handle the core operations of a hotel, from guest check-in to room assignment, billing, and check-out. When the PMS is slow, the front desk queue grows, guests get frustrated, and the entire hotel experience suffers. This post covers how to instrument check-in and check-out workflows with OpenTelemetry so operations teams can identify bottlenecks and keep guest interactions smooth.

## The Check-In Flow

A typical hotel check-in involves these steps:

1. Look up the reservation by confirmation number or guest name
2. Verify guest identity
3. Check room availability and assign a room
4. Process payment authorization (hold on credit card)
5. Encode key cards
6. Update the reservation status

Each step talks to different subsystems, and any slowness is directly felt by the guest standing at the front desk.

## Instrumenting the Check-In Process

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind, StatusCode

tracer = trace.get_tracer("hotel.pms")
meter = metrics.get_meter("hotel.pms")

checkin_duration = meter.create_histogram(
    "pms.checkin_duration_ms",
    description="Total check-in process duration",
    unit="ms",
)

room_assignment_retries = meter.create_counter(
    "pms.room_assignment_retries_total",
    description="Number of times room assignment had to retry",
)

def check_in_guest(confirmation_number, front_desk_agent_id):
    """Full check-in workflow for a hotel guest."""
    with tracer.start_as_current_span(
        "pms.check_in",
        kind=SpanKind.SERVER,
        attributes={
            "pms.confirmation_number": confirmation_number,
            "pms.agent_id": front_desk_agent_id,
            "pms.operation": "check_in",
        }
    ) as span:
        import time
        start = time.time()

        # Step 1: Look up reservation
        with tracer.start_as_current_span("pms.lookup_reservation") as lookup_span:
            reservation = find_reservation(confirmation_number)
            if not reservation:
                lookup_span.set_status(StatusCode.ERROR, "Reservation not found")
                return {"status": "error", "message": "Reservation not found"}

            lookup_span.set_attribute("pms.guest_name", reservation.guest_name)
            lookup_span.set_attribute("pms.room_type", reservation.room_type)
            lookup_span.set_attribute("pms.nights", reservation.nights)
            lookup_span.set_attribute("pms.rate_code", reservation.rate_code)
            lookup_span.set_attribute("pms.vip_level", reservation.vip_level)

        # Step 2: Verify identity
        with tracer.start_as_current_span("pms.verify_identity") as id_span:
            identity_check = verify_guest_identity(reservation)
            id_span.set_attribute("pms.identity_verified", identity_check.verified)

        # Step 3: Assign room
        with tracer.start_as_current_span("pms.assign_room") as room_span:
            room = assign_room(reservation)
            room_span.set_attribute("pms.assigned_room", room.room_number)
            room_span.set_attribute("pms.room_type_assigned", room.room_type)
            room_span.set_attribute("pms.floor", room.floor)
            room_span.set_attribute("pms.upgrade_given", room.room_type != reservation.room_type)

            if room.assignment_attempts > 1:
                room_span.set_attribute("pms.assignment_attempts", room.assignment_attempts)
                room_assignment_retries.add(room.assignment_attempts - 1)

        # Step 4: Authorize payment
        with tracer.start_as_current_span("pms.authorize_payment") as pay_span:
            auth_amount = calculate_estimated_total(reservation)
            pay_span.set_attribute("pms.auth_amount", auth_amount)
            pay_span.set_attribute("pms.payment_method", reservation.payment_method)

            auth_result = authorize_payment(reservation.payment_token, auth_amount)
            pay_span.set_attribute("pms.auth_status", auth_result.status)
            pay_span.set_attribute("pms.auth_code", auth_result.auth_code)

            if auth_result.status != "approved":
                pay_span.set_status(StatusCode.ERROR, "Payment authorization failed")
                span.set_attribute("pms.checkin_result", "payment_failed")
                return {"status": "payment_failed"}

        # Step 5: Encode key cards
        with tracer.start_as_current_span("pms.encode_keys") as key_span:
            keys = encode_key_cards(room.room_number, reservation.checkout_date, count=2)
            key_span.set_attribute("pms.keys_encoded", len(keys))
            key_span.set_attribute("pms.key_system", keys[0].system_type)

        # Step 6: Update reservation status
        with tracer.start_as_current_span("pms.update_status") as status_span:
            update_reservation_status(
                confirmation_number,
                status="checked_in",
                room_number=room.room_number,
            )
            status_span.set_attribute("pms.new_status", "checked_in")

        duration_ms = (time.time() - start) * 1000
        checkin_duration.record(duration_ms, {
            "pms.room_type": reservation.room_type,
            "pms.vip_level": str(reservation.vip_level),
        })

        span.set_attribute("pms.checkin_result", "success")
        span.set_attribute("pms.checkin_duration_ms", duration_ms)

        return {
            "status": "success",
            "room": room.room_number,
            "checkout_date": reservation.checkout_date,
        }
```

## Instrumenting the Check-Out Flow

Check-out is equally important, especially during the morning rush:

```python
checkout_duration = meter.create_histogram(
    "pms.checkout_duration_ms",
    description="Total check-out process duration",
    unit="ms",
)

def check_out_guest(room_number, agent_id):
    """Full check-out workflow."""
    with tracer.start_as_current_span(
        "pms.check_out",
        kind=SpanKind.SERVER,
        attributes={
            "pms.room_number": room_number,
            "pms.agent_id": agent_id,
            "pms.operation": "check_out",
        }
    ) as span:
        start = time.time()

        # Load the folio (all charges during the stay)
        with tracer.start_as_current_span("pms.load_folio") as folio_span:
            folio = load_guest_folio(room_number)
            folio_span.set_attribute("pms.folio_items", len(folio.items))
            folio_span.set_attribute("pms.folio_total", folio.total)
            folio_span.set_attribute("pms.room_charges", folio.room_charges)
            folio_span.set_attribute("pms.incidental_charges", folio.incidental_charges)

        # Process final payment
        with tracer.start_as_current_span("pms.process_final_payment") as payment_span:
            payment = process_checkout_payment(folio)
            payment_span.set_attribute("pms.payment_amount", payment.amount)
            payment_span.set_attribute("pms.payment_status", payment.status)

        # Update room status to dirty (triggers housekeeping)
        with tracer.start_as_current_span("pms.update_room_status") as room_span:
            update_room_status(room_number, "dirty")
            room_span.set_attribute("pms.room_status", "dirty")

            # Notify housekeeping system
            notify_housekeeping(room_number)
            room_span.set_attribute("pms.housekeeping_notified", True)

        # Deactivate key cards
        with tracer.start_as_current_span("pms.deactivate_keys") as key_span:
            deactivate_key_cards(room_number)
            key_span.set_attribute("pms.keys_deactivated", True)

        # Generate and send receipt
        with tracer.start_as_current_span("pms.send_receipt") as receipt_span:
            receipt = generate_receipt(folio, payment)
            send_receipt_email(folio.guest_email, receipt)
            receipt_span.set_attribute("pms.receipt_sent", True)

        duration_ms = (time.time() - start) * 1000
        checkout_duration.record(duration_ms)
        span.set_attribute("pms.checkout_duration_ms", duration_ms)

        return {"status": "checked_out", "total_charged": payment.amount}
```

## Monitoring Peak Hour Performance

Track how check-in/check-out performance varies throughout the day:

```python
# Observable gauge for current front desk queue
desk_queue_length = meter.create_observable_gauge(
    "pms.front_desk_queue_length",
    description="Number of guests waiting for check-in or check-out",
)

operations_by_hour = meter.create_counter(
    "pms.operations_total",
    description="PMS operations by type and hour",
)
```

## Conclusion

Instrumenting hotel PMS check-in and check-out flows with OpenTelemetry gives operations teams the data they need to optimize the guest experience. By tracing each step of these workflows, from reservation lookup to key card encoding, you can identify which subsystems slow down during peak hours and take targeted action to keep front desk wait times low.
