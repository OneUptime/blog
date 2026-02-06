# How to Instrument Last-Mile Delivery Tracking and ETA Prediction Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Last-Mile Delivery, ETA Prediction, Logistics

Description: Instrument last-mile delivery tracking and ETA prediction systems with OpenTelemetry to improve delivery accuracy and customer experience.

Last-mile delivery is the most expensive and unpredictable part of the supply chain. Customers expect accurate ETAs, and when your prediction pipeline gets it wrong, support tickets pile up. The challenge is that ETA prediction depends on live traffic data, driver behavior, package count, and dozens of other signals. OpenTelemetry helps you trace the full prediction pipeline so you can figure out why an ETA was off by 40 minutes.

## Tracing the Delivery Tracking Pipeline

Every delivery has a lifecycle: assigned, en route, approaching, delivered. Each state transition involves GPS updates, geofence checks, and notifications. Let's trace the whole thing.

```python
from opentelemetry import trace

tracer = trace.get_tracer("delivery.tracking")

def process_delivery_update(delivery_id: str, driver_id: str, lat: float, lon: float):
    with tracer.start_as_current_span("delivery.update") as span:
        span.set_attribute("delivery.id", delivery_id)
        span.set_attribute("driver.id", driver_id)
        span.set_attribute("gps.lat", lat)
        span.set_attribute("gps.lon", lon)

        # Check if driver has entered any delivery geofence
        with tracer.start_as_current_span("delivery.geofence_check") as geo_span:
            geofence_result = check_geofences(delivery_id, lat, lon)
            geo_span.set_attribute("geofence.triggered", geofence_result.triggered)
            geo_span.set_attribute("geofence.zone", geofence_result.zone_name)

            if geofence_result.triggered:
                geo_span.add_event("geofence_entered", {
                    "zone": geofence_result.zone_name,
                    "radius_meters": geofence_result.radius
                })

        # Recalculate ETA based on current position
        with tracer.start_as_current_span("delivery.eta_recalculation"):
            new_eta = recalculate_eta(delivery_id, lat, lon)
            span.set_attribute("delivery.eta_minutes", new_eta.minutes_remaining)

        # Notify customer if ETA changed significantly
        with tracer.start_as_current_span("delivery.notify_customer") as notify_span:
            if abs(new_eta.delta_from_previous) > 5:
                send_eta_update(delivery_id, new_eta)
                notify_span.set_attribute("notification.sent", True)
                notify_span.set_attribute("eta.delta_minutes", new_eta.delta_from_previous)
            else:
                notify_span.set_attribute("notification.sent", False)
```

## Instrumenting the ETA Prediction Model

The ETA prediction pipeline is where most of the complexity lives. It typically pulls data from multiple sources, runs a model, and returns a time estimate. Each step is worth tracing.

```python
def recalculate_eta(delivery_id: str, current_lat: float, current_lon: float):
    with tracer.start_as_current_span("eta.predict") as span:
        span.set_attribute("delivery.id", delivery_id)

        # Fetch the remaining stops for this driver
        with tracer.start_as_current_span("eta.fetch_remaining_stops") as stops_span:
            stops = get_remaining_stops(delivery_id)
            stops_span.set_attribute("stops.remaining", len(stops))

        # Pull live traffic data for the route segments
        with tracer.start_as_current_span("eta.fetch_traffic") as traffic_span:
            traffic_data = fetch_traffic_conditions(current_lat, current_lon, stops)
            traffic_span.set_attribute("traffic.segments_fetched", len(traffic_data))
            traffic_span.set_attribute("traffic.provider", "here_maps")
            # Record the average congestion level
            avg_congestion = sum(t.congestion for t in traffic_data) / len(traffic_data)
            traffic_span.set_attribute("traffic.avg_congestion", round(avg_congestion, 2))

        # Fetch historical driver performance data
        with tracer.start_as_current_span("eta.fetch_driver_history") as hist_span:
            driver_stats = get_driver_performance(delivery_id)
            hist_span.set_attribute("driver.avg_stop_time_seconds", driver_stats.avg_stop_time)
            hist_span.set_attribute("driver.deliveries_today", driver_stats.deliveries_today)

        # Run the ML model to predict ETA
        with tracer.start_as_current_span("eta.ml_inference") as model_span:
            features = build_feature_vector(stops, traffic_data, driver_stats)
            prediction = run_eta_model(features)
            model_span.set_attribute("model.name", "eta_v3")
            model_span.set_attribute("model.version", "3.2.1")
            model_span.set_attribute("model.confidence", prediction.confidence)
            model_span.set_attribute("eta.predicted_minutes", prediction.minutes)

        span.set_attribute("eta.final_minutes", prediction.minutes)
        return prediction
```

## Tracking Prediction Accuracy Over Time

A prediction is only useful if it is accurate. You should record both the predicted ETA and the actual delivery time, then measure the error.

```python
from opentelemetry import metrics

meter = metrics.get_meter("delivery.tracking")

# Histogram to track ETA prediction error in minutes
eta_error_histogram = meter.create_histogram(
    "delivery.eta.error_minutes",
    description="Difference between predicted and actual delivery time",
    unit="min"
)

# Counter for deliveries completed
deliveries_completed = meter.create_counter(
    "delivery.completed.total",
    description="Total deliveries completed"
)

def record_delivery_completion(delivery_id: str, predicted_eta_min: float, actual_min: float):
    with tracer.start_as_current_span("delivery.complete") as span:
        error = actual_min - predicted_eta_min
        span.set_attribute("delivery.id", delivery_id)
        span.set_attribute("eta.predicted_minutes", predicted_eta_min)
        span.set_attribute("eta.actual_minutes", actual_min)
        span.set_attribute("eta.error_minutes", error)

        # Record the metric for aggregate analysis
        eta_error_histogram.record(abs(error), {"model.version": "3.2.1"})
        deliveries_completed.add(1)

        if abs(error) > 15:
            span.add_event("large_eta_error", {
                "predicted": predicted_eta_min,
                "actual": actual_min,
                "error": error
            })
```

## Handling Edge Cases in Last-Mile Tracking

Real-world deliveries have complications: failed delivery attempts, address corrections, and package handoffs between drivers. Each of these should produce trace events so you can reconstruct what happened.

```python
def handle_delivery_exception(delivery_id: str, exception_type: str, details: dict):
    with tracer.start_as_current_span("delivery.exception") as span:
        span.set_attribute("delivery.id", delivery_id)
        span.set_attribute("exception.type", exception_type)

        if exception_type == "address_not_found":
            span.add_event("address_correction_needed", details)
            request_address_correction(delivery_id)

        elif exception_type == "customer_unavailable":
            span.add_event("delivery_attempt_failed", details)
            schedule_redelivery(delivery_id)
            span.set_attribute("redelivery.scheduled", True)

        elif exception_type == "driver_reassignment":
            span.add_event("driver_changed", details)
            new_eta = recalculate_eta(delivery_id, details["lat"], details["lon"])
            span.set_attribute("eta.recalculated_minutes", new_eta.minutes)
```

## What You Gain

With this instrumentation you can answer questions like: Which traffic data provider is adding the most latency to ETA calculations? How often does the ML model produce predictions with low confidence? Which geofence zones have the highest rate of false triggers? Are certain drivers consistently beating or missing their ETAs?

These answers come directly from your traces and metrics. Instead of guessing why a customer got a bad ETA, you open the trace and follow the data through each step of the pipeline.
