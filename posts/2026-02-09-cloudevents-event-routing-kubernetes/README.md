# How to Build CloudEvents-Based Event Routing Pipelines on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CloudEvents, Event-Driven Architecture

Description: Implement standardized event routing pipelines on Kubernetes using CloudEvents specification for interoperable event-driven architectures across multiple platforms and services.

---

CloudEvents provides a standard format for describing events in a common way, enabling interoperability between different event systems. Building event routing pipelines with CloudEvents on Kubernetes creates flexible, platform-agnostic event-driven architectures. This guide shows you how to implement CloudEvents-based event routing for building robust event processing systems.

## Understanding CloudEvents

CloudEvents defines required attributes like id, source, specversion, and type, plus optional attributes like datacontenttype and subject. This standardization means events from different systems use the same format, simplifying integration. CloudEvents works with multiple protocols including HTTP, AMQP, MQTT, and Kafka.

The specification separates event metadata from payload data, enabling routing decisions based on metadata without parsing payloads. This improves performance and enables generic routing infrastructure.

## Setting Up the Event Router

Deploy an event router using Knative Eventing:

```bash
# Install Knative Eventing (includes CloudEvents support)
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.12.0/eventing-crds.yaml
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.12.0/eventing-core.yaml

# Install Kafka support for durable event streams
kubectl apply -f https://github.com/knative-sandbox/eventing-kafka-broker/releases/download/knative-v1.12.0/eventing-kafka-controller.yaml
kubectl apply -f https://github.com/knative-sandbox/eventing-kafka-broker/releases/download/knative-v1.12.0/eventing-kafka-broker.yaml
```

Create a Kafka broker for event routing:

```yaml
# kafka-broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: kafka-broker
  namespace: events
  annotations:
    eventing.knative.dev/broker.class: Kafka
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-broker-config
  namespace: knative-eventing
data:
  bootstrap.servers: "kafka-cluster:9092"
  default.topic.partitions: "10"
  default.topic.replication.factor: "3"
```

## Creating Event Producers

Build a service that produces CloudEvents:

```python
# event_producer/app.py
from flask import Flask, request, jsonify
from cloudevents.http import CloudEvent, to_structured
import requests
import uuid
from datetime import datetime

app = Flask(__name__)

BROKER_URL = "http://kafka-broker-ingress.knative-eventing.svc.cluster.local/events/kafka-broker"

@app.route("/orders", methods=["POST"])
def create_order():
    """Create order and emit CloudEvent"""
    order_data = request.json

    # Create CloudEvent
    attributes = {
        "type": "com.company.orders.created",
        "source": "orders-service",
        "specversion": "1.0",
        "id": str(uuid.uuid4()),
        "time": datetime.utcnow().isoformat() + "Z",
        "datacontenttype": "application/json",
        "subject": f"orders/{order_data['order_id']}"
    }

    event = CloudEvent(attributes, order_data)

    # Send to broker
    headers, body = to_structured(event)
    response = requests.post(BROKER_URL, headers=headers, data=body)

    if response.status_code == 202:
        return jsonify({"status": "created", "order_id": order_data['order_id']}), 201
    else:
        return jsonify({"status": "error"}), 500

@app.route("/payments", methods=["POST"])
def process_payment():
    """Process payment and emit CloudEvent"""
    payment_data = request.json

    attributes = {
        "type": "com.company.payments.processed",
        "source": "payments-service",
        "specversion": "1.0",
        "id": str(uuid.uuid4()),
        "time": datetime.utcnow().isoformat() + "Z",
        "datacontenttype": "application/json",
        "subject": f"payments/{payment_data['payment_id']}",
        # Custom extension attributes
        "orderid": payment_data.get('order_id'),
        "amount": str(payment_data.get('amount'))
    }

    event = CloudEvent(attributes, payment_data)
    headers, body = to_structured(event)
    requests.post(BROKER_URL, headers=headers, data=body)

    return jsonify({"status": "processed"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Build and deploy:

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install flask cloudevents requests

COPY app.py .

CMD ["python", "app.py"]
```

