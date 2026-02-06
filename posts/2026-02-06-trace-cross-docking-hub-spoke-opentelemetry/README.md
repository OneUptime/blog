# How to Trace Cross-Docking and Hub-Spoke Distribution Center Operations with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cross-Docking, Distribution Center, Supply Chain

Description: Trace cross-docking operations and hub-spoke distribution workflows with OpenTelemetry to reduce dwell time and optimize throughput.

Cross-docking is the practice of unloading goods from inbound trucks and loading them directly onto outbound trucks with minimal storage time. In a hub-spoke model, packages flow from regional spokes to a central hub and back out to their destination spokes. The efficiency of these operations depends on tight coordination between inbound scheduling, sortation, and outbound loading. OpenTelemetry tracing makes the timing of each step visible.

## Setting Up Tracing

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("distribution.center")
```

## Tracing Inbound Receiving

When a truck arrives at the dock, you need to unload it, scan every package, and determine where each one goes next. This is the entry point for your trace.

```python
def receive_inbound_shipment(truck_id: str, dock_door: int, manifest: list):
    with tracer.start_as_current_span("crossdock.inbound.receive") as span:
        span.set_attribute("truck.id", truck_id)
        span.set_attribute("dock.door_number", dock_door)
        span.set_attribute("manifest.package_count", len(manifest))

        # Unload and scan each package
        scanned_packages = []
        scan_errors = 0

        with tracer.start_as_current_span("crossdock.inbound.scan_all") as scan_span:
            for package in manifest:
                scan_result = scan_package_barcode(package["tracking_id"])
                if scan_result.success:
                    scanned_packages.append({
                        "tracking_id": package["tracking_id"],
                        "destination_spoke": scan_result.destination,
                        "weight_kg": package["weight_kg"]
                    })
                else:
                    scan_errors += 1
                    scan_span.add_event("scan_failure", {
                        "tracking_id": package["tracking_id"],
                        "error": scan_result.error
                    })

            scan_span.set_attribute("scan.success_count", len(scanned_packages))
            scan_span.set_attribute("scan.error_count", scan_errors)

        # Sort packages by destination spoke
        with tracer.start_as_current_span("crossdock.inbound.sort") as sort_span:
            sorted_groups = sort_by_destination(scanned_packages)
            sort_span.set_attribute("sort.destination_count", len(sorted_groups))
            for dest, pkgs in sorted_groups.items():
                sort_span.add_event("destination_group", {
                    "destination": dest,
                    "package_count": len(pkgs)
                })

        # Route packages to outbound staging lanes
        with tracer.start_as_current_span("crossdock.inbound.route_to_staging"):
            for dest, pkgs in sorted_groups.items():
                assign_to_staging_lane(dest, pkgs)

        span.set_attribute("inbound.total_processed", len(scanned_packages))
        return sorted_groups
```

## Tracing Cross-Dock Sortation

The sortation process is the heart of cross-docking. Packages flow through conveyors, automated sorters, or manual processes to reach the correct outbound lane.

```python
def process_sortation(package_id: str, source_dock: int):
    with tracer.start_as_current_span("crossdock.sortation") as span:
        span.set_attribute("package.id", package_id)
        span.set_attribute("source.dock_door", source_dock)

        # Look up the destination for this package
        with tracer.start_as_current_span("crossdock.sortation.lookup_destination") as lookup_span:
            destination = lookup_package_destination(package_id)
            lookup_span.set_attribute("destination.spoke", destination.spoke_id)
            lookup_span.set_attribute("destination.outbound_lane", destination.lane_number)

        # Move package through the sort system
        with tracer.start_as_current_span("crossdock.sortation.convey") as convey_span:
            convey_result = send_to_sort_lane(package_id, destination.lane_number)
            convey_span.set_attribute("conveyor.segment_count", convey_result.segments)
            convey_span.set_attribute("conveyor.divert_point", convey_result.divert_id)
            convey_span.set_attribute("conveyor.travel_time_seconds", convey_result.travel_time)

            if convey_result.recirculated:
                convey_span.add_event("package_recirculated", {
                    "reason": convey_result.recirc_reason,
                    "attempts": convey_result.recirc_count
                })

        span.set_attribute("sortation.success", convey_result.delivered_to_lane)
```

## Tracing Outbound Loading

The final step is loading sorted packages onto the correct outbound trucks for their destination spokes.

```python
def load_outbound_truck(truck_id: str, spoke_id: str, dock_door: int):
    with tracer.start_as_current_span("crossdock.outbound.load") as span:
        span.set_attribute("truck.id", truck_id)
        span.set_attribute("spoke.id", spoke_id)
        span.set_attribute("dock.door_number", dock_door)

        # Get all packages staged for this spoke
        with tracer.start_as_current_span("crossdock.outbound.gather_staged"):
            staged_packages = get_staged_packages(spoke_id)
            span.set_attribute("outbound.package_count", len(staged_packages))

        # Load packages onto the truck with scan verification
        loaded = 0
        with tracer.start_as_current_span("crossdock.outbound.load_and_verify") as load_span:
            for pkg in staged_packages:
                scan_ok = verify_load_scan(pkg["tracking_id"], truck_id)
                if scan_ok:
                    loaded += 1
                else:
                    load_span.add_event("load_scan_mismatch", {
                        "tracking_id": pkg["tracking_id"],
                        "expected_truck": truck_id
                    })
            load_span.set_attribute("loaded.count", loaded)
            load_span.set_attribute("loaded.mismatches", len(staged_packages) - loaded)

        # Close out the truck and dispatch
        with tracer.start_as_current_span("crossdock.outbound.dispatch"):
            dispatch_result = close_and_dispatch_truck(truck_id, spoke_id)
            span.set_attribute("dispatch.departure_time", dispatch_result.departure_time.isoformat())
```

## Measuring Dwell Time

Dwell time is the key metric for cross-docking: how long does a package sit between inbound unloading and outbound departure? Lower is better.

```python
from opentelemetry import metrics

meter = metrics.get_meter("distribution.center")

dwell_time_histogram = meter.create_histogram(
    "crossdock.dwell_time_minutes",
    description="Time between inbound scan and outbound truck departure",
    unit="min"
)

packages_processed = meter.create_counter(
    "crossdock.packages.processed",
    description="Total packages processed through cross-dock"
)

recirculation_counter = meter.create_counter(
    "crossdock.sortation.recirculations",
    description="Packages that had to recirculate through the sorter"
)
```

## What Cross-Dock Traces Reveal

When you look at a trace for a single package flowing through the cross-dock, you can see exactly where it spent time. Maybe the sortation lookup was fast but the package sat in a staging lane for 45 minutes because the outbound truck was late. Or maybe inbound scanning was the bottleneck because the barcode printer at the origin spoke was producing poor quality labels. These are the kinds of operational insights that traces surface naturally once you have the instrumentation in place.
