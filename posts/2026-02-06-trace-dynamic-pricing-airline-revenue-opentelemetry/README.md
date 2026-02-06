# How to Trace Dynamic Pricing Algorithm Execution for Airline Revenue Management with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Dynamic Pricing, Airline, Revenue Management

Description: Trace dynamic pricing algorithm execution for airline revenue management systems using OpenTelemetry distributed tracing.

Airline revenue management systems use dynamic pricing algorithms that adjust fares in real time based on demand, competition, booking patterns, and remaining inventory. These algorithms run thousands of times per day across hundreds of flight legs, and each execution needs to be fast and accurate. A pricing error can mean millions in lost revenue or, worse, selling seats below cost. This post shows how to trace dynamic pricing execution with OpenTelemetry so you can monitor both performance and decision quality.

## How Dynamic Pricing Works in Airlines

The pricing engine typically:

1. Receives a pricing request for a specific flight and booking class
2. Loads current booking data (seats sold, days to departure, booking velocity)
3. Fetches competitor pricing data
4. Runs the demand forecasting model
5. Applies fare optimization rules
6. Returns the recommended fare with a confidence score

Each step involves different data sources and computational costs.

## Instrumenting the Pricing Engine

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind
import time

tracer = trace.get_tracer("airline.pricing")
meter = metrics.get_meter("airline.pricing")

pricing_latency = meter.create_histogram(
    "airline.pricing_latency_ms",
    description="Time to execute a pricing decision",
    unit="ms",
)

pricing_decisions = meter.create_counter(
    "airline.pricing_decisions_total",
    description="Total pricing decisions made",
)

fare_change_magnitude = meter.create_histogram(
    "airline.fare_change_percent",
    description="Percentage change in fare from previous price",
    unit="%",
)

def calculate_dynamic_price(flight_id, booking_class, request_context):
    """Main entry point for dynamic pricing calculation."""
    with tracer.start_as_current_span(
        "pricing.calculate",
        kind=SpanKind.SERVER,
        attributes={
            "pricing.flight_id": flight_id,
            "pricing.booking_class": booking_class,
            "pricing.request_source": request_context.source,
            "pricing.departure_date": request_context.departure_date,
        }
    ) as span:
        start = time.time()

        # Step 1: Load current inventory state
        with tracer.start_as_current_span("pricing.load_inventory") as inv_span:
            inventory = load_inventory_state(flight_id, booking_class)
            inv_span.set_attribute("pricing.seats_total", inventory.total_seats)
            inv_span.set_attribute("pricing.seats_sold", inventory.seats_sold)
            inv_span.set_attribute("pricing.seats_remaining", inventory.remaining)
            inv_span.set_attribute("pricing.load_factor", inventory.load_factor)
            inv_span.set_attribute("pricing.days_to_departure", inventory.days_to_departure)

        # Step 2: Get booking velocity
        with tracer.start_as_current_span("pricing.booking_velocity") as vel_span:
            velocity = calculate_booking_velocity(flight_id, booking_class)
            vel_span.set_attribute("pricing.bookings_last_24h", velocity.last_24h)
            vel_span.set_attribute("pricing.bookings_last_7d", velocity.last_7d)
            vel_span.set_attribute("pricing.velocity_trend", velocity.trend)

        # Step 3: Fetch competitor prices
        with tracer.start_as_current_span("pricing.competitor_data") as comp_span:
            competitors = fetch_competitor_prices(
                inventory.route, request_context.departure_date
            )
            comp_span.set_attribute("pricing.competitors_found", len(competitors))
            comp_span.set_attribute("pricing.competitor_min_price",
                                    min(c.price for c in competitors) if competitors else 0)
            comp_span.set_attribute("pricing.competitor_avg_price",
                                    sum(c.price for c in competitors) / len(competitors) if competitors else 0)

        # Step 4: Run demand forecast
        with tracer.start_as_current_span("pricing.demand_forecast") as forecast_span:
            forecast = run_demand_model(inventory, velocity)
            forecast_span.set_attribute("pricing.forecasted_demand", forecast.expected_demand)
            forecast_span.set_attribute("pricing.forecast_confidence", forecast.confidence)
            forecast_span.set_attribute("pricing.model_version", forecast.model_version)

        # Step 5: Optimize fare
        with tracer.start_as_current_span("pricing.optimize_fare") as opt_span:
            previous_fare = get_current_fare(flight_id, booking_class)
            optimized = optimize_fare(
                inventory=inventory,
                velocity=velocity,
                competitors=competitors,
                forecast=forecast,
                previous_fare=previous_fare,
            )

            opt_span.set_attribute("pricing.previous_fare", previous_fare)
            opt_span.set_attribute("pricing.recommended_fare", optimized.fare)
            opt_span.set_attribute("pricing.fare_floor", optimized.floor)
            opt_span.set_attribute("pricing.fare_ceiling", optimized.ceiling)
            opt_span.set_attribute("pricing.optimization_reason", optimized.reason)

        # Record metrics
        latency_ms = (time.time() - start) * 1000
        pricing_latency.record(latency_ms, {
            "pricing.booking_class": booking_class,
        })

        pricing_decisions.add(1, {
            "pricing.direction": "up" if optimized.fare > previous_fare else "down",
            "pricing.reason": optimized.reason,
        })

        if previous_fare > 0:
            change_pct = abs(optimized.fare - previous_fare) / previous_fare * 100
            fare_change_magnitude.record(change_pct, {
                "pricing.direction": "up" if optimized.fare > previous_fare else "down",
            })

        span.set_attribute("pricing.final_fare", optimized.fare)
        span.set_attribute("pricing.latency_ms", latency_ms)

        return optimized
