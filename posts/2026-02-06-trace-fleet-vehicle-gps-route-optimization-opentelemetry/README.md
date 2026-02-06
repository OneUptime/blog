# How to Trace Fleet Vehicle GPS Tracking and Route Optimization Calculations with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fleet Management, GPS Tracking, Route Optimization

Description: Learn how to instrument fleet vehicle GPS tracking and route optimization systems with OpenTelemetry for full observability.

Fleet management platforms handle thousands of GPS pings per minute, run route optimization algorithms in real time, and push updated directions to drivers on the road. When something goes wrong, like a route recalculation taking too long or GPS data arriving late, you need tracing to pinpoint the bottleneck. OpenTelemetry gives you the tools to capture these distributed operations end to end.

## Setting Up the Tracer

Before instrumenting anything, you need a configured tracer provider. This example uses Python with the OpenTelemetry SDK.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Initialize the tracer provider with OTLP export
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("fleet.gps.service")
```

## Tracing GPS Data Ingestion

GPS data flows in from onboard telematics devices. Each ping contains latitude, longitude, speed, heading, and a timestamp. You want to trace the full lifecycle from ingestion through storage.

```python
from opentelemetry import trace

tracer = trace.get_tracer("fleet.gps.service")

def ingest_gps_ping(vehicle_id: str, lat: float, lon: float, speed: float, heading: float):
    with tracer.start_as_current_span("gps.ingest") as span:
        # Tag the span with vehicle metadata so you can filter later
        span.set_attribute("vehicle.id", vehicle_id)
        span.set_attribute("gps.latitude", lat)
        span.set_attribute("gps.longitude", lon)
        span.set_attribute("gps.speed_kmh", speed)
        span.set_attribute("gps.heading", heading)

        # Validate the coordinates are within expected bounds
        with tracer.start_as_current_span("gps.validate"):
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                span.set_attribute("gps.valid", False)
                raise ValueError(f"Invalid coordinates: {lat}, {lon}")
            span.set_attribute("gps.valid", True)

        # Persist to the time-series database
        with tracer.start_as_current_span("gps.store") as store_span:
            store_gps_record(vehicle_id, lat, lon, speed, heading)
            store_span.set_attribute("db.system", "timescaledb")
            store_span.set_attribute("db.operation", "INSERT")
```

This gives you three nested spans: the outer ingestion span, a validation child, and a storage child. If the database write is slow, you will see it immediately in your trace waterfall.

## Tracing Route Optimization Calculations

Route optimization is where the heavy computation happens. A typical system takes a list of delivery stops, applies constraints like time windows and vehicle capacity, and produces an optimized sequence. These calculations can be expensive and you need to know exactly where time is spent.

```python
def optimize_route(vehicle_id: str, stops: list, constraints: dict):
    with tracer.start_as_current_span("route.optimize") as span:
        span.set_attribute("vehicle.id", vehicle_id)
        span.set_attribute("route.stop_count", len(stops))
        span.set_attribute("route.has_time_windows", constraints.get("time_windows", False))

        # Step 1: Build the distance matrix between all stops
        with tracer.start_as_current_span("route.build_distance_matrix") as matrix_span:
            distance_matrix = compute_distance_matrix(stops)
            matrix_span.set_attribute("matrix.size", len(stops) * len(stops))

        # Step 2: Run the solver (this is usually the bottleneck)
        with tracer.start_as_current_span("route.solve") as solve_span:
            solution = run_vrp_solver(distance_matrix, constraints)
            solve_span.set_attribute("solver.iterations", solution.iterations)
            solve_span.set_attribute("solver.status", solution.status)
            solve_span.set_attribute("route.total_distance_km", solution.total_distance)

        # Step 3: Dispatch the optimized route to the driver
        with tracer.start_as_current_span("route.dispatch"):
            dispatch_route_to_vehicle(vehicle_id, solution.ordered_stops)

        return solution
```

The `route.solve` span is typically the one that takes the most time. By recording the number of solver iterations and the solution status, you can correlate slow traces with specific problem characteristics, like routes with many stops or tight time windows.

## Recording Metrics Alongside Traces

Traces tell you about individual requests. Metrics give you the aggregate picture. You should track both.

```python
from opentelemetry import metrics

meter = metrics.get_meter("fleet.gps.service")

# Counter for total GPS pings received
gps_ping_counter = meter.create_counter(
    "gps.pings.total",
    description="Total GPS pings received from fleet vehicles",
)

# Histogram for route optimization duration
route_optimization_duration = meter.create_histogram(
    "route.optimization.duration_ms",
    description="Time taken to compute optimized routes",
    unit="ms",
)

# Use these in your instrumented functions
def ingest_gps_ping_with_metrics(vehicle_id, lat, lon, speed, heading):
    gps_ping_counter.add(1, {"vehicle.id": vehicle_id})
    ingest_gps_ping(vehicle_id, lat, lon, speed, heading)
```

## Handling GPS Data Gaps and Stale Signals

In real-world fleet operations, vehicles lose cellular connectivity, go through tunnels, or have hardware glitches. Your tracing should capture these anomalies.

```python
def check_gps_staleness(vehicle_id: str, last_ping_time: float):
    with tracer.start_as_current_span("gps.staleness_check") as span:
        import time
        gap_seconds = time.time() - last_ping_time
        span.set_attribute("vehicle.id", vehicle_id)
        span.set_attribute("gps.gap_seconds", gap_seconds)

        if gap_seconds > 300:  # 5 minutes without a ping
            span.set_attribute("gps.stale", True)
            span.add_event("GPS signal lost", {"gap_seconds": gap_seconds})
            trigger_stale_vehicle_alert(vehicle_id)
        else:
            span.set_attribute("gps.stale", False)
```

## Propagating Context Across Services

Fleet systems are rarely monolithic. The GPS ingestion service, route optimization engine, and driver dispatch system are often separate microservices. OpenTelemetry context propagation ensures that a trace started when a GPS ping arrives can follow through to the route recalculation it triggers.

Make sure you configure the W3C TraceContext propagator in all your services:

```python
from opentelemetry.propagators.composite import CompositeHTTPPropagator
from opentelemetry.propagators.textmap import DefaultTextMapPropagator

# This is set by default, but being explicit helps with clarity
from opentelemetry import propagate
propagate.set_global_textmap(DefaultTextMapPropagator())
```

When calling between services over HTTP or gRPC, the trace context headers are injected automatically if you use instrumented HTTP clients like `requests` with the OpenTelemetry instrumentation library.

## What to Look For in Your Traces

Once you have instrumentation in place, here is what to watch for:

- Route optimization spans exceeding your SLA threshold (e.g., over 2 seconds for fewer than 50 stops)
- GPS ingestion spans with validation failures spiking, which could indicate a faulty telematics device
- Database write latency increasing under load during peak delivery hours
- Large gaps between GPS pings for specific vehicles, pointing to connectivity or hardware issues

With OpenTelemetry tracing across your fleet management stack, you get the visibility to diagnose problems before they turn into missed deliveries.
