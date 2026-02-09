# How to Trace Manufacturing Execution System (MES) Work Order Flows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, MES, Manufacturing, Work Orders, Process Tracing

Description: Trace work order flows through a Manufacturing Execution System using OpenTelemetry to identify bottlenecks and improve production throughput.

A Manufacturing Execution System (MES) orchestrates everything on the production floor: work orders, material tracking, quality checks, equipment scheduling, and labor management. When a work order takes longer than expected, the root cause could be anywhere. Maybe the material was not staged on time, maybe a machine was down for maintenance, or maybe a quality hold delayed the next step.

OpenTelemetry distributed tracing lets you follow a work order from creation to completion, with visibility into every stage it passes through.

## Work Order Lifecycle as a Trace

A typical MES work order goes through these stages:

1. **Created**: Order received from ERP
2. **Material staged**: Raw materials pulled from inventory
3. **Scheduled**: Assigned to a production line and time slot
4. **In Progress**: Actively being manufactured (multiple operations)
5. **Quality check**: Inspection and testing
6. **Complete**: Finished goods moved to warehouse

Each stage becomes a span in the trace.

## Setting Up the MES Tracer

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("mes-work-order")

# Metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317")
)
metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
meter = metrics.get_meter("mes-work-order")

# KPI metrics
cycle_time = meter.create_histogram(
    "mes.work_order.cycle_time_minutes",
    description="Total time from work order creation to completion",
    unit="min"
)
stage_duration = meter.create_histogram(
    "mes.work_order.stage_duration_minutes",
    description="Time spent in each work order stage",
    unit="min"
)
active_orders = meter.create_up_down_counter(
    "mes.work_orders.active",
    description="Number of currently active work orders"
)
scrap_count = meter.create_counter(
    "mes.work_order.scrap_units",
    description="Number of scrapped units per work order"
)
```

## Tracing Work Order Creation

When the ERP system pushes a new work order to the MES:

```python
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
import datetime

propagator = TraceContextTextMapPropagator()

def create_work_order(wo_number, product_id, quantity, due_date, bom_id):
    """
    Create a new work order and start the root trace span.
    We store the trace context so subsequent stages can link back.
    """
    with tracer.start_as_current_span("work_order.lifecycle") as span:
        span.set_attribute("mes.wo_number", wo_number)
        span.set_attribute("mes.product_id", product_id)
        span.set_attribute("mes.quantity", quantity)
        span.set_attribute("mes.due_date", due_date)
        span.set_attribute("mes.bom_id", bom_id)

        # Persist trace context for later stages
        carrier = {}
        propagator.inject(carrier)

        active_orders.add(1, {"product_id": product_id})

        work_order = {
            "wo_number": wo_number,
            "product_id": product_id,
            "quantity": quantity,
            "due_date": due_date,
            "bom_id": bom_id,
            "trace_context": carrier,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "status": "created"
        }
        save_work_order(work_order)
        return work_order
```

## Tracing Individual Production Operations

Each operation on a work order (machining, assembly, welding, etc.) gets its own span:

```python
def start_operation(wo_number, operation_id, workstation_id, operator_id):
    """
    Begin a production operation within a work order.
    Returns a context object to pass to complete_operation.
    """
    work_order = get_work_order(wo_number)
    parent_ctx = propagator.extract(work_order["trace_context"])

    span = tracer.start_span(
        f"work_order.operation.{operation_id}",
        context=parent_ctx
    )
    span.set_attribute("mes.wo_number", wo_number)
    span.set_attribute("mes.operation_id", operation_id)
    span.set_attribute("mes.workstation_id", workstation_id)
    span.set_attribute("mes.operator_id", operator_id)
    span.set_attribute("mes.operation_start", datetime.datetime.utcnow().isoformat())

    # Store the span reference so we can end it when the operation completes
    operation_context = {
        "span": span,
        "start_time": datetime.datetime.utcnow(),
        "wo_number": wo_number,
        "operation_id": operation_id
    }
    save_operation_context(wo_number, operation_id, operation_context)
    return operation_context


def complete_operation(wo_number, operation_id, good_count, scrap, notes=""):
    """
    Complete a production operation and record results.
    """
    ctx = get_operation_context(wo_number, operation_id)
    span = ctx["span"]

    duration_minutes = (datetime.datetime.utcnow() - ctx["start_time"]).total_seconds() / 60.0

    span.set_attribute("mes.good_count", good_count)
    span.set_attribute("mes.scrap_count", scrap)
    span.set_attribute("mes.duration_minutes", duration_minutes)
    if notes:
        span.set_attribute("mes.operator_notes", notes)

    # Record metrics
    stage_duration.record(duration_minutes, {
        "operation_id": operation_id,
        "workstation_id": ctx.get("workstation_id", "unknown")
    })
    if scrap > 0:
        scrap_count.add(scrap, {
            "wo_number": wo_number,
            "operation_id": operation_id
        })

    span.end()
```

## Tracing Quality Holds

Quality holds are a major source of production delays. Trace them explicitly:

```python
def place_quality_hold(wo_number, reason, inspector_id):
    """Place a work order on quality hold."""
    work_order = get_work_order(wo_number)
    parent_ctx = propagator.extract(work_order["trace_context"])

    # Start a span that will stay open until the hold is released
    span = tracer.start_span("work_order.quality_hold", context=parent_ctx)
    span.set_attribute("mes.wo_number", wo_number)
    span.set_attribute("mes.hold_reason", reason)
    span.set_attribute("mes.inspector_id", inspector_id)
    span.set_attribute("mes.hold_start", datetime.datetime.utcnow().isoformat())

    save_hold_context(wo_number, {"span": span, "start": datetime.datetime.utcnow()})

def release_quality_hold(wo_number, disposition, inspector_id):
    """Release a quality hold with a disposition decision."""
    hold_ctx = get_hold_context(wo_number)
    span = hold_ctx["span"]

    hold_duration = (datetime.datetime.utcnow() - hold_ctx["start"]).total_seconds() / 60.0
    span.set_attribute("mes.disposition", disposition)  # "accept", "rework", "scrap"
    span.set_attribute("mes.hold_duration_minutes", hold_duration)
    span.set_attribute("mes.releasing_inspector", inspector_id)

    stage_duration.record(hold_duration, {"stage": "quality_hold", "disposition": disposition})
    span.end()
```

## What You Learn from the Traces

With this instrumentation, you can answer questions like:

- Which operations consistently take longer than their standard time?
- How much time do work orders spend waiting between operations versus being actively worked on?
- Which products have the highest quality hold rates?
- Which workstations are bottlenecks?

The traces give you a detailed timeline of each individual work order, while the metrics give you aggregate views across your entire production floor. Together, they replace the spreadsheet-based production analysis that many factories still rely on.
