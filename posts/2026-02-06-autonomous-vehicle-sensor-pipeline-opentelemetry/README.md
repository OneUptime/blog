# How to Trace Autonomous Vehicle Sensor Data Processing Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Autonomous Vehicles, Sensor Fusion, Real-Time Processing, Tracing

Description: Trace autonomous vehicle sensor data processing pipelines with OpenTelemetry to monitor lidar, camera, and radar fusion latency and throughput.

Autonomous vehicles process massive amounts of sensor data in real time. A single self-driving car can generate 1-2 TB of data per hour from lidar, cameras, radar, and ultrasonic sensors. This data flows through a processing pipeline that includes perception (object detection), fusion (combining sensor inputs), prediction (trajectory forecasting), and planning (decision making). Every stage has strict latency requirements. If the pipeline takes too long, the vehicle is driving blind.

OpenTelemetry can trace individual frames through this pipeline and collect latency metrics at each stage, both for real-time monitoring during testing and for post-drive analysis.

## The Sensor Pipeline

A typical autonomous driving stack processes data in this flow:

```
Lidar Point Cloud --> Object Detection --> |
Camera Frames    --> Image Detection   --> | --> Sensor Fusion --> Prediction --> Planning --> Control
Radar Returns    --> Radar Processing  --> |
```

Each sensor produces data at a fixed rate (e.g., lidar at 10 Hz, cameras at 30 Hz), and the pipeline must keep up.

## Setting Up Tracing for the Pipeline

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Initialize tracing with a large batch size for high-throughput pipeline
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4317"),
        max_queue_size=8192,
        max_export_batch_size=512
    )
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("av-sensor-pipeline")

# Metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=1000  # Export every second for near-real-time dashboards
)
metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
meter = metrics.get_meter("av-sensor-pipeline")

# Pipeline latency metrics
pipeline_latency = meter.create_histogram(
    "av.pipeline.total_latency_ms",
    description="Total end-to-end pipeline latency per frame",
    unit="ms"
)
stage_latency = meter.create_histogram(
    "av.pipeline.stage_latency_ms",
    description="Latency of individual pipeline stages",
    unit="ms"
)
frame_drop_rate = meter.create_counter(
    "av.pipeline.frames_dropped",
    description="Number of frames dropped due to pipeline overload"
)
objects_detected = meter.create_counter(
    "av.perception.objects_detected",
    description="Number of objects detected per frame"
)
fusion_objects = meter.create_gauge(
    "av.fusion.tracked_objects",
    description="Number of objects currently being tracked after fusion"
)
```

## Tracing a Single Frame Through the Pipeline

```python
def process_sensor_frame(frame_id, timestamp, lidar_data, camera_frames, radar_data):
    """
    Process a single synchronized sensor frame through the full pipeline.
    This runs at 10 Hz (100ms budget for the entire pipeline).
    """
    with tracer.start_as_current_span("av.pipeline.frame") as root_span:
        pipeline_start = time.monotonic()
        root_span.set_attribute("av.frame_id", frame_id)
        root_span.set_attribute("av.timestamp", timestamp)

        # Stage 1: Parallel perception on each sensor type
        # In a real system these run on separate threads/GPUs
        lidar_objects = process_lidar(frame_id, lidar_data)
        camera_objects = process_camera(frame_id, camera_frames)
        radar_objects = process_radar(frame_id, radar_data)

        # Stage 2: Sensor fusion
        fused_objects = run_fusion(frame_id, lidar_objects, camera_objects, radar_objects)

        # Stage 3: Prediction
        predictions = run_prediction(frame_id, fused_objects)

        # Stage 4: Planning
        plan = run_planning(frame_id, predictions)

        total_ms = (time.monotonic() - pipeline_start) * 1000
        pipeline_latency.record(total_ms)
        root_span.set_attribute("av.pipeline.total_ms", total_ms)

        # Flag if we exceeded our latency budget
        if total_ms > 100:
            root_span.set_attribute("av.pipeline.budget_exceeded", True)
            root_span.add_event("latency_budget_exceeded", {
                "budget_ms": 100,
                "actual_ms": total_ms
            })

        return plan
