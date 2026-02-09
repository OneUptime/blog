# How to Monitor Industrial IoT Sensor Data Ingestion Pipelines (MQTT to Cloud) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, IoT, MQTT, Sensor Data, Industrial Monitoring

Description: Learn how to instrument and monitor industrial IoT sensor data ingestion pipelines from MQTT brokers to cloud storage using OpenTelemetry traces and metrics.

Industrial IoT deployments often involve thousands of sensors pushing data through MQTT brokers, then into cloud platforms for storage and analytics. When something breaks in that pipeline, finding the root cause can be painful. A sensor might be publishing data, but if that data never reaches your cloud database, where did it get lost? Was it the broker? The bridge service? The cloud ingestion layer?

OpenTelemetry gives you a way to trace every message from sensor publish to cloud write, and collect metrics at each stage so you can spot bottlenecks before they become outages.

## Architecture Overview

A typical pipeline looks like this:

1. Sensors publish readings via MQTT to a broker (like Mosquitto or EMQX)
2. A bridge service subscribes to topics and forwards data
3. Cloud ingestion writes to a time-series database

We will instrument steps 2 and 3 since sensors themselves are usually too constrained for tracing.

## Setting Up the MQTT Bridge with Tracing

Here is a Python bridge service that subscribes to sensor topics and forwards data, instrumented with OpenTelemetry:

```python
import json
import paho.mqtt.client as mqtt
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Initialize tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("iot-mqtt-bridge")

# Initialize metrics
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000
)
meter_provider = MeterProvider(metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
meter = metrics.get_meter("iot-mqtt-bridge")

# Create counters and histograms for pipeline monitoring
messages_received = meter.create_counter(
    "mqtt.messages.received",
    description="Number of MQTT messages received from sensors"
)
messages_forwarded = meter.create_counter(
    "mqtt.messages.forwarded",
    description="Number of messages successfully forwarded to cloud"
)
processing_duration = meter.create_histogram(
    "mqtt.message.processing_duration_ms",
    description="Time taken to process and forward a single message"
)

def on_message(client, userdata, msg):
    """Handle incoming MQTT messages with full tracing."""
    # Start a span for each message processed
    with tracer.start_as_current_span("mqtt.message.process") as span:
        topic_parts = msg.topic.split("/")
        # Extract sensor metadata from topic structure like sensors/factory-1/temp/sensor-42
        factory = topic_parts[1] if len(topic_parts) > 1 else "unknown"
        sensor_id = topic_parts[3] if len(topic_parts) > 3 else "unknown"

        span.set_attribute("mqtt.topic", msg.topic)
        span.set_attribute("sensor.factory", factory)
        span.set_attribute("sensor.id", sensor_id)
        span.set_attribute("message.size_bytes", len(msg.payload))

        messages_received.add(1, {"factory": factory, "sensor.type": topic_parts[2]})

        try:
            payload = json.loads(msg.payload)
            # Forward to cloud ingestion
            forward_to_cloud(payload, factory, sensor_id)
            messages_forwarded.add(1, {"factory": factory})
        except json.JSONDecodeError:
            span.set_attribute("error", True)
            span.set_attribute("error.type", "invalid_json")
```

## Instrumenting the Cloud Ingestion Layer

The `forward_to_cloud` function creates a child span so you can see the full trace from MQTT receipt through cloud write:

```python
import time
import requests

def forward_to_cloud(payload, factory, sensor_id):
    """Forward sensor data to cloud API with tracing."""
    with tracer.start_as_current_span("cloud.ingest.write") as span:
        start = time.monotonic()

        span.set_attribute("cloud.target", "timeseries-db")
        span.set_attribute("sensor.factory", factory)
        span.set_attribute("sensor.id", sensor_id)

        # Build the cloud API request
        cloud_payload = {
            "factory": factory,
            "sensor_id": sensor_id,
            "timestamp": payload.get("ts"),
            "readings": payload.get("readings", {})
        }

        response = requests.post(
            "https://ingest.yourcloud.com/v1/write",
            json=cloud_payload,
            timeout=5
        )

        duration_ms = (time.monotonic() - start) * 1000
        processing_duration.record(duration_ms, {"factory": factory})

        span.set_attribute("http.status_code", response.status_code)
        if response.status_code != 200:
            span.set_attribute("error", True)
            span.set_attribute("error.message", response.text[:200])
```

## Configuring the OpenTelemetry Collector

You need an OTel Collector config that handles both traces and metrics from the bridge:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  # Filter out high-frequency heartbeat messages to reduce noise
  filter:
    metrics:
      exclude:
        match_type: strict
        metric_names:
          - mqtt.heartbeat.count

exporters:
  otlp:
    endpoint: "https://oneuptime.com/otlp"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch, filter]
      exporters: [otlp]
```

## Key Metrics to Watch

Once you have this running, set up alerts on these signals:

- **Message lag**: If `mqtt.messages.received` grows faster than `mqtt.messages.forwarded`, your bridge is falling behind.
- **Processing duration spikes**: The `processing_duration_ms` histogram will show when cloud writes are getting slow.
- **Error rates by factory**: Breaking down errors by the `factory` attribute helps you isolate whether a problem is local to one site or systemic.

## Handling Backpressure

One thing that comes up in production is MQTT message floods. If a sensor starts misbehaving and publishing at 10x its normal rate, your bridge can choke. Add a gauge metric for queue depth:

```python
queue_depth = meter.create_up_down_counter(
    "mqtt.bridge.queue_depth",
    description="Current number of messages waiting to be processed"
)

# Increment when a message arrives
queue_depth.add(1, {"factory": factory})
# Decrement after processing completes
queue_depth.add(-1, {"factory": factory})
```

This lets you build dashboards that show per-factory queue buildup in real time, so you can react before messages start getting dropped.

## Wrapping Up

The combination of distributed traces and pipeline metrics gives you full visibility into your MQTT-to-cloud ingestion path. You can trace a single sensor reading from the moment it arrives at your bridge all the way to the cloud write confirmation. More importantly, you can aggregate metrics across thousands of sensors to spot systemic issues early. Start with the bridge service instrumentation since that is where most pipeline failures surface, and expand from there.
