# How to Implement Knative Eventing Broker and Trigger Patterns for Event Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Knative, Event-Driven Architecture

Description: Implement event-driven architectures on Kubernetes using Knative Eventing brokers and triggers for flexible event routing, filtering, and processing patterns.

---

Knative Eventing provides event-driven capabilities for Kubernetes applications through brokers and triggers. Brokers receive events from multiple sources and route them to subscribers based on trigger rules. This decouples event producers from consumers, enabling flexible event-driven architectures. This guide shows you how to implement broker and trigger patterns for building event-driven systems.

## Understanding Broker and Trigger Architecture

Brokers act as event mesh, receiving events from sources and routing them to interested consumers. Triggers define subscription rules that filter events based on attributes like event type or source. This pub-sub model lets producers send events without knowing about consumers, and consumers subscribe to specific event types without knowing about producers.

Events follow the CloudEvents specification, providing a standard format for event data. This standardization enables interoperability between different systems and cloud providers.

## Installing Knative Eventing

Install Knative Eventing components:

```bash
# Install Eventing CRDs
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.12.0/eventing-crds.yaml

# Install Eventing core
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.12.0/eventing-core.yaml

# Install In-Memory Channel (for development)
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.12.0/in-memory-channel.yaml

# Install MT (Multi-Tenant) Channel Broker
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.12.0/mt-channel-broker.yaml

# Verify installation
kubectl get pods -n knative-eventing
```

## Creating a Broker

Create a broker to receive and route events:

```yaml
# broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: default
  annotations:
    eventing.knative.dev/broker.class: MTChannelBasedBroker
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: config-br-default-channel
    namespace: knative-eventing
```

Apply the broker:

```bash
kubectl apply -f broker.yaml

# Check broker status
kubectl get broker default

# Get broker URL
kubectl get broker default -o jsonpath='{.status.address.url}'
```

## Creating Event Consumers

Deploy services that consume events:

```yaml
# event-logger.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: event-logger
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: gcr.io/knative-releases/knative.dev/eventing/cmd/event_display
        ports:
        - containerPort: 8080
---
# order-processor.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-processor
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/order-processor:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
---
# notification-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: notification-service
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/notification-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: SMTP_HOST
          valueFrom:
            configMapKeyRef:
              name: email-config
              key: smtp-host
```

Deploy the services:

```bash
kubectl apply -f event-logger.yaml
kubectl apply -f order-processor.yaml
kubectl apply -f notification-service.yaml
```

## Creating Triggers

Define triggers to route events to consumers:

```yaml
# triggers.yaml
# Log all events
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: log-all-events
  namespace: default
spec:
  broker: default
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: event-logger
---
# Process order created events
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created-trigger
  namespace: default
spec:
  broker: default
  filter:
    attributes:
      type: com.example.order.created
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
---
# Send notifications for high-value orders
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: high-value-order-notification
  namespace: default
spec:
  broker: default
  filter:
    attributes:
      type: com.example.order.created
      source: /orders/api
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: notification-service
```

Apply the triggers:

```bash
kubectl apply -f triggers.yaml

# Check trigger status
kubectl get triggers
```

## Sending Events to the Broker

Create an event source to send events:

```yaml
# event-producer.yaml
apiVersion: v1
kind: Pod
metadata:
  name: event-producer
  namespace: default
spec:
  containers:
  - name: producer
    image: curlimages/curl:latest
    command:
    - sh
    - -c
    - |
      # Get broker URL
      BROKER_URL="http://broker-ingress.knative-eventing.svc.cluster.local/default/default"

      # Send order created event
      curl -v "${BROKER_URL}" \
        -H "Ce-Id: 12345" \
        -H "Ce-Specversion: 1.0" \
        -H "Ce-Type: com.example.order.created" \
        -H "Ce-Source: /orders/api" \
        -H "Content-Type: application/json" \
        -d '{
          "orderId": "ORD-12345",
          "customerId": "CUST-789",
          "amount": 1599.99,
          "items": [
            {"product": "Laptop", "quantity": 1, "price": 1599.99}
          ]
        }'

      sleep 10

      # Send another event
      curl -v "${BROKER_URL}" \
        -H "Ce-Id: 12346" \
        -H "Ce-Specversion: 1.0" \
        -H "Ce-Type: com.example.order.shipped" \
        -H "Ce-Source: /shipping/api" \
        -H "Content-Type: application/json" \
        -d '{
          "orderId": "ORD-12345",
          "trackingNumber": "1Z999AA10123456784",
          "carrier": "UPS"
        }'
```

## Implementing Event Filters

Use filters to route events based on attributes:

```yaml
# filtered-triggers.yaml
# Process only high-value orders
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: high-value-orders
  namespace: default
spec:
  broker: default
  filter:
    attributes:
      type: com.example.order.created
    # Note: Advanced filtering requires custom implementation
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: high-value-processor
---
# Route by source
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: api-events
  namespace: default
spec:
  broker: default
  filter:
    attributes:
      source: /orders/api
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: api-event-handler
```

