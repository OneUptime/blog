# How to Trace CloudEvents Flowing Through Kafka, HTTP, and MQTT Brokers with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CloudEvents, Kafka, MQTT

Description: Trace CloudEvents across multiple transport protocols including Kafka, HTTP, and MQTT with consistent OpenTelemetry context propagation.

CloudEvents can travel over different transport bindings. The same event might start as an HTTP webhook, get published to Kafka for processing, and then forwarded via MQTT to an IoT device. Tracing this multi-protocol journey requires careful attention to how each transport carries trace context.

## The Challenge

Each protocol has its own mechanism for metadata:
- HTTP uses headers
- Kafka uses record headers
- MQTT uses user properties (v5) or a custom payload envelope

The trace context needs to survive all of these transitions.

## HTTP Transport: Trace Context in Headers

When CloudEvents travel over HTTP, trace context naturally fits in HTTP headers:

```python
import requests
from opentelemetry import trace, context
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
from cloudevents.http import CloudEvent, to_structured

tracer = trace.get_tracer("cloudevents.http")
propagator = TraceContextTextMapPropagator()

def send_cloud_event_http(event_data, target_url):
    """Send a CloudEvent over HTTP with trace context."""
    with tracer.start_as_current_span(
        "cloudevent.http.send",
        kind=trace.SpanKind.PRODUCER,
    ) as span:
        event = CloudEvent({
            "type": "com.example.sensor.reading",
            "source": "/sensors/temperature",
        }, event_data)

        headers, body = to_structured(event)

        # Inject trace context into HTTP headers
        propagator.inject(headers)

        span.set_attribute("cloudevents.type", "com.example.sensor.reading")
        span.set_attribute("messaging.system", "http")
        span.set_attribute("messaging.destination", target_url)

        response = requests.post(target_url, headers=headers, data=body)
        span.set_attribute("http.status_code", response.status_code)
```

## Kafka Transport: Trace Context in Record Headers

When forwarding CloudEvents to Kafka, put the trace context in Kafka record headers:

```python
from confluent_kafka import Producer
import json

tracer_kafka = trace.get_tracer("cloudevents.kafka")

def send_cloud_event_kafka(event_data, topic):
    """Publish a CloudEvent to Kafka with trace context in record headers."""
    with tracer_kafka.start_as_current_span(
        "cloudevent.kafka.produce",
        kind=trace.SpanKind.PRODUCER,
        attributes={
            "messaging.system": "kafka",
            "messaging.destination": topic,
            "messaging.operation": "publish",
        }
    ) as span:
        # Build the CloudEvent payload
        cloud_event = {
            "specversion": "1.0",
            "type": "com.example.sensor.reading",
            "source": "/sensors/temperature",
            "id": str(uuid.uuid4()),
            "data": event_data,
        }

        # Extract trace context into Kafka headers
        kafka_headers = {}
        propagator.inject(kafka_headers)

        # Convert to the format Kafka expects (list of tuples)
        header_list = [(k, v.encode("utf-8")) for k, v in kafka_headers.items()]

        producer = Producer({"bootstrap.servers": "localhost:9092"})
        producer.produce(
            topic=topic,
            value=json.dumps(cloud_event).encode("utf-8"),
            headers=header_list,
        )
        producer.flush()

        span.set_attribute("messaging.kafka.topic", topic)
        span.set_attribute("cloudevents.id", cloud_event["id"])
```

## Consuming from Kafka and Restoring Context

```python
from confluent_kafka import Consumer

consumer_tracer = trace.get_tracer("cloudevents.kafka.consumer")

def consume_cloud_events_kafka(topic):
    """Consume CloudEvents from Kafka and restore trace context."""
    consumer = Consumer({
        "bootstrap.servers": "localhost:9092",
        "group.id": "cloudevent-processor",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe([topic])

    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            continue

        # Extract trace context from Kafka headers
        carrier = {}
        if msg.headers():
            for key, value in msg.headers():
                if key in ("traceparent", "tracestate"):
                    carrier[key] = value.decode("utf-8")

        parent_ctx = propagator.extract(carrier)

        with consumer_tracer.start_as_current_span(
            "cloudevent.kafka.consume",
            context=parent_ctx,
            kind=trace.SpanKind.CONSUMER,
            attributes={
                "messaging.system": "kafka",
                "messaging.destination": topic,
                "messaging.operation": "receive",
                "messaging.kafka.partition": msg.partition(),
                "messaging.kafka.offset": msg.offset(),
            }
        ) as span:
            event = json.loads(msg.value())
            span.set_attribute("cloudevents.type", event.get("type", ""))
            span.set_attribute("cloudevents.id", event.get("id", ""))

            # Process the event and potentially forward to MQTT
            forward_to_mqtt(event)
```

## MQTT Transport: Trace Context in User Properties

MQTT v5 supports user properties, which work well for carrying trace context:

```python
import paho.mqtt.client as mqtt

mqtt_tracer = trace.get_tracer("cloudevents.mqtt")

def forward_to_mqtt(cloud_event):
    """Forward a CloudEvent to MQTT with trace context in user properties."""
    with mqtt_tracer.start_as_current_span(
        "cloudevent.mqtt.publish",
        kind=trace.SpanKind.PRODUCER,
        attributes={
            "messaging.system": "mqtt",
            "messaging.destination": "sensors/readings",
            "messaging.operation": "publish",
        }
    ) as span:
        # Extract trace context
        carrier = {}
        propagator.inject(carrier)

        # Build MQTT v5 properties with trace context
        properties = mqtt.Properties(mqtt.PacketTypes.PUBLISH)
        for key, value in carrier.items():
            properties.UserProperty = (key, value)

        client = mqtt.Client(
            client_id="event-forwarder",
            protocol=mqtt.MQTTv5
        )
        client.connect("localhost", 1883)

        payload = json.dumps(cloud_event)
        client.publish(
            "sensors/readings",
            payload=payload,
            qos=1,
            properties=properties
        )

        span.set_attribute("cloudevents.id", cloud_event.get("id", ""))
        span.set_attribute("messaging.mqtt.qos", 1)
        client.disconnect()

def on_mqtt_message(client, userdata, msg):
    """Handle incoming MQTT CloudEvent with trace context."""
    # Extract trace context from MQTT v5 user properties
    carrier = {}
    if hasattr(msg.properties, "UserProperty") and msg.properties.UserProperty:
        for key, value in msg.properties.UserProperty:
            carrier[key] = value

    parent_ctx = propagator.extract(carrier)

    with mqtt_tracer.start_as_current_span(
        "cloudevent.mqtt.receive",
        context=parent_ctx,
        kind=trace.SpanKind.CONSUMER,
        attributes={
            "messaging.system": "mqtt",
            "messaging.destination": msg.topic,
            "messaging.mqtt.qos": msg.qos,
        }
    ):
        event = json.loads(msg.payload)
        process_sensor_reading(event["data"])
```

## The Full Picture

With these patterns, a single CloudEvent can flow from an HTTP webhook, through Kafka, and out to MQTT devices, all within the same distributed trace. The trace ID stays consistent at every hop because each transport injects and extracts the W3C Trace Context using the same propagator. Your tracing backend will show the complete journey of each event, regardless of which protocols it crosses.