```yaml
# producer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-producer
  namespace: events
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-producer
  template:
    metadata:
      labels:
        app: event-producer
    spec:
      containers:
      - name: producer
        image: your-registry/event-producer:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: event-producer
  namespace: events
spec:
  selector:
    app: event-producer
  ports:
  - port: 80
    targetPort: 8080
```

## Creating Event Consumers

Build consumers that receive CloudEvents:

```python
# order_processor/app.py
from flask import Flask, request
from cloudevents.http import from_http
import json

app = Flask(__name__)

@app.route("/", methods=["POST"])
def handle_event():
    """Handle CloudEvent"""
    # Parse CloudEvent
    event = from_http(request.headers, request.get_data())

    print(f"Received event:")
    print(f"  ID: {event['id']}")
    print(f"  Type: {event['type']}")
    print(f"  Source: {event['source']}")
    print(f"  Subject: {event.get('subject', 'N/A')}")
    print(f"  Time: {event['time']}")

    # Get event data
    data = event.data

    # Process based on event type
    if event['type'] == "com.company.orders.created":
        process_order(data)
    elif event['type'] == "com.company.payments.processed":
        update_order_status(data)

    return "", 200

def process_order(order_data):
    """Process new order"""
    order_id = order_data.get('order_id')
    print(f"Processing order: {order_id}")

    # Validate inventory
    # Calculate totals
    # Reserve items
    # Send to fulfillment

def update_order_status(payment_data):
    """Update order after payment"""
    order_id = payment_data.get('order_id')
    print(f"Updating order status: {order_id}")

    # Update database
    # Send confirmation email
    # Notify warehouse

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Deploy consumer:

```yaml
# consumer-deployment.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-processor
  namespace: events
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/min-scale: "1"
        autoscaling.knative.dev/max-scale: "10"
    spec:
      containers:
      - image: your-registry/order-processor:latest
        ports:
        - containerPort: 8080
```

## Configuring Event Routing

Create triggers to route events to consumers:

```yaml
# event-triggers.yaml
# Route order events
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-events
  namespace: events
spec:
  broker: kafka-broker
  filter:
    attributes:
      type: com.company.orders.created
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
---
# Route payment events
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: payment-events
  namespace: events
spec:
  broker: kafka-broker
  filter:
    attributes:
      type: com.company.payments.processed
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
---
# Route high-value orders to special processor
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: high-value-orders
  namespace: events
spec:
  broker: kafka-broker
  filter:
    attributes:
      type: com.company.orders.created
      # Note: Advanced filtering requires custom implementation
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: premium-order-processor
```

## Implementing Event Transformation

Transform events between different formats:

```python
# event_transformer/app.py
from flask import Flask, request
from cloudevents.http import CloudEvent, to_structured, from_http
import requests
import uuid

app = Flask(__name__)

BROKER_URL = "http://kafka-broker-ingress.knative-eventing.svc.cluster.local/events/kafka-broker"

@app.route("/", methods=["POST"])
def transform_event():
    """Transform incoming event"""
    # Parse incoming CloudEvent
    event = from_http(request.headers, request.get_data())

    # Transform based on source
    if event['source'] == "legacy-system":
        transformed_event = transform_legacy_event(event)
    else:
        transformed_event = event

    # Emit transformed event
    headers, body = to_structured(transformed_event)
    requests.post(BROKER_URL, headers=headers, data=body)

    return "", 200

