# How to Monitor Warehouse Robotics and AGV (Automated Guided Vehicle) System Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Warehouse Robotics, AGV, Automation, Performance Monitoring

Description: Monitor warehouse robotics and AGV fleet performance with OpenTelemetry by tracking mission completion, navigation latency, and fleet utilization metrics.

Modern warehouses rely on fleets of Automated Guided Vehicles (AGVs) and autonomous mobile robots (AMRs) to move goods between storage locations, picking stations, and shipping docks. When these robots slow down, get stuck, or fail to complete missions, order fulfillment suffers directly. A fleet of 50 AGVs in a busy distribution center might handle thousands of transport missions per shift, and even a 5% failure rate translates to hundreds of delayed orders.

OpenTelemetry provides the instrumentation needed to monitor mission performance, navigation health, and fleet-wide utilization.

## What to Monitor

AGV/AMR fleet operations have several dimensions worth tracking:

- **Mission lifecycle**: Pick-up, transport, drop-off completion times
- **Navigation performance**: Path planning time, obstacle avoidance events, localization accuracy
- **Fleet utilization**: How many robots are idle vs. active vs. charging
- **System health**: Battery levels, motor temperatures, sensor status

## Setting Up Fleet Metrics

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Tracing setup
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("warehouse-fleet-manager")

# Metrics setup
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=5000
)
metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
meter = metrics.get_meter("warehouse-fleet-manager")

# Mission metrics
mission_duration = meter.create_histogram(
    "agv.mission.duration_seconds",
    description="Total mission duration from assignment to completion",
    unit="s"
)
mission_count = meter.create_counter(
    "agv.missions.completed",
    description="Number of completed transport missions"
)
mission_failures = meter.create_counter(
    "agv.missions.failed",
    description="Number of failed or aborted missions"
)

# Navigation metrics
path_planning_time = meter.create_histogram(
    "agv.navigation.path_planning_ms",
    description="Time to compute a navigation path",
    unit="ms"
)
obstacle_events = meter.create_counter(
    "agv.navigation.obstacle_events",
    description="Number of obstacle detection and avoidance events"
)
distance_traveled = meter.create_counter(
    "agv.navigation.distance_meters",
    description="Total distance traveled by the fleet",
    unit="m"
)

# Fleet utilization
fleet_status = meter.create_gauge(
    "agv.fleet.status_count",
    description="Number of AGVs in each status"
)
battery_level = meter.create_gauge(
    "agv.battery.level_percent",
    description="Current battery level per AGV",
    unit="percent"
)
```

## Tracing a Transport Mission

Each transport mission becomes a trace with spans for each phase:

```python
import time

def execute_transport_mission(mission_id, agv_id, pickup_location, dropoff_location, payload_type):
    """
    Execute a full transport mission: navigate to pickup, load, transport, unload.
    """
    with tracer.start_as_current_span("agv.mission.execute") as root_span:
        mission_start = time.monotonic()
        root_span.set_attribute("agv.mission_id", mission_id)
        root_span.set_attribute("agv.id", agv_id)
        root_span.set_attribute("agv.pickup", pickup_location)
        root_span.set_attribute("agv.dropoff", dropoff_location)
        root_span.set_attribute("agv.payload_type", payload_type)

        try:
            # Phase 1: Navigate to pickup location
            navigate_to(agv_id, pickup_location, mission_id)

            # Phase 2: Execute pickup
            execute_pickup(agv_id, pickup_location, mission_id)

            # Phase 3: Navigate to dropoff location
            navigate_to(agv_id, dropoff_location, mission_id)

            # Phase 4: Execute dropoff
            execute_dropoff(agv_id, dropoff_location, mission_id)

            total_seconds = time.monotonic() - mission_start
            mission_duration.record(total_seconds, {
                "agv_id": agv_id,
                "payload_type": payload_type
            })
            mission_count.add(1, {"agv_id": agv_id, "result": "success"})
            root_span.set_attribute("agv.mission.duration_s", total_seconds)

        except MissionAbortError as e:
            mission_failures.add(1, {
                "agv_id": agv_id,
                "failure_reason": str(e)
            })
            root_span.set_status(trace.StatusCode.ERROR, str(e))
            raise


