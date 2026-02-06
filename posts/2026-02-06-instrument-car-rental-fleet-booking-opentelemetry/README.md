# How to Instrument Car Rental Fleet Availability and Booking System with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Car Rental, Fleet Management, Travel Technology

Description: Instrument car rental fleet availability and booking systems with OpenTelemetry to optimize fleet utilization and booking performance.

Car rental companies manage fleets of thousands of vehicles across dozens of locations. The booking system needs to show real-time availability, handle complex pricing (vehicle class, duration, location surcharges, insurance), and manage inventory that physically moves between locations. This post shows how to instrument a car rental fleet availability and booking system with OpenTelemetry.

## Fleet Availability Challenges

Car rental availability is more complex than hotel or flight inventory because:

- Vehicles physically move between locations (one-way rentals)
- Fleet mix changes constantly as cars are added, removed, or in maintenance
- Availability depends on predicted return times from current rentals
- Overbooking strategies differ by location and vehicle class

## Instrumenting the Availability Check

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind
import time

tracer = trace.get_tracer("carrental.fleet")
meter = metrics.get_meter("carrental.fleet")

availability_latency = meter.create_histogram(
    "carrental.availability_check_latency_ms",
    description="Time to check fleet availability",
    unit="ms",
)

availability_results = meter.create_histogram(
    "carrental.available_vehicles_count",
    description="Number of available vehicles returned per search",
)

def check_availability(location_id, pickup_date, return_date, vehicle_class=None):
    """Check available vehicles for a given location and date range."""
    with tracer.start_as_current_span(
        "carrental.check_availability",
        kind=SpanKind.SERVER,
        attributes={
            "carrental.location_id": location_id,
            "carrental.pickup_date": pickup_date,
            "carrental.return_date": return_date,
            "carrental.vehicle_class": vehicle_class or "any",
            "carrental.rental_days": calculate_days(pickup_date, return_date),
        }
    ) as span:
        start = time.time()

        # Get current fleet at location
        with tracer.start_as_current_span("carrental.get_fleet_status") as fleet_span:
            fleet = get_fleet_at_location(location_id)
            fleet_span.set_attribute("carrental.total_fleet_size", fleet.total)
            fleet_span.set_attribute("carrental.currently_rented", fleet.rented)
            fleet_span.set_attribute("carrental.in_maintenance", fleet.maintenance)
            fleet_span.set_attribute("carrental.on_lot", fleet.on_lot)

        # Check predicted returns (vehicles that will be back before pickup)
        with tracer.start_as_current_span("carrental.predict_returns") as return_span:
            predicted = predict_vehicle_returns(location_id, pickup_date)
            return_span.set_attribute("carrental.predicted_returns", predicted.count)
            return_span.set_attribute("carrental.prediction_confidence", predicted.confidence)

        # Calculate availability by vehicle class
        with tracer.start_as_current_span("carrental.calculate_availability") as calc_span:
            available = calculate_available_inventory(
                fleet, predicted, pickup_date, return_date, vehicle_class
            )
            calc_span.set_attribute("carrental.available_count", len(available))

            # Group by class for detailed visibility
            by_class = group_by_vehicle_class(available)
            for cls, vehicles in by_class.items():
                calc_span.set_attribute(f"carrental.available_{cls}", len(vehicles))

        # Get pricing for available vehicles
        with tracer.start_as_current_span("carrental.calculate_pricing") as price_span:
            priced = calculate_rental_pricing(
                available, location_id, pickup_date, return_date
            )
            price_span.set_attribute("carrental.min_daily_rate",
                                     min(v.daily_rate for v in priced) if priced else 0)
            price_span.set_attribute("carrental.max_daily_rate",
                                     max(v.daily_rate for v in priced) if priced else 0)

        latency = (time.time() - start) * 1000
        availability_latency.record(latency, {
            "carrental.location_id": location_id,
        })
        availability_results.record(len(priced), {
            "carrental.location_id": location_id,
            "carrental.vehicle_class": vehicle_class or "any",
        })

        span.set_attribute("carrental.results_count", len(priced))
        return priced
```

## Instrumenting the Booking Flow

```python
booking_latency = meter.create_histogram(
    "carrental.booking_latency_ms",
    description="Time to complete a car rental booking",
    unit="ms",
)

booking_outcomes = meter.create_counter(
    "carrental.booking_outcomes_total",
    description="Booking attempts by outcome",
)

