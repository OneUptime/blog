# How to Instrument 3D Printing and Additive Manufacturing Job Queue Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, 3D Printing, Additive Manufacturing, Job Queue, Production Monitoring

Description: Instrument 3D printing and additive manufacturing job queues with OpenTelemetry to track print job lifecycle, machine utilization, and failure rates.

Additive manufacturing has moved beyond prototyping into production. Companies run fleets of 3D printers producing end-use parts, and managing the job queue across dozens of machines is a real operations challenge. Print jobs can take anywhere from minutes to days, machines have different capabilities and material loadouts, and failures mid-print waste both time and expensive material.

OpenTelemetry gives you the observability to track every print job from submission through completion, monitor machine fleet utilization, and identify patterns in print failures.

## Job Queue Architecture

A typical additive manufacturing workflow:

1. Job submitted (STL/3MF file + print parameters)
2. Job sliced (converted to machine instructions)
3. Job queued (waiting for a compatible machine)
4. Job assigned to a printer
5. Print in progress (could be hours or days)
6. Post-processing (support removal, curing, inspection)
7. Complete

## Setting Up Instrumentation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Tracing
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("additive-manufacturing")

# Metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000
)
metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
meter = metrics.get_meter("additive-manufacturing")

# Job queue metrics
queue_depth = meter.create_gauge(
    "am.queue.depth",
    description="Number of jobs waiting to be printed"
)
queue_wait_time = meter.create_histogram(
    "am.queue.wait_time_minutes",
    description="Time a job spends waiting in queue before printing starts",
    unit="min"
)
job_duration = meter.create_histogram(
    "am.job.duration_hours",
    description="Total duration of a print job",
    unit="h"
)
slice_time = meter.create_histogram(
    "am.slicing.duration_seconds",
    description="Time to slice a model into print instructions",
    unit="s"
)
jobs_completed = meter.create_counter(
    "am.jobs.completed",
    description="Number of print jobs completed"
)
jobs_failed = meter.create_counter(
    "am.jobs.failed",
    description="Number of print jobs that failed"
)
material_used_grams = meter.create_counter(
    "am.material.used_grams",
    description="Total material consumed in grams",
    unit="g"
)
material_wasted_grams = meter.create_counter(
    "am.material.wasted_grams",
    description="Material wasted on failed prints",
    unit="g"
)
printer_utilization = meter.create_gauge(
    "am.printer.utilization_percent",
    description="Percentage of time a printer is actively printing",
    unit="percent"
)
```

## Tracing a Print Job Lifecycle

```python
import time
import datetime
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

propagator = TraceContextTextMapPropagator()

def submit_print_job(job_id, model_file, material, layer_height, infill, priority="normal"):
    """
    Submit a new print job and start its lifecycle trace.
    """
    with tracer.start_as_current_span("am.job.lifecycle") as span:
        span.set_attribute("am.job_id", job_id)
        span.set_attribute("am.model_file", model_file)
        span.set_attribute("am.material", material)
        span.set_attribute("am.layer_height_mm", layer_height)
        span.set_attribute("am.infill_percent", infill)
        span.set_attribute("am.priority", priority)

        # Slice the model
        slice_result = slice_model(job_id, model_file, layer_height, infill)
        span.set_attribute("am.estimated_print_hours", slice_result["estimated_hours"])
        span.set_attribute("am.estimated_material_grams", slice_result["material_grams"])
        span.set_attribute("am.layer_count", slice_result["layers"])

        # Save trace context for later stages
        carrier = {}
        propagator.inject(carrier)

        job = {
            "job_id": job_id,
            "status": "queued",
            "submitted_at": datetime.datetime.utcnow().isoformat(),
            "trace_context": carrier,
            "slice_result": slice_result,
            "material": material,
            "priority": priority
        }
        save_job(job)
        update_queue_depth()
        return job


def slice_model(job_id, model_file, layer_height, infill):
    """Slice a 3D model into printer instructions."""
    with tracer.start_as_current_span("am.job.slice") as span:
        start = time.monotonic()
        span.set_attribute("am.job_id", job_id)

        # Run the slicer (this can take seconds to minutes for complex models)
        result = slicer_engine.slice(
            model_path=model_file,
            layer_height=layer_height,
            infill_percent=infill
        )

        duration_s = time.monotonic() - start
        slice_time.record(duration_s, {"material": "generic"})
        span.set_attribute("am.slice.duration_s", duration_s)
        span.set_attribute("am.slice.gcode_size_mb", result.gcode_size_mb)

        return {
            "estimated_hours": result.estimated_hours,
            "material_grams": result.material_grams,
            "layers": result.layer_count,
            "gcode_path": result.gcode_path
        }
