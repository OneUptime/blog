# How to Monitor Quality Control Inspection Pipeline (Vision AI, Sensor Check) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Quality Control, Vision AI, Inspection Pipeline, Manufacturing

Description: Monitor quality control inspection pipelines that combine vision AI and sensor checks using OpenTelemetry for latency tracking and defect rate analysis.

Modern quality control on a production line combines multiple inspection methods: vision AI cameras that detect surface defects, dimensional sensors that verify measurements, weight checks, and sometimes even acoustic analysis. Each inspection point is a potential bottleneck, and if the inspection pipeline slows down, the entire production line backs up.

OpenTelemetry lets you trace each item through the full inspection pipeline and collect metrics on inspection throughput, defect rates, and model inference times.

## Pipeline Architecture

A typical QC pipeline for a manufactured part looks like:

1. Part arrives at inspection station (barcode/RFID scan)
2. Vision AI camera captures image and runs defect detection
3. Dimensional measurement via laser sensor
4. Weight check
5. Pass/fail decision and routing

## Setting Up Instrumentation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Initialize tracing
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("qc-inspection-pipeline")

# Initialize metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=5000
)
metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
meter = metrics.get_meter("qc-inspection-pipeline")

# Pipeline metrics
inspection_duration = meter.create_histogram(
    "qc.inspection.total_duration_ms",
    description="Total time for complete inspection of one part",
    unit="ms"
)
vision_inference_time = meter.create_histogram(
    "qc.vision.inference_time_ms",
    description="Time for vision AI model inference",
    unit="ms"
)
defect_count = meter.create_counter(
    "qc.defects.detected",
    description="Number of defects detected by type"
)
parts_inspected = meter.create_counter(
    "qc.parts.inspected",
    description="Total parts that completed inspection"
)
parts_rejected = meter.create_counter(
    "qc.parts.rejected",
    description="Parts rejected during inspection"
)
pipeline_queue_depth = meter.create_gauge(
    "qc.pipeline.queue_depth",
    description="Number of parts waiting for inspection"
)
```

## Tracing a Full Inspection

```python
def inspect_part(part_id, product_type, line_id):
    """
    Run a part through the full QC inspection pipeline.
    Each inspection step is a child span for granular timing.
    """
    with tracer.start_as_current_span("qc.inspection.full") as root_span:
        start = time.monotonic()
        root_span.set_attribute("qc.part_id", part_id)
        root_span.set_attribute("qc.product_type", product_type)
        root_span.set_attribute("qc.line_id", line_id)

        results = {}
        all_passed = True

        # Step 1: Vision AI inspection
        vision_result = run_vision_inspection(part_id, product_type)
        results["vision"] = vision_result
        if not vision_result["passed"]:
            all_passed = False

        # Step 2: Dimensional check
        dimension_result = run_dimensional_check(part_id, product_type)
        results["dimensional"] = dimension_result
        if not dimension_result["passed"]:
            all_passed = False

        # Step 3: Weight check
        weight_result = run_weight_check(part_id, product_type)
        results["weight"] = weight_result
        if not weight_result["passed"]:
            all_passed = False

        # Record final result
        total_ms = (time.monotonic() - start) * 1000
        inspection_duration.record(total_ms, {"product_type": product_type, "line_id": line_id})
        parts_inspected.add(1, {"product_type": product_type, "line_id": line_id})

        root_span.set_attribute("qc.result", "pass" if all_passed else "fail")
        root_span.set_attribute("qc.total_duration_ms", total_ms)

        if not all_passed:
            parts_rejected.add(1, {"product_type": product_type, "line_id": line_id})

        return {"passed": all_passed, "results": results}