def transform_legacy_event(event):
    """Transform legacy event format to new format"""
    old_data = event.data

    # Map old fields to new schema
    new_data = {
        "order_id": old_data.get("orderId"),
        "customer_id": old_data.get("customerId"),
        "items": [
            {
                "product_id": item.get("productId"),
                "quantity": item.get("qty"),
                "price": item.get("unitPrice")
            }
            for item in old_data.get("orderItems", [])
        ],
        "total": old_data.get("orderTotal")
    }

    # Create new CloudEvent
    attributes = {
        "type": "com.company.orders.created.v2",
        "source": "event-transformer",
        "specversion": "1.0",
        "id": str(uuid.uuid4()),
        "datacontenttype": "application/json",
        "subject": f"orders/{new_data['order_id']}"
    }

    return CloudEvent(attributes, new_data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Building Event Sequences

Chain multiple processing steps:

```yaml
# event-sequence.yaml
apiVersion: flows.knative.dev/v1
kind: Sequence
metadata:
  name: order-processing-sequence
  namespace: events
spec:
  channelTemplate:
    apiVersion: messaging.knative.dev/v1
    kind: InMemoryChannel

  steps:
  # Step 1: Validate order
  - ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-validator

  # Step 2: Check inventory
  - ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: inventory-checker

  # Step 3: Calculate pricing
  - ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: pricing-calculator

  # Step 4: Reserve items
  - ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: inventory-reserver

  reply:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-finalizer
---
# Trigger to start sequence
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: process-orders
  namespace: events
spec:
  broker: kafka-broker
  filter:
    attributes:
      type: com.company.orders.created
  subscriber:
    ref:
      apiVersion: flows.knative.dev/v1
      kind: Sequence
      name: order-processing-sequence
```

## Implementing Event Filtering

Create a custom event filter:

```python
# event_filter/app.py
from flask import Flask, request
from cloudevents.http import from_http, to_structured
import requests

app = Flask(__name__)

NEXT_HOP_URL = "http://order-processor.events.svc.cluster.local"

@app.route("/", methods=["POST"])
def filter_event():
    """Filter events based on custom logic"""
    event = from_http(request.headers, request.get_data())
    data = event.data

    # Apply filtering logic
    if should_process_event(event, data):
        # Forward to next step
        headers, body = to_structured(event)
        requests.post(NEXT_HOP_URL, headers=headers, data=body)
        return "", 200
    else:
        # Discard event
        return "", 200

def should_process_event(event, data):
    """Custom filtering logic"""
    # Filter by event attributes
    if event['type'] not in ["com.company.orders.created", "com.company.orders.updated"]:
        return False

    # Filter by data content
    if data.get('amount', 0) < 100:
        return False

    # Filter by custom extension
    if event.get('priority') != 'high':
        return False

    return True

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Monitoring Event Flow

Track events through the pipeline:

```python
# event_monitor/app.py
from flask import Flask, request
from cloudevents.http import from_http
from prometheus_client import Counter, Histogram, start_http_server
import time

app = Flask(__name__)

# Metrics
events_received = Counter('cloudevents_received_total', 'Total CloudEvents received', ['type', 'source'])
events_processed = Counter('cloudevents_processed_total', 'Total CloudEvents processed', ['type', 'status'])
processing_duration = Histogram('cloudevents_processing_duration_seconds', 'Processing duration', ['type'])

@app.route("/", methods=["POST"])
def monitor_event():
    """Monitor CloudEvent"""
    event = from_http(request.headers, request.get_data())

    # Record metrics
    events_received.labels(type=event['type'], source=event['source']).inc()

    start_time = time.time()
    try:
        # Process event
        process_event(event)
        events_processed.labels(type=event['type'], status='success').inc()
    except Exception as e:
        events_processed.labels(type=event['type'], status='error').inc()
        raise
    finally:
        duration = time.time() - start_time
        processing_duration.labels(type=event['type']).observe(duration)

    return "", 200

def process_event(event):
    """Process event"""
    print(f"Processing {event['type']} from {event['source']}")

if __name__ == "__main__":
    start_http_server(8000)  # Prometheus metrics on port 8000
    app.run(host="0.0.0.0", port=8080)
```

## Best Practices

Follow these guidelines:

1. **Use CloudEvents specification** - Ensures interoperability
2. **Include meaningful attributes** - Aid routing and filtering
3. **Version event types** - Enable schema evolution
4. **Log event traces** - Track events through pipeline
5. **Implement idempotent consumers** - Handle duplicate events
6. **Monitor event lag** - Detect processing delays
7. **Use dead letter queues** - Capture failed events
8. **Document event schemas** - Help developers understand events
9. **Test event ordering** - Handle out-of-order delivery

## Conclusion

CloudEvents provides a standard foundation for building event routing pipelines on Kubernetes. By using the CloudEvents specification, you create interoperable event systems that work across different platforms and protocols. Implement proper routing with triggers, transform events between formats when needed, and monitor event flow through your pipelines. This standardized approach simplifies integration, enables flexible routing logic, and creates maintainable event-driven architectures that scale with your application needs.
