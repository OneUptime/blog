# How to Monitor Parcel Sorting Facility Conveyor System and Scanner Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Parcel Sorting, Conveyor Systems, Barcode Scanning

Description: Monitor parcel sorting facility conveyor belts and barcode scanner performance with OpenTelemetry to reduce missorts and downtime.

Parcel sorting facilities process thousands of packages per hour using a combination of conveyor belts, barcode scanners, diverters, and software systems. When a scanner misreads a label or a diverter jams, the whole line can back up. Monitoring these systems with OpenTelemetry gives operations teams real-time visibility into scanner read rates, conveyor throughput, and sort accuracy.

## Setting Up Instrumentation

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

tracer = trace.get_tracer("sort.facility")
meter = metrics.get_meter("sort.facility")
```

## Tracing a Parcel Through the Sort System

Each parcel enters the system at an induction point, passes through one or more scanners, receives a sort assignment, and is diverted to the correct outbound lane. Here is the trace for a single parcel.

```python
def process_parcel(parcel_id: str, induction_point: str):
    with tracer.start_as_current_span("sort.parcel.process") as span:
        span.set_attribute("parcel.id", parcel_id)
        span.set_attribute("induction.point", induction_point)

        # Barcode scanning phase - may involve multiple scan attempts
        with tracer.start_as_current_span("sort.parcel.scan") as scan_span:
            scan_result = perform_barcode_scan(parcel_id)
            scan_span.set_attribute("scan.scanner_id", scan_result.scanner_id)
            scan_span.set_attribute("scan.read_success", scan_result.success)
            scan_span.set_attribute("scan.attempts", scan_result.attempts)
            scan_span.set_attribute("scan.barcode_type", scan_result.barcode_type)

            if not scan_result.success:
                scan_span.add_event("scan_failure", {
                    "scanner_id": scan_result.scanner_id,
                    "error_type": scan_result.error_type,
                    "attempts": scan_result.attempts
                })
                # Route to manual sort area
                route_to_manual_sort(parcel_id)
                span.set_attribute("sort.manual_required", True)
                return

        # Destination lookup
        with tracer.start_as_current_span("sort.parcel.lookup_destination") as lookup_span:
            destination = lookup_sort_destination(scan_result.tracking_number)
            lookup_span.set_attribute("destination.zone", destination.zone)
            lookup_span.set_attribute("destination.outbound_lane", destination.lane)
            lookup_span.set_attribute("destination.postal_code", destination.postal_code)

        # Diverter activation
        with tracer.start_as_current_span("sort.parcel.divert") as divert_span:
            divert_result = activate_diverter(destination.lane, parcel_id)
            divert_span.set_attribute("diverter.id", divert_result.diverter_id)
            divert_span.set_attribute("diverter.lane", destination.lane)
            divert_span.set_attribute("diverter.activated", divert_result.activated)
            divert_span.set_attribute("diverter.response_time_ms", divert_result.response_time_ms)

            if not divert_result.activated:
                divert_span.add_event("diverter_failure", {
                    "diverter_id": divert_result.diverter_id,
                    "reason": divert_result.failure_reason
                })
                # Parcel will recirculate
                span.set_attribute("sort.recirculated", True)

        # Verify the parcel reached the correct lane
        with tracer.start_as_current_span("sort.parcel.verify") as verify_span:
            verification = verify_sort_accuracy(parcel_id, destination.lane)
            verify_span.set_attribute("verify.correct_lane", verification.correct)
            verify_span.set_attribute("verify.confirmation_scanner", verification.scanner_id)

        span.set_attribute("sort.success", verification.correct)
```

## Monitoring Scanner Performance

Scanners degrade over time due to dust, vibration, and label quality. Tracking read rates per scanner helps you schedule maintenance proactively.

```python
# Metrics for scanner monitoring
scanner_read_rate = meter.create_counter(
    "sort.scanner.reads",
    description="Total scanner read attempts by result"
)

scanner_read_latency = meter.create_histogram(
    "sort.scanner.read_latency_ms",
    description="Time for scanner to decode a barcode",
    unit="ms"
)

def record_scan_event(scanner_id: str, success: bool, latency_ms: float, barcode_type: str):
    status = "success" if success else "failure"
    scanner_read_rate.add(1, {
        "scanner.id": scanner_id,
        "scan.status": status,
        "barcode.type": barcode_type
    })
    scanner_read_latency.record(latency_ms, {
        "scanner.id": scanner_id,
        "barcode.type": barcode_type
    })
```

## Monitoring Conveyor Throughput

Conveyor throughput is measured in parcels per minute at various points along the sort line. Drops in throughput signal jams, slowdowns, or equipment issues.

```python
conveyor_throughput = meter.create_histogram(
    "sort.conveyor.throughput_ppm",
    description="Parcels per minute at conveyor measurement points",
    unit="parcels/min"
)

conveyor_jams = meter.create_counter(
    "sort.conveyor.jams",
    description="Conveyor jam events"
)

def monitor_conveyor_segment(segment_id: str, parcels_per_minute: float):
    with tracer.start_as_current_span("sort.conveyor.monitor") as span:
        span.set_attribute("conveyor.segment_id", segment_id)
        span.set_attribute("conveyor.parcels_per_minute", parcels_per_minute)

        conveyor_throughput.record(parcels_per_minute, {"segment.id": segment_id})

        # Check if throughput has dropped below expected minimum
        expected_min = get_expected_throughput(segment_id)
        if parcels_per_minute < expected_min * 0.7:
            span.add_event("throughput_drop", {
                "current_ppm": parcels_per_minute,
                "expected_min_ppm": expected_min,
                "drop_pct": round((1 - parcels_per_minute / expected_min) * 100, 1)
            })

def handle_conveyor_jam(segment_id: str, jam_details: dict):
    with tracer.start_as_current_span("sort.conveyor.jam") as span:
        span.set_attribute("conveyor.segment_id", segment_id)
        span.set_attribute("jam.type", jam_details["type"])
        span.set_attribute("jam.duration_seconds", jam_details.get("duration", 0))

        conveyor_jams.add(1, {
            "segment.id": segment_id,
            "jam.type": jam_details["type"]
        })

        span.add_event("conveyor_jam_detected", jam_details)
```

## Tracking Sort Accuracy

Sort accuracy is the percentage of parcels that end up in the correct outbound lane. Missorts are costly because they cause delays and require manual intervention.

```python
sort_accuracy_counter = meter.create_counter(
    "sort.accuracy.total",
    description="Parcels sorted by correctness"
)

missort_counter = meter.create_counter(
    "sort.missorts.total",
    description="Parcels sorted to wrong lane"
)

def track_sort_accuracy(parcel_id: str, expected_lane: str, actual_lane: str):
    correct = expected_lane == actual_lane
    sort_accuracy_counter.add(1, {"correct": str(correct)})

    if not correct:
        missort_counter.add(1, {
            "expected_lane": expected_lane,
            "actual_lane": actual_lane
        })
```

## What the Data Tells You

When you combine scanner read rates, conveyor throughput, and sort accuracy in your observability platform, patterns emerge. A scanner with a declining read rate will correlate with increasing manual sort volumes. A conveyor segment with frequent throughput drops will show up as a bottleneck when you look at parcel transit times through the facility. By tracing individual parcels and measuring aggregate facility metrics, you get both the detail needed for troubleshooting and the big picture needed for capacity planning.