```

## Monitoring Print Progress

For long-running prints, report progress at regular intervals:

```python
def monitor_active_print(job_id, printer_id):
    """
    Monitor an active print job. Called by the print manager at regular intervals.
    Updates metrics and checks for failures.
    """
    job = get_job(job_id)
    parent_ctx = propagator.extract(job["trace_context"])

    printer_state = get_printer_state(printer_id)

    with tracer.start_as_current_span("am.job.progress_check", context=parent_ctx) as span:
        span.set_attribute("am.job_id", job_id)
        span.set_attribute("am.printer_id", printer_id)
        span.set_attribute("am.progress_percent", printer_state["progress"])
        span.set_attribute("am.current_layer", printer_state["current_layer"])
        span.set_attribute("am.nozzle_temp_c", printer_state["nozzle_temp"])
        span.set_attribute("am.bed_temp_c", printer_state["bed_temp"])

        # Detect failure conditions
        if printer_state["error_code"] is not None:
            handle_print_failure(job_id, printer_id, printer_state["error_code"])
            return "failed"

        # Check for thermal runaway or layer adhesion issues
        if printer_state["nozzle_temp"] > printer_state["target_nozzle_temp"] + 15:
            span.add_event("thermal_warning", {
                "actual_temp": printer_state["nozzle_temp"],
                "target_temp": printer_state["target_nozzle_temp"]
            })

        return "printing"


def handle_print_failure(job_id, printer_id, error_code):
    """Handle a failed print job."""
    job = get_job(job_id)
    parent_ctx = propagator.extract(job["trace_context"])

    with tracer.start_as_current_span("am.job.failure", context=parent_ctx) as span:
        span.set_attribute("am.job_id", job_id)
        span.set_attribute("am.printer_id", printer_id)
        span.set_attribute("am.error_code", error_code)
        span.set_status(trace.StatusCode.ERROR, f"Print failed: {error_code}")

        # Calculate wasted material based on progress
        progress = get_printer_state(printer_id)["progress"] / 100.0
        estimated_material = job["slice_result"]["material_grams"]
        wasted = estimated_material * progress

        material_wasted_grams.add(wasted, {
            "material": job["material"],
            "error_code": error_code
        })
        jobs_failed.add(1, {
            "material": job["material"],
            "error_code": error_code,
            "printer_id": printer_id
        })
```

## Fleet Utilization Tracking

```python
def update_fleet_metrics():
    """Update printer fleet utilization metrics. Runs every 60 seconds."""
    printers = get_all_printers()

    for printer in printers:
        # Calculate utilization over the last hour
        active_minutes = get_active_minutes(printer["id"], window_hours=1)
        utilization = (active_minutes / 60.0) * 100

        printer_utilization.set(utilization, {
            "printer_id": printer["id"],
            "printer_model": printer["model"],
            "material_loaded": printer["material"]
        })

    # Update queue depth by material type
    queue = get_pending_jobs()
    material_counts = {}
    for job in queue:
        mat = job["material"]
        material_counts[mat] = material_counts.get(mat, 0) + 1

    for material, count in material_counts.items():
        queue_depth.set(count, {"material": material})
```

## What to Alert On

- **Queue wait time above 4 hours for high-priority jobs**: Something is blocking the queue. Check if printers are down or if there is a material shortage.
- **Failure rate above 5% per printer**: A specific printer might need maintenance or calibration.
- **Material waste trending up**: Check for a bad batch of filament/resin or a slicer configuration issue.
- **Fleet utilization below 60%**: Either demand is low or the scheduler is not efficiently assigning jobs.
- **Thermal warnings**: Repeated temperature deviations suggest a hardware issue with the hotend or heated bed.

The traces give you a complete history of every print job, while the metrics provide the operational dashboards needed to run an additive manufacturing operation efficiently. When a customer asks why their part is late, you can pull up the trace and see exactly what happened.
