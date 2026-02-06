# How to Trace Medical Device Data Ingestion Pipelines (Vitals, Lab Results) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Medical Devices, IoT, Data Pipelines

Description: Trace the complete data flow from medical devices through ingestion pipelines to clinical systems using OpenTelemetry distributed tracing.

Medical devices generate a constant stream of critical data: heart rate monitors pushing vitals every few seconds, blood gas analyzers producing lab results, and ventilators reporting airway pressures. When this data does not arrive in the clinical system within an acceptable time window, patient safety is at risk. A delayed critical lab result or a missing vital sign can change clinical outcomes.

This post shows how to instrument the data ingestion pipeline from medical devices through your middleware and into the clinical systems, using OpenTelemetry to trace every step.

## Architecture of a Typical Medical Device Data Pipeline

Most medical device pipelines follow this pattern: Device sends data via HL7, MQTT, or proprietary protocol to a gateway. The gateway normalizes the data, validates it, and forwards it to a message queue. A consumer picks up the message, transforms it into FHIR or HL7 format, and routes it to the EHR or clinical data repository.

Each of these hops is a place where data can be delayed or lost. Let us instrument them all.

## Instrumenting the Device Gateway

The gateway is the first point where you can inject tracing. Here is a Python-based gateway that receives data over MQTT from bedside monitors:

```python
import json
import time
import paho.mqtt.client as mqtt
from opentelemetry import trace, context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.trace.propagation import set_span_in_context

# Initialize the tracer
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="localhost:4317")))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("device-gateway", "1.0.0")

def on_device_message(client, userdata, msg):
    """
    Called when a medical device publishes data via MQTT.
    This is the entry point of the trace.
    """
    device_data = json.loads(msg.payload)
    device_id = device_data.get("device_id", "unknown")
    data_type = device_data.get("type", "unknown")  # "vitals", "lab_result", etc.

    # Start a new trace for this device reading
    with tracer.start_as_current_span("device.data.received") as span:
        span.set_attribute("device.id", device_id)
        span.set_attribute("device.data_type", data_type)
        span.set_attribute("device.protocol", "mqtt")
        span.set_attribute("device.topic", msg.topic)

        # Record the device timestamp vs. gateway receive time
        device_ts = device_data.get("timestamp", 0)
        gateway_ts = time.time()
        transport_delay_ms = (gateway_ts - device_ts) * 1000
        span.set_attribute("device.transport_delay_ms", transport_delay_ms)

        # Validate the incoming data
        validated = validate_device_data(device_data)

        # Normalize and forward to the message queue
        if validated:
            normalized = normalize_to_fhir_observation(device_data)
            publish_to_queue(normalized, trace.get_current_span())
        else:
            span.set_status(trace.Status(trace.StatusCode.ERROR, "Validation failed"))
            span.add_event("validation_failure", {
                "device.id": device_id,
                "reason": "Data outside expected range"
            })


def validate_device_data(data):
    """Validate that device readings are within physiologically possible ranges."""
    with tracer.start_as_current_span("device.data.validate") as span:
        data_type = data.get("type", "")
        is_valid = True

        if data_type == "vitals":
            hr = data.get("heart_rate", 0)
            # Heart rate outside 20-300 is almost certainly a sensor error
            if hr < 20 or hr > 300:
                is_valid = False
                span.add_event("invalid_heart_rate", {"value": hr})

        span.set_attribute("device.validation.result", "pass" if is_valid else "fail")
        return is_valid
```

## Propagating Context Through the Message Queue

The hardest part of tracing a device pipeline is maintaining trace context across the message queue. Here is how to inject the trace context into Kafka message headers:

```python
from opentelemetry.propagate import inject, extract
from confluent_kafka import Producer, Consumer

def publish_to_queue(normalized_data, current_span):
    """Publish normalized device data to Kafka with trace context."""
    with tracer.start_as_current_span("queue.publish") as span:
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination", "device-data-normalized")
        span.set_attribute("messaging.operation", "publish")

        # Inject trace context into Kafka headers so the consumer
        # can continue the same trace
        headers = {}
        inject(headers)

        kafka_headers = [(k, v.encode()) for k, v in headers.items()]

        producer = Producer({"bootstrap.servers": "kafka:9092"})
        producer.produce(
            topic="device-data-normalized",
            value=json.dumps(normalized_data).encode(),
            headers=kafka_headers,
        )
        producer.flush()


def consume_device_data():
    """Consumer that picks up device data and routes to clinical systems."""
    consumer = Consumer({
        "bootstrap.servers": "kafka:9092",
        "group.id": "clinical-router",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe(["device-data-normalized"])

    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue

        # Extract trace context from Kafka headers to continue the trace
        headers_dict = {k: v.decode() for k, v in msg.headers() or []}
        ctx = extract(headers_dict)

        with tracer.start_as_current_span("queue.consume", context=ctx) as span:
            span.set_attribute("messaging.system", "kafka")
            span.set_attribute("messaging.operation", "consume")

            data = json.loads(msg.value())
            route_to_clinical_system(data)
```

## Routing to Clinical Systems with Full Trace Context

The final hop sends the data into the EHR or clinical data repository:

```python
def route_to_clinical_system(observation_data):
    """Route the FHIR Observation to the appropriate clinical system."""
    with tracer.start_as_current_span("clinical.route") as span:
        data_type = observation_data.get("category", "unknown")
        span.set_attribute("clinical.data_type", data_type)

        if data_type == "vital-signs":
            destination = "ehr-vitals-api"
        elif data_type == "laboratory":
            destination = "lis-results-api"
        else:
            destination = "clinical-data-repo"

        span.set_attribute("clinical.destination", destination)

        # Send to the clinical system and measure response time
        with tracer.start_as_current_span("clinical.api.post") as api_span:
            api_span.set_attribute("http.method", "POST")
            api_span.set_attribute("http.url", f"https://{destination}/api/Observation")

            response = requests.post(
                f"https://{destination}/api/Observation",
                json=observation_data,
                timeout=10,
            )
            api_span.set_attribute("http.status_code", response.status_code)

            # Calculate total end-to-end latency
            device_timestamp = observation_data.get("device_timestamp", 0)
            e2e_latency = time.time() - device_timestamp
            span.set_attribute("pipeline.e2e_latency_seconds", e2e_latency)
```

## Key Metrics to Track

Beyond the traces, set up metrics for the numbers that clinicians and biomedical engineers care about:

- End-to-end latency from device to clinical system (should be under 30 seconds for vitals, under 5 minutes for most lab results)
- Device data validation failure rate (spikes indicate sensor malfunctions)
- Queue depth and consumer lag (growing lag means clinical data is being delayed)
- Data completeness (are all expected device readings arriving?)

With OpenTelemetry tracing across every hop in your device data pipeline, you can pinpoint exactly where delays occur and fix them before they impact patient care.
