# How to Monitor Warehouse Management System (WMS) Pick, Pack, and Ship Operations with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Warehouse Management, WMS, Supply Chain

Description: Instrument your warehouse management system pick, pack, and ship workflows with OpenTelemetry to find bottlenecks and improve throughput.

Warehouse management systems coordinate the movement of goods from shelf to shipping dock. Every order goes through a pick, pack, and ship pipeline, and each stage has its own set of potential delays. A slow pick path calculation, a barcode scan failure during packing, or a label generation timeout during shipping can all cascade into missed SLAs. OpenTelemetry lets you trace these operations and surface the problems.

## Initializing the Tracer for WMS

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

tracer = trace.get_tracer("wms.operations")
```

## Tracing the Pick Operation

The pick phase starts when a warehouse worker receives a pick list and ends when all items are collected from their bin locations. The system needs to calculate an efficient path through the warehouse aisles, validate each pick with a barcode scan, and handle exceptions like stock-outs.

```python
def execute_pick_operation(order_id: str, pick_list: list):
    with tracer.start_as_current_span("wms.pick") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("pick.item_count", len(pick_list))

        # Calculate the optimal pick path through the warehouse
        with tracer.start_as_current_span("wms.pick.path_calculation") as path_span:
            path = calculate_pick_path(pick_list)
            path_span.set_attribute("pick.path_length_meters", path.total_distance)
            path_span.set_attribute("pick.zone_count", len(path.zones))

        picked_items = []
        for item in pick_list:
            with tracer.start_as_current_span("wms.pick.scan_item") as item_span:
                item_span.set_attribute("item.sku", item["sku"])
                item_span.set_attribute("item.bin_location", item["bin"])
                item_span.set_attribute("item.quantity", item["qty"])

                # Simulate barcode scan validation
                scan_result = validate_barcode_scan(item["sku"], item["bin"])
                item_span.set_attribute("scan.valid", scan_result.valid)

                if not scan_result.valid:
                    item_span.add_event("pick_exception", {
                        "reason": scan_result.error,
                        "sku": item["sku"]
                    })
                    handle_pick_exception(order_id, item)
                else:
                    picked_items.append(item)

        span.set_attribute("pick.items_picked", len(picked_items))
        span.set_attribute("pick.exceptions", len(pick_list) - len(picked_items))
        return picked_items
```

## Tracing the Pack Operation

After items are picked, they move to a packing station. The pack phase involves verifying picked items against the order, selecting the right box size, and preparing the package for shipping.

```python
def execute_pack_operation(order_id: str, picked_items: list):
    with tracer.start_as_current_span("wms.pack") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("pack.item_count", len(picked_items))

        # Verify all items match the order
        with tracer.start_as_current_span("wms.pack.verify") as verify_span:
            verification = verify_picked_items(order_id, picked_items)
            verify_span.set_attribute("verification.passed", verification.passed)
            if not verification.passed:
                verify_span.add_event("verification_failed", {
                    "missing_items": str(verification.missing),
                    "extra_items": str(verification.extra)
                })

        # Select optimal box size based on item dimensions
        with tracer.start_as_current_span("wms.pack.box_selection") as box_span:
            box = select_optimal_box(picked_items)
            box_span.set_attribute("box.type", box.box_type)
            box_span.set_attribute("box.dimensions", f"{box.l}x{box.w}x{box.h}")
            box_span.set_attribute("box.weight_kg", box.total_weight)

        # Weigh the package for shipping rate calculation
        with tracer.start_as_current_span("wms.pack.weigh"):
            weight = weigh_package(box)
            span.set_attribute("pack.final_weight_kg", weight)

        return PackedOrder(order_id=order_id, box=box, weight=weight)
```

## Tracing the Ship Operation

Shipping is where external dependencies come into play. You are calling carrier APIs for rate quotes, generating labels, and updating tracking information. These external calls are frequent sources of latency.

```python
def execute_ship_operation(packed_order):
    with tracer.start_as_current_span("wms.ship") as span:
        span.set_attribute("order.id", packed_order.order_id)
        span.set_attribute("package.weight_kg", packed_order.weight)

        # Get shipping rates from multiple carriers
        with tracer.start_as_current_span("wms.ship.rate_shop") as rate_span:
            rates = fetch_carrier_rates(packed_order)
            rate_span.set_attribute("carriers.queried", len(rates))
            best_rate = select_best_rate(rates)
            rate_span.set_attribute("carrier.selected", best_rate.carrier_name)
            rate_span.set_attribute("shipping.cost_usd", best_rate.cost)

        # Generate the shipping label via carrier API
        with tracer.start_as_current_span("wms.ship.label_generation") as label_span:
            label_span.set_attribute("carrier.name", best_rate.carrier_name)
            label = generate_shipping_label(packed_order, best_rate)
            label_span.set_attribute("label.tracking_number", label.tracking_number)
            label_span.set_attribute("label.format", "ZPL")

        # Update the order management system
        with tracer.start_as_current_span("wms.ship.update_oms"):
            update_order_status(packed_order.order_id, "shipped", label.tracking_number)

        span.set_attribute("ship.tracking_number", label.tracking_number)
        return label
```

## Adding Metrics for Throughput Monitoring

Traces are great for debugging individual orders, but you also want aggregate metrics to monitor warehouse throughput.

```python
from opentelemetry import metrics

meter = metrics.get_meter("wms.operations")

# Track orders processed per stage
orders_picked = meter.create_counter("wms.orders.picked", description="Orders completed picking")
orders_packed = meter.create_counter("wms.orders.packed", description="Orders completed packing")
orders_shipped = meter.create_counter("wms.orders.shipped", description="Orders shipped")

# Track pick exceptions
pick_exceptions = meter.create_counter(
    "wms.pick.exceptions",
    description="Pick exceptions like stock-outs or scan failures"
)

# Histogram for stage durations
pick_duration = meter.create_histogram("wms.pick.duration_seconds", unit="s")
pack_duration = meter.create_histogram("wms.pack.duration_seconds", unit="s")
ship_duration = meter.create_histogram("wms.ship.duration_seconds", unit="s")
```

## Tying It All Together

The real power comes when you trace the complete order fulfillment lifecycle as a single distributed trace. When a customer's order enters the WMS, start a root span. Each phase (pick, pack, ship) becomes a child span with its own nested operations.

This way, when an order takes 45 minutes instead of the expected 15, you can open the trace and immediately see whether the bottleneck was in pick path calculation (maybe a zone was congested), box selection (unusual item dimensions), or carrier API latency (a provider was down). That level of visibility turns warehouse operations from a black box into a transparent pipeline you can optimize with data.