```

## Individual Stage Instrumentation

Each pipeline stage gets detailed tracing:

```python
def process_lidar(frame_id, point_cloud):
    """Process lidar point cloud through 3D object detection."""
    with tracer.start_as_current_span("av.perception.lidar") as span:
        start = time.monotonic()
        span.set_attribute("av.frame_id", frame_id)
        span.set_attribute("av.lidar.points", len(point_cloud))

        # Ground plane removal
        filtered = remove_ground_plane(point_cloud)
        span.set_attribute("av.lidar.points_after_filter", len(filtered))

        # 3D object detection (runs on GPU)
        detections = lidar_detector.inference(filtered)
        duration_ms = (time.monotonic() - start) * 1000

        span.set_attribute("av.lidar.detections", len(detections))
        span.set_attribute("av.lidar.inference_ms", duration_ms)
        stage_latency.record(duration_ms, {"stage": "lidar_perception"})
        objects_detected.add(len(detections), {"sensor": "lidar"})

        return detections


def process_camera(frame_id, camera_images):
    """Process camera images through 2D/3D detection."""
    with tracer.start_as_current_span("av.perception.camera") as span:
        start = time.monotonic()
        span.set_attribute("av.frame_id", frame_id)
        span.set_attribute("av.camera.count", len(camera_images))

        all_detections = []
        for cam_id, image in camera_images.items():
            detections = camera_detector.inference(image)
            all_detections.extend(detections)
            span.set_attribute(f"av.camera.{cam_id}.detections", len(detections))

        duration_ms = (time.monotonic() - start) * 1000
        stage_latency.record(duration_ms, {"stage": "camera_perception"})
        objects_detected.add(len(all_detections), {"sensor": "camera"})

        return all_detections


def run_fusion(frame_id, lidar_objects, camera_objects, radar_objects):
    """Fuse detections from all sensors into a unified object list."""
    with tracer.start_as_current_span("av.fusion") as span:
        start = time.monotonic()
        span.set_attribute("av.frame_id", frame_id)
        span.set_attribute("av.fusion.lidar_inputs", len(lidar_objects))
        span.set_attribute("av.fusion.camera_inputs", len(camera_objects))
        span.set_attribute("av.fusion.radar_inputs", len(radar_objects))

        # Multi-sensor fusion algorithm
        fused = sensor_fusion.fuse(lidar_objects, camera_objects, radar_objects)

        duration_ms = (time.monotonic() - start) * 1000
        span.set_attribute("av.fusion.output_objects", len(fused))
        span.set_attribute("av.fusion.duration_ms", duration_ms)
        stage_latency.record(duration_ms, {"stage": "fusion"})
        fusion_objects.set(len(fused))

        return fused
```

## Handling Frame Drops

When the pipeline falls behind, frames need to be dropped gracefully:

```python
class PipelineScheduler:
    """Manages frame scheduling and tracks dropped frames."""

    def __init__(self, target_hz=10):
        self.target_interval = 1.0 / target_hz
        self.last_frame_time = 0

    def should_process(self, frame_timestamp):
        """Decide whether to process this frame or drop it."""
        elapsed = frame_timestamp - self.last_frame_time

        if elapsed < self.target_interval * 0.5:
            # Too soon since last frame, drop it
            frame_drop_rate.add(1, {"reason": "too_frequent"})
            return False

        # Check if pipeline is still processing the previous frame
        if is_pipeline_busy():
            frame_drop_rate.add(1, {"reason": "pipeline_busy"})
            return False

        self.last_frame_time = frame_timestamp
        return True
```

## Alerts and Dashboards

Key things to watch:

- **Pipeline latency P99 above 80ms**: You are dangerously close to your 100ms frame budget.
- **Frame drop rate above 5%**: The pipeline cannot keep up with sensor input rate. Time to optimize or scale up compute.
- **Stage latency outliers**: If lidar perception occasionally spikes to 60ms, it could be causing downstream cascading delays.
- **Fusion object count dropping to zero**: If the fusion stage suddenly sees no objects, a sensor might have failed.

The traces let you drill into individual problematic frames and see exactly which stage was slow, while the metrics give you fleet-wide visibility across all test vehicles.