```

## Vision AI Inspection with Detailed Tracing

The vision AI step often takes the longest and deserves the most detailed instrumentation:

```python
def run_vision_inspection(part_id, product_type):
    """
    Capture an image and run the defect detection model.
    Track camera capture time and model inference time separately.
    """
    with tracer.start_as_current_span("qc.vision.inspect") as span:
        span.set_attribute("qc.part_id", part_id)

        # Camera capture
        with tracer.start_as_current_span("qc.vision.capture") as capture_span:
            capture_start = time.monotonic()
            image = camera.capture(exposure_ms=5, gain=1.0)
            capture_ms = (time.monotonic() - capture_start) * 1000
            capture_span.set_attribute("qc.capture.duration_ms", capture_ms)
            capture_span.set_attribute("qc.capture.resolution", f"{image.width}x{image.height}")

        # Preprocessing (resize, normalize)
        with tracer.start_as_current_span("qc.vision.preprocess") as preproc_span:
            preproc_start = time.monotonic()
            tensor = preprocess_image(image, target_size=(640, 640))
            preproc_ms = (time.monotonic() - preproc_start) * 1000
            preproc_span.set_attribute("qc.preprocess.duration_ms", preproc_ms)

        # Model inference
        with tracer.start_as_current_span("qc.vision.inference") as infer_span:
            infer_start = time.monotonic()
            detections = defect_model.predict(tensor, confidence_threshold=0.85)
            infer_ms = (time.monotonic() - infer_start) * 1000

            infer_span.set_attribute("qc.inference.duration_ms", infer_ms)
            infer_span.set_attribute("qc.inference.model_name", "defect-yolov8-v3")
            infer_span.set_attribute("qc.inference.device", "gpu:0")
            infer_span.set_attribute("qc.inference.detections_count", len(detections))

            vision_inference_time.record(infer_ms, {"product_type": product_type})

        # Process detections
        passed = True
        for det in detections:
            defect_count.add(1, {
                "defect_type": det.label,
                "product_type": product_type
            })
            span.add_event("defect_detected", {
                "defect_type": det.label,
                "confidence": det.confidence,
                "bbox": str(det.bbox)
            })
            if det.confidence > 0.95:  # High-confidence defects cause rejection
                passed = False

        span.set_attribute("qc.vision.passed", passed)
        return {"passed": passed, "defects": len(detections)}
```

## Dimensional and Weight Checks

```python
def run_dimensional_check(part_id, product_type):
    """Measure part dimensions using laser sensor."""
    with tracer.start_as_current_span("qc.dimensional.check") as span:
        specs = get_dimensional_specs(product_type)
        measurements = laser_sensor.measure(part_id)

        span.set_attribute("qc.part_id", part_id)
        passed = True
        for dim_name, measured_value in measurements.items():
            spec = specs[dim_name]
            within_tolerance = spec["min"] <= measured_value <= spec["max"]
            span.set_attribute(f"qc.dim.{dim_name}", measured_value)
            if not within_tolerance:
                passed = False
                defect_count.add(1, {"defect_type": f"dimension_{dim_name}_out_of_spec"})

        span.set_attribute("qc.dimensional.passed", passed)
        return {"passed": passed, "measurements": measurements}

def run_weight_check(part_id, product_type):
    """Verify part weight is within acceptable range."""
    with tracer.start_as_current_span("qc.weight.check") as span:
        spec = get_weight_spec(product_type)
        weight_g = scale.read_weight()

        span.set_attribute("qc.part_id", part_id)
        span.set_attribute("qc.weight_g", weight_g)
        span.set_attribute("qc.weight_spec_min_g", spec["min"])
        span.set_attribute("qc.weight_spec_max_g", spec["max"])

        passed = spec["min"] <= weight_g <= spec["max"]
        span.set_attribute("qc.weight.passed", passed)

        if not passed:
            defect_count.add(1, {"defect_type": "weight_out_of_spec"})

        return {"passed": passed, "weight_g": weight_g}
```

## Dashboards and Alerts

Build dashboards around these key views:

- **Inspection throughput**: Parts per minute through the pipeline, broken down by line.
- **Defect Pareto chart**: Which defect types occur most frequently? Use the `qc.defects.detected` counter grouped by `defect_type`.
- **Vision AI latency trend**: If inference time creeps up, you might need to optimize the model or upgrade GPU hardware.
- **Rejection rate by product**: Some products naturally have higher rejection rates, but sudden changes warrant investigation.

Alert on pipeline queue depth growing beyond a threshold, since that means inspections are falling behind production speed.

The traces give you the ability to investigate individual failed parts and see exactly which check caught the defect, while the metrics provide the aggregate view needed for continuous improvement programs.
