# How to Monitor Yard Management and Dock Scheduling System Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Yard Management, Dock Scheduling, Warehouse Operations

Description: Monitor yard management and dock scheduling systems with OpenTelemetry to reduce truck wait times and optimize dock utilization.

Yard management systems (YMS) track every trailer in a distribution center's yard, and dock scheduling systems assign those trailers to specific dock doors at specific times. When these systems are slow or miscoordinated, trucks idle in the yard burning fuel and drivers burn hours. OpenTelemetry instrumentation lets you measure the actual performance of these systems and find the bottlenecks.

## Tracer Initialization

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("yard.management")
meter = metrics.get_meter("yard.management")
```

## Tracing Truck Check-In

When a truck arrives at the gate, the YMS captures its details, verifies the appointment, and assigns a yard spot or dock door.

```python
def check_in_truck(truck_id: str, carrier: str, appointment_id: str):
    with tracer.start_as_current_span("yard.truck_checkin") as span:
        span.set_attribute("truck.id", truck_id)
        span.set_attribute("carrier.name", carrier)
        span.set_attribute("appointment.id", appointment_id)

        # Verify the appointment exists and is valid
        with tracer.start_as_current_span("yard.verify_appointment") as appt_span:
            appointment = lookup_appointment(appointment_id)
            appt_span.set_attribute("appointment.scheduled_time", appointment.scheduled.isoformat())
            appt_span.set_attribute("appointment.type", appointment.load_type)  # inbound or outbound

            import datetime
            arrival_delta = (datetime.datetime.now() - appointment.scheduled).total_seconds() / 60
            appt_span.set_attribute("appointment.early_late_minutes", round(arrival_delta))

            if abs(arrival_delta) > 60:
                appt_span.add_event("significant_schedule_deviation", {
                    "delta_minutes": round(arrival_delta)
                })

        # Assign a yard spot or direct to dock
        with tracer.start_as_current_span("yard.assign_spot") as assign_span:
            assignment = assign_yard_location(truck_id, appointment)
            assign_span.set_attribute("yard.spot_id", assignment.spot_id)
            assign_span.set_attribute("yard.zone", assignment.zone)
            assign_span.set_attribute("yard.directed_to_dock", assignment.direct_to_dock)

            if assignment.direct_to_dock:
                assign_span.set_attribute("dock.door_number", assignment.dock_door)

        span.set_attribute("checkin.complete", True)
        return assignment
```

## Tracing Dock Door Scheduling

The dock scheduling algorithm needs to balance multiple constraints: appointment windows, dock door capabilities (some doors have refrigeration), unloading crew availability, and priority levels.

```python
def schedule_dock_assignment(truck_id: str, appointment: dict):
    with tracer.start_as_current_span("dock.schedule") as span:
        span.set_attribute("truck.id", truck_id)
        span.set_attribute("appointment.type", appointment["load_type"])
        span.set_attribute("appointment.priority", appointment["priority"])

        # Check dock door availability
        with tracer.start_as_current_span("dock.check_availability") as avail_span:
            available_doors = get_available_dock_doors(
                appointment["load_type"],
                appointment["requirements"]  # e.g., refrigerated, oversized
            )
            avail_span.set_attribute("dock.available_count", len(available_doors))
            avail_span.set_attribute("dock.total_doors", get_total_dock_count())

            if len(available_doors) == 0:
                avail_span.add_event("no_doors_available", {
                    "requirements": str(appointment["requirements"])
                })

        # Run the scheduling algorithm
        with tracer.start_as_current_span("dock.run_scheduler") as sched_span:
            schedule = run_dock_scheduling_algorithm(
                truck_id, available_doors, appointment
            )
            sched_span.set_attribute("scheduler.algorithm", "weighted_priority")
            sched_span.set_attribute("scheduler.assigned_door", schedule.door_number)
            sched_span.set_attribute("scheduler.estimated_start", schedule.start_time.isoformat())
            sched_span.set_attribute("scheduler.estimated_duration_min", schedule.duration_minutes)
            sched_span.set_attribute("scheduler.wait_time_minutes", schedule.wait_minutes)

        # Notify the driver and yard jockey
        with tracer.start_as_current_span("dock.notify_parties"):
            notify_driver(truck_id, schedule)
            notify_yard_jockey(schedule)  # the person who moves trailers to dock doors

        span.set_attribute("schedule.assigned", True)
        return schedule
```

## Tracking Yard Movements

Yard jockeys move trailers between yard spots and dock doors. Each movement should be traced so you can measure repositioning time.

```python
def execute_yard_move(move_id: str, trailer_id: str, from_spot: str, to_spot: str):
    with tracer.start_as_current_span("yard.move") as span:
        span.set_attribute("move.id", move_id)
        span.set_attribute("trailer.id", trailer_id)
        span.set_attribute("move.from", from_spot)
        span.set_attribute("move.to", to_spot)

        # Record the start of the move
        with tracer.start_as_current_span("yard.move.pickup") as pickup_span:
            pickup = execute_trailer_pickup(trailer_id, from_spot)
            pickup_span.set_attribute("pickup.duration_seconds", pickup.duration)

        # Drive to the destination spot
        with tracer.start_as_current_span("yard.move.transit") as transit_span:
            transit = drive_to_spot(trailer_id, to_spot)
            transit_span.set_attribute("transit.distance_meters", transit.distance)
            transit_span.set_attribute("transit.duration_seconds", transit.duration)

        # Drop the trailer at the new spot
        with tracer.start_as_current_span("yard.move.dropoff") as drop_span:
            dropoff = execute_trailer_drop(trailer_id, to_spot)
            drop_span.set_attribute("dropoff.duration_seconds", dropoff.duration)

        total_time = pickup.duration + transit.duration + dropoff.duration
        span.set_attribute("move.total_seconds", total_time)
```

## Key Metrics for Yard and Dock Operations

```python
# Truck wait time from arrival to dock assignment
truck_wait_time = meter.create_histogram(
    "yard.truck.wait_time_minutes",
    description="Minutes between truck check-in and dock door start",
    unit="min"
)

# Dock utilization
dock_utilization = meter.create_histogram(
    "dock.utilization_pct",
    description="Percentage of dock doors in use at measurement time",
    unit="pct"
)

# Yard move duration
yard_move_duration = meter.create_histogram(
    "yard.move.duration_seconds",
    description="Time to complete a yard move operation",
    unit="s"
)

# Late arrivals
late_arrivals = meter.create_counter(
    "yard.appointments.late",
    description="Trucks arriving more than 30 minutes after scheduled time"
)
```

## What to Watch

Yard and dock operations have a direct impact on distribution center throughput. When you trace these operations, you are looking for patterns: are certain times of day consistently congested? Are specific dock doors being underutilized? How much time do trucks actually spend waiting versus being serviced? With OpenTelemetry giving you per-truck, per-move, and per-dock traces, you can answer these questions with data instead of gut feelings. That is how you turn a chaotic yard into a well-run operation.