def create_booking(customer_id, vehicle_id, pickup_location, return_location,
                   pickup_date, return_date, extras):
    """Create a car rental reservation."""
    with tracer.start_as_current_span(
        "carrental.create_booking",
        kind=SpanKind.SERVER,
        attributes={
            "carrental.customer_id": customer_id,
            "carrental.vehicle_id": vehicle_id,
            "carrental.pickup_location": pickup_location,
            "carrental.return_location": return_location,
            "carrental.is_one_way": pickup_location != return_location,
            "carrental.rental_days": calculate_days(pickup_date, return_date),
        }
    ) as span:
        start = time.time()

        # Validate vehicle still available (could have been booked since search)
        with tracer.start_as_current_span("carrental.validate_availability") as val_span:
            still_available = verify_vehicle_available(vehicle_id, pickup_date, return_date)
            val_span.set_attribute("carrental.still_available", still_available)

            if not still_available:
                span.set_attribute("carrental.booking_result", "unavailable")
                booking_outcomes.add(1, {"carrental.outcome": "unavailable"})
                return {"status": "unavailable"}

        # Calculate final pricing with all extras
        with tracer.start_as_current_span("carrental.final_pricing") as price_span:
            pricing = calculate_final_price(
                vehicle_id, pickup_location, return_location,
                pickup_date, return_date, extras
            )
            price_span.set_attribute("carrental.base_rate", pricing.base_rate)
            price_span.set_attribute("carrental.extras_total", pricing.extras_total)
            price_span.set_attribute("carrental.taxes", pricing.taxes)
            price_span.set_attribute("carrental.total_price", pricing.total)

            if pickup_location != return_location:
                price_span.set_attribute("carrental.one_way_fee", pricing.one_way_fee)

        # Reserve the vehicle
        with tracer.start_as_current_span("carrental.reserve_vehicle") as reserve_span:
            reservation = reserve_vehicle(vehicle_id, pickup_date, return_date, customer_id)
            reserve_span.set_attribute("carrental.reservation_id", reservation.id)
            reserve_span.set_attribute("carrental.confirmation_number", reservation.confirmation)

        # Process payment hold
        with tracer.start_as_current_span("carrental.payment_hold") as pay_span:
            payment = authorize_rental_payment(customer_id, pricing.total)
            pay_span.set_attribute("carrental.payment_status", payment.status)
            pay_span.set_attribute("carrental.auth_amount", payment.auth_amount)

            if payment.status != "approved":
                # Release the reservation
                release_vehicle_reservation(reservation.id)
                span.set_attribute("carrental.booking_result", "payment_failed")
                booking_outcomes.add(1, {"carrental.outcome": "payment_failed"})
                return {"status": "payment_failed"}

        duration = (time.time() - start) * 1000
        booking_latency.record(duration)
        booking_outcomes.add(1, {"carrental.outcome": "success"})

        span.set_attribute("carrental.booking_result", "success")
        span.set_attribute("carrental.confirmation_number", reservation.confirmation)

        return {
            "status": "confirmed",
            "confirmation": reservation.confirmation,
            "total_price": pricing.total,
        }
```

## Monitoring Fleet Utilization

Track fleet utilization metrics to help the business optimize fleet size and mix:

```python
fleet_utilization = meter.create_observable_gauge(
    "carrental.fleet_utilization_percent",
    description="Percentage of fleet currently rented out",
    unit="%",
)

vehicles_in_maintenance = meter.create_observable_gauge(
    "carrental.vehicles_in_maintenance",
    description="Number of vehicles currently in maintenance",
)

def collect_fleet_metrics(location_id):
    """Periodic collection of fleet status metrics."""
    fleet = get_fleet_at_location(location_id)
    utilization = (fleet.rented / fleet.total) * 100 if fleet.total > 0 else 0

    # These are recorded by the observable gauge callbacks
    return {
        "utilization": utilization,
        "maintenance": fleet.maintenance,
        "on_lot": fleet.on_lot,
    }
```

## Conclusion

Instrumenting car rental fleet systems with OpenTelemetry gives you visibility into both the technical performance (search latency, booking success rates) and business metrics (fleet utilization, pricing distribution). By tracing availability checks through return prediction and pricing calculation, you can optimize your system to maximize both customer experience and fleet revenue.