def navigate_to(agv_id, destination, mission_id):
    """Navigate the AGV to a destination with path planning and obstacle avoidance."""
    with tracer.start_as_current_span("agv.navigation.navigate_to") as span:
        span.set_attribute("agv.id", agv_id)
        span.set_attribute("agv.destination", destination)

        # Path planning
        planning_start = time.monotonic()
        current_pos = get_agv_position(agv_id)
        path = path_planner.compute(current_pos, destination)
        planning_ms = (time.monotonic() - planning_start) * 1000

        path_planning_time.record(planning_ms, {"agv_id": agv_id})
        span.set_attribute("agv.path.planning_ms", planning_ms)
        span.set_attribute("agv.path.waypoints", len(path.waypoints))
        span.set_attribute("agv.path.estimated_distance_m", path.distance_meters)

        # Execute the path, tracking obstacles along the way
        nav_start = time.monotonic()
        obstacle_count = 0

        for waypoint in path.waypoints:
            result = move_to_waypoint(agv_id, waypoint)
            if result.obstacle_detected:
                obstacle_count += 1
                obstacle_events.add(1, {"agv_id": agv_id, "type": result.obstacle_type})
                span.add_event("obstacle_detected", {
                    "obstacle_type": result.obstacle_type,
                    "waypoint": str(waypoint)
                })

        nav_seconds = time.monotonic() - nav_start
        distance_traveled.add(path.distance_meters, {"agv_id": agv_id})
        span.set_attribute("agv.navigation.duration_s", nav_seconds)
        span.set_attribute("agv.navigation.obstacles_encountered", obstacle_count)
```

## Fleet Utilization Monitoring

Track the overall fleet state on a regular interval:

```python
def update_fleet_metrics():
    """
    Called every 10 seconds to update fleet-wide metrics.
    """
    fleet = get_all_agvs()

    status_counts = {"active": 0, "idle": 0, "charging": 0, "error": 0, "maintenance": 0}

    for agv in fleet:
        status = agv["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

        # Record battery level for each AGV
        battery_level.set(agv["battery_percent"], {"agv_id": agv["id"]})

    # Record fleet status breakdown
    for status, count in status_counts.items():
        fleet_status.set(count, {"status": status})
```

## Pickup and Dropoff Operations

```python
def execute_pickup(agv_id, location, mission_id):
    """Execute the payload pickup with position alignment."""
    with tracer.start_as_current_span("agv.mission.pickup") as span:
        span.set_attribute("agv.id", agv_id)
        span.set_attribute("agv.location", location)

        # Fine positioning to align with the rack/shelf
        align_start = time.monotonic()
        align_result = fine_position_align(agv_id, location)
        align_ms = (time.monotonic() - align_start) * 1000
        span.set_attribute("agv.pickup.align_ms", align_ms)
        span.set_attribute("agv.pickup.align_offset_mm", align_result.offset_mm)

        # Lift/grab the payload
        lift_start = time.monotonic()
        lift_payload(agv_id)
        lift_ms = (time.monotonic() - lift_start) * 1000
        span.set_attribute("agv.pickup.lift_ms", lift_ms)

        # Verify payload is secure
        if not verify_payload_secure(agv_id):
            span.set_attribute("agv.pickup.secure", False)
            raise MissionAbortError("Payload not securely loaded")

        span.set_attribute("agv.pickup.secure", True)
```

## Key Alerts

- **Mission failure rate above 3%**: Investigate whether robots are getting stuck in specific zones.
- **Path planning time above 500ms**: The map might need updating, or the planner is struggling with congestion.
- **Fleet idle percentage above 40%**: Either demand is low or the dispatch system is not assigning missions efficiently.
- **Battery level below 20% on active AGVs**: Robots should be routed to charging before they run out mid-mission.
- **Obstacle event rate spiking**: Could indicate a new physical obstruction in the warehouse or a sensor calibration issue.

## Summary

Warehouse robotics fleets are essentially distributed systems moving through physical space. The same observability principles that work for software microservices apply here: trace individual operations end-to-end, collect aggregate metrics across the fleet, and alert on deviations from expected performance. OpenTelemetry gives you a standardized way to do all of this, making it possible to correlate AGV performance data with your warehouse management system and order fulfillment metrics in a single observability platform.
