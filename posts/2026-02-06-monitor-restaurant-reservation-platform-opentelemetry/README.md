# How to Monitor Restaurant Reservation Platform (OpenTable-Style) Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Restaurant Reservations, Hospitality, Platform Monitoring

Description: Monitor restaurant reservation platform performance including search, availability, and booking flows using OpenTelemetry observability.

Restaurant reservation platforms connect millions of diners with thousands of restaurants. These platforms need to handle spiky traffic patterns (Friday and Saturday evenings see 10x normal load), maintain accurate real-time availability across thousands of venues, and deliver search results fast enough to keep diners engaged. This post covers how to instrument a restaurant reservation platform with OpenTelemetry.

## Platform Architecture

A restaurant reservation platform typically includes:

- Search and discovery (find restaurants by cuisine, location, time, party size)
- Real-time availability engine (connected to each restaurant's table inventory)
- Booking service (handles the reservation transaction)
- Notification service (confirmation emails, SMS reminders)
- Review and rating system
- Restaurant dashboard (for hosts to manage their tables)

## Instrumenting Restaurant Search

Search is the entry point for most diners and needs to be fast:

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind
import time

tracer = trace.get_tracer("reservation.platform")
meter = metrics.get_meter("reservation.platform")

search_latency = meter.create_histogram(
    "reservation.search_latency_ms",
    description="Restaurant search response time",
    unit="ms",
)

def search_restaurants(query):
    """Search for available restaurants matching the diner's criteria."""
    with tracer.start_as_current_span(
        "reservation.search",
        kind=SpanKind.SERVER,
        attributes={
            "reservation.location": query.location,
            "reservation.cuisine": query.cuisine or "any",
            "reservation.party_size": query.party_size,
            "reservation.date": query.date,
            "reservation.time_preference": query.preferred_time,
            "reservation.price_range": query.price_range or "any",
        }
    ) as span:
        start = time.time()

        # Step 1: Find matching restaurants by location and cuisine
        with tracer.start_as_current_span("reservation.geo_search") as geo_span:
            candidates = find_restaurants_in_area(
                lat=query.lat,
                lng=query.lng,
                radius_km=query.radius_km,
                cuisine=query.cuisine,
            )
            geo_span.set_attribute("reservation.candidates_found", len(candidates))
            geo_span.set_attribute("reservation.search_radius_km", query.radius_km)

        # Step 2: Check availability for each candidate
        with tracer.start_as_current_span("reservation.bulk_availability") as avail_span:
            available = check_bulk_availability(
                restaurant_ids=[r.id for r in candidates],
                date=query.date,
                time=query.preferred_time,
                party_size=query.party_size,
            )
            avail_span.set_attribute("reservation.available_count", len(available))
            avail_span.set_attribute("reservation.checked_count", len(candidates))

        # Step 3: Rank results
        with tracer.start_as_current_span("reservation.rank_results") as rank_span:
            ranked = rank_restaurants(available, query)
            rank_span.set_attribute("reservation.ranking_algorithm", "v3")
            rank_span.set_attribute("reservation.final_count", len(ranked))

        latency = (time.time() - start) * 1000
        search_latency.record(latency, {
            "reservation.location": query.location,
        })

        span.set_attribute("reservation.results_count", len(ranked))
        span.set_attribute("reservation.search_latency_ms", latency)

        return ranked
```

## Instrumenting Table Availability

The availability engine is the heart of the platform. It needs to track table inventory in real time:

```python
availability_check_latency = meter.create_histogram(
    "reservation.availability_check_latency_ms",
    description="Time to check availability for a single restaurant",
    unit="ms",
)

def check_restaurant_availability(restaurant_id, date, time_slot, party_size):
    """Check if a restaurant can accommodate the requested reservation."""
    with tracer.start_as_current_span(
        "reservation.check_availability",
        attributes={
            "reservation.restaurant_id": restaurant_id,
            "reservation.date": date,
            "reservation.time_slot": time_slot,
            "reservation.party_size": party_size,
        }
    ) as span:
        start = time.time()

        # Load the restaurant's table configuration
        with tracer.start_as_current_span("reservation.load_table_config") as config_span:
            tables = get_table_configuration(restaurant_id)
            config_span.set_attribute("reservation.total_tables", len(tables))
            config_span.set_attribute("reservation.total_covers", sum(t.seats for t in tables))

        # Get existing reservations for that time window
        with tracer.start_as_current_span("reservation.get_existing") as existing_span:
            existing = get_reservations_for_window(
                restaurant_id, date, time_slot, window_minutes=120
            )
            existing_span.set_attribute("reservation.existing_count", len(existing))
            existing_span.set_attribute("reservation.occupied_tables",
                                         len(set(r.table_id for r in existing)))

        # Run table assignment algorithm
        with tracer.start_as_current_span("reservation.find_table") as assign_span:
            available_tables = find_suitable_tables(
                tables, existing, party_size, time_slot
            )
            assign_span.set_attribute("reservation.suitable_tables", len(available_tables))
            assign_span.set_attribute("reservation.has_availability", len(available_tables) > 0)

        # Check nearby time slots if requested time is full
        alternative_times = []
        if not available_tables:
            with tracer.start_as_current_span("reservation.find_alternatives") as alt_span:
                alternative_times = find_alternative_times(
                    restaurant_id, date, party_size, time_slot
                )
                alt_span.set_attribute("reservation.alternatives_found", len(alternative_times))

        latency = (time.time() - start) * 1000
        availability_check_latency.record(latency, {
            "reservation.restaurant_id": restaurant_id,
        })

        span.set_attribute("reservation.is_available", len(available_tables) > 0)

        return {
            "available": len(available_tables) > 0,
            "tables": available_tables,
            "alternatives": alternative_times,
        }
```

## Instrumenting the Booking Flow

```python
booking_latency = meter.create_histogram(
    "reservation.booking_latency_ms",
    description="Time to complete a restaurant reservation",
    unit="ms",
)

booking_outcomes = meter.create_counter(
    "reservation.booking_outcomes_total",
    description="Reservation outcomes by result",
)

def create_reservation(restaurant_id, diner_id, date, time_slot, party_size, special_requests):
    """Create a restaurant reservation."""
    with tracer.start_as_current_span(
        "reservation.create_booking",
        kind=SpanKind.SERVER,
        attributes={
            "reservation.restaurant_id": restaurant_id,
            "reservation.diner_id": diner_id,
            "reservation.party_size": party_size,
            "reservation.date": date,
            "reservation.time_slot": time_slot,
            "reservation.has_special_requests": bool(special_requests),
        }
    ) as span:
        start = time.time()

        # Double-check availability (race condition prevention)
        availability = check_restaurant_availability(
            restaurant_id, date, time_slot, party_size
        )

        if not availability["available"]:
            span.set_attribute("reservation.booking_result", "no_availability")
            booking_outcomes.add(1, {"reservation.outcome": "no_availability"})
            return {"status": "no_availability", "alternatives": availability["alternatives"]}

        # Assign a specific table
        with tracer.start_as_current_span("reservation.assign_table") as table_span:
            table = assign_optimal_table(availability["tables"], party_size)
            table_span.set_attribute("reservation.table_id", table.id)
            table_span.set_attribute("reservation.table_seats", table.seats)
            table_span.set_attribute("reservation.table_section", table.section)

        # Create the reservation record
        with tracer.start_as_current_span("reservation.save_record") as save_span:
            reservation = save_reservation(
                restaurant_id=restaurant_id,
                diner_id=diner_id,
                table_id=table.id,
                date=date,
                time_slot=time_slot,
                party_size=party_size,
                special_requests=special_requests,
            )
            save_span.set_attribute("reservation.confirmation_id", reservation.confirmation_id)

        # Send confirmation notification
        with tracer.start_as_current_span("reservation.send_confirmation") as notif_span:
            send_booking_confirmation(reservation)
            notif_span.set_attribute("reservation.notification_sent", True)

        # Notify the restaurant's host system
        with tracer.start_as_current_span("reservation.notify_restaurant") as rest_span:
            notify_restaurant_system(restaurant_id, reservation)
            rest_span.set_attribute("reservation.restaurant_notified", True)

        duration = (time.time() - start) * 1000
        booking_latency.record(duration)
        booking_outcomes.add(1, {"reservation.outcome": "confirmed"})

        span.set_attribute("reservation.booking_result", "confirmed")
        return {
            "status": "confirmed",
            "confirmation_id": reservation.confirmation_id,
        }
```

## Monitoring Peak Hour Performance

Friday and Saturday evenings from 6 PM to 9 PM generate the highest traffic:

```python
concurrent_searches = meter.create_up_down_counter(
    "reservation.concurrent_searches",
    description="Number of restaurant searches currently in progress",
)

no_show_rate = meter.create_histogram(
    "reservation.no_show_rate",
    description="No-show rate by restaurant and time period",
    unit="%",
)
```

## Conclusion

Monitoring a restaurant reservation platform with OpenTelemetry covers the full lifecycle from search to booking to dining. By tracing geo-search performance, table availability calculations, and booking transactions, you can ensure the platform handles peak dinner-hour traffic smoothly while maintaining accurate real-time availability across thousands of restaurants.