```

## Monitoring Fare Guardrails

Dynamic pricing algorithms need guardrails to prevent extreme price swings. Instrument these checks:

```python
guardrail_triggers = meter.create_counter(
    "airline.pricing_guardrail_triggers_total",
    description="Number of times pricing guardrails were activated",
)

def apply_fare_guardrails(optimized_fare, previous_fare, rules):
    with tracer.start_as_current_span(
        "pricing.guardrails",
        attributes={
            "pricing.input_fare": optimized_fare,
            "pricing.previous_fare": previous_fare,
        }
    ) as span:
        final_fare = optimized_fare
        triggered_rules = []

        # Rule: Maximum single-step increase
        max_increase_pct = rules.max_increase_percent
        if previous_fare > 0:
            increase_pct = (optimized_fare - previous_fare) / previous_fare * 100
            if increase_pct > max_increase_pct:
                final_fare = previous_fare * (1 + max_increase_pct / 100)
                triggered_rules.append("max_increase")

        # Rule: Absolute floor price
        if final_fare < rules.absolute_floor:
            final_fare = rules.absolute_floor
            triggered_rules.append("floor_price")

        # Rule: Absolute ceiling price
        if final_fare > rules.absolute_ceiling:
            final_fare = rules.absolute_ceiling
            triggered_rules.append("ceiling_price")

        span.set_attribute("pricing.guardrails_triggered", str(triggered_rules))
        span.set_attribute("pricing.final_fare_after_guardrails", final_fare)
        span.set_attribute("pricing.fare_adjusted", final_fare != optimized_fare)

        for rule in triggered_rules:
            guardrail_triggers.add(1, {"pricing.rule": rule})

        return final_fare
```

## Batch Pricing Execution Monitoring

Airlines often run batch pricing updates across all flights. Track these batch executions:

```python
def run_batch_pricing_update(flight_legs):
    """Update prices for all flight legs. Runs periodically."""
    with tracer.start_as_current_span(
        "pricing.batch_update",
        attributes={
            "pricing.flight_count": len(flight_legs),
            "pricing.batch_trigger": "scheduled",
        }
    ) as span:
        start = time.time()
        results = {"updated": 0, "unchanged": 0, "errors": 0}

        for leg in flight_legs:
            try:
                result = calculate_dynamic_price(leg.flight_id, leg.booking_class, leg.context)
                if result.fare != leg.current_fare:
                    apply_new_fare(leg.flight_id, result.fare)
                    results["updated"] += 1
                else:
                    results["unchanged"] += 1
            except Exception as e:
                results["errors"] += 1

        duration = time.time() - start
        span.set_attribute("pricing.batch_duration_seconds", duration)
        span.set_attribute("pricing.fares_updated", results["updated"])
        span.set_attribute("pricing.fares_unchanged", results["unchanged"])
        span.set_attribute("pricing.fares_errored", results["errors"])

        return results
```

## Key Metrics to Monitor

Build dashboards around:

- Pricing latency P50/P95/P99 per booking class
- Fare change direction distribution (up vs down)
- Guardrail activation frequency by rule type
- Competitor price gap trends
- Demand forecast accuracy over time

## Conclusion

Tracing dynamic pricing execution with OpenTelemetry provides the transparency needed to trust automated pricing decisions. By instrumenting inventory loading, competitor analysis, demand forecasting, and fare optimization as individual spans, you can pinpoint performance bottlenecks and validate that pricing algorithms are making reasonable decisions across thousands of daily fare updates.