## Creating Custom Event Sources

Integrate external systems as event sources:

```yaml
# kafka-source.yaml
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: kafka-orders
  namespace: default
spec:
  bootstrapServers:
  - kafka-broker:9092
  topics:
  - orders
  - payments
  consumerGroup: knative-consumer
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: default
---
# cron-source.yaml
apiVersion: sources.knative.dev/v1
kind: PingSource
metadata:
  name: hourly-check
  namespace: default
spec:
  schedule: "0 * * * *"
  data: '{"message": "Hourly health check"}'
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: default
```

## Building a Complete Event-Driven Application

Create an order processing workflow:

```python
# order_processor/app.py
from flask import Flask, request, jsonify
import json
import os
import requests

app = Flask(__name__)
BROKER_URL = os.getenv("BROKER_URL")

@app.route("/", methods=["POST"])
def process_order():
    # Parse CloudEvent
    cloud_event = request.headers
    event_data = request.json

    print(f"Received event type: {cloud_event.get('Ce-Type')}")
    print(f"Event data: {json.dumps(event_data, indent=2)}")

    # Process order
    order_id = event_data.get("orderId")
    amount = event_data.get("amount")

    # Validate order
    if amount > 0:
        # Emit order validated event
        emit_event({
            "type": "com.example.order.validated",
            "source": "/order-processor",
            "data": {
                "orderId": order_id,
                "status": "validated",
                "amount": amount
            }
        })

        return jsonify({"status": "processed"}), 200
    else:
        # Emit order rejected event
        emit_event({
            "type": "com.example.order.rejected",
            "source": "/order-processor",
            "data": {
                "orderId": order_id,
                "reason": "Invalid amount"
            }
        })

        return jsonify({"status": "rejected"}), 200

def emit_event(event_data):
    """Emit event back to broker"""
    headers = {
        "Ce-Id": str(uuid.uuid4()),
        "Ce-Specversion": "1.0",
        "Ce-Type": event_data["type"],
        "Ce-Source": event_data["source"],
        "Content-Type": "application/json"
    }

    response = requests.post(
        BROKER_URL,
        headers=headers,
        json=event_data["data"]
    )

    print(f"Emitted event: {response.status_code}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Deploy the application:

```yaml
# order-workflow.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-processor
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/order-processor:latest
        ports:
        - containerPort: 8080
        env:
        - name: BROKER_URL
          value: "http://broker-ingress.knative-eventing.svc.cluster.local/default/default"
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: process-orders
  namespace: default
spec:
  broker: default
  filter:
    attributes:
      type: com.example.order.created
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
```

## Implementing Dead Letter Queues

Handle failed event deliveries:

```yaml
# broker-with-dlq.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: default
spec:
  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: dead-letter-handler
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
---
# dead-letter-handler.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: dead-letter-handler
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: gcr.io/knative-releases/knative.dev/eventing/cmd/event_display
```

## Monitoring Event Flow

Track event processing:

```yaml
# event-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-monitoring
  namespace: default
data:
  monitor.py: |
    import time
    from prometheus_client import start_http_server, Counter, Histogram

    # Metrics
    events_received = Counter('events_received_total', 'Total events received', ['type'])
    events_processed = Counter('events_processed_total', 'Total events processed', ['type', 'status'])
    processing_duration = Histogram('event_processing_duration_seconds', 'Event processing duration', ['type'])

    # Your event processing logic here
    def process_event(event):
        event_type = event.get('type')
        events_received.labels(type=event_type).inc()

        start_time = time.time()
        try:
            # Process event
            result = handle_event(event)
            events_processed.labels(type=event_type, status='success').inc()
        except Exception as e:
            events_processed.labels(type=event_type, status='error').inc()
            raise
        finally:
            duration = time.time() - start_time
            processing_duration.labels(type=event_type).observe(duration)

    if __name__ == '__main__':
        start_http_server(8000)
```

## Best Practices

Follow these guidelines:

1. **Use CloudEvents format** - Ensures interoperability
2. **Design idempotent handlers** - Handle duplicate events
3. **Implement dead letter queues** - Capture failed events
4. **Filter at trigger level** - Reduce unnecessary invocations
5. **Monitor event lag** - Track processing delays
6. **Use appropriate retry policies** - Balance reliability and cost
7. **Version event schemas** - Enable backward compatibility
8. **Log event traces** - Debug event flows

## Conclusion

Knative Eventing brokers and triggers provide powerful patterns for building event-driven architectures on Kubernetes. By decoupling producers from consumers through brokers, implementing flexible routing with triggers, and handling failures with dead letter queues, you create resilient event-driven systems. Use CloudEvents for standardization, monitor event processing metrics, and design idempotent handlers to handle the eventual consistency of distributed systems. This approach enables scalable, loosely coupled microservices that react to events in real-time.
