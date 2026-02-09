# How to Implement Event Filtering and Transformation with Knative Eventing Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Event-Driven, CloudEvents, Filtering

Description: Master Knative Eventing triggers to filter and route CloudEvents based on attributes, enabling sophisticated event-driven architectures with selective event processing.

---

Knative Eventing Triggers provide powerful mechanisms for filtering and routing events to appropriate services. Rather than sending all events to all subscribers, triggers enable selective delivery based on CloudEvents attributes. This guide shows you how to build efficient event-driven systems using intelligent filtering and transformation.

## Understanding Triggers and Brokers

Brokers act as event hubs that receive events from multiple sources and distribute them to subscribers. Triggers define subscription rules that determine which events get delivered to which services. Each trigger specifies filter criteria and a destination service.

This model decouples event producers from consumers. Producers send events to brokers without knowing about subscribers. Consumers create triggers to receive only the events they care about. New consumers can be added without modifying producers.

Triggers support filtering on any CloudEvents attribute including type, source, and custom extensions. Multiple triggers can reference the same broker, each with different filters, enabling complex routing topologies.

## Setting Up a Broker

Create an in-memory broker for development:

```yaml
# development-broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: default
```

For production, use a Kafka-backed broker for durability:

```yaml
# kafka-broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: kafka-broker
  namespace: default
  annotations:
    eventing.knative.dev/broker.class: Kafka
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: event-dlq-handler
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
  bootstrap.servers: "kafka-broker-1:9092,kafka-broker-2:9092"
  default.topic.partitions: "10"
  default.topic.replication.factor: "3"
```

Apply the broker:

```bash
kubectl apply -f kafka-broker.yaml

# Verify broker is ready
kubectl get broker kafka-broker -o yaml

# Check broker URL
kubectl get broker kafka-broker -o jsonpath='{.status.address.url}'
```

## Creating Basic Filters

Create triggers that filter events by type:

```yaml
# user-event-triggers.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: user-registration-trigger
  namespace: default
spec:
  broker: kafka-broker

  # Filter for user registration events
  filter:
    attributes:
      type: com.company.user.registered

  # Send to registration handler
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: user-registration-handler
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: user-login-trigger
  namespace: default
spec:
  broker: kafka-broker

  # Filter for login events
  filter:
    attributes:
      type: com.company.user.login

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: user-login-handler
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: user-deletion-trigger
  namespace: default
spec:
  broker: kafka-broker

  filter:
    attributes:
      type: com.company.user.deleted

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: user-deletion-handler
```

Apply the triggers:

```bash
kubectl apply -f user-event-triggers.yaml

# Verify triggers are ready
kubectl get triggers

# Check trigger details
kubectl describe trigger user-registration-trigger
```

## Advanced Filtering with Multiple Attributes

Filter on multiple CloudEvents attributes for precise routing:

```yaml
# advanced-filters.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: high-value-orders
  namespace: default
spec:
  broker: kafka-broker

  # Multiple filter criteria
  filter:
    attributes:
      type: com.company.order.created
      source: web-app
      priority: high

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: priority-order-processor
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: us-region-orders
  namespace: default
spec:
  broker: kafka-broker

  filter:
    attributes:
      type: com.company.order.created
      region: us-east-1  # Custom extension attribute

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: us-order-processor
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: mobile-app-events
  namespace: default
spec:
  broker: kafka-broker

  filter:
    attributes:
      source: mobile-app
      # Type not specified - matches all types from mobile-app

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: mobile-analytics-handler
```

## Implementing Event Transformation

Transform events before delivery using a transformer service:

```yaml
# event-transformer.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: event-enricher
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/event-enricher:latest
        env:
        - name: ENRICHMENT_API_URL
          value: "http://enrichment-service"
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: enriched-order-trigger
  namespace: default
spec:
  broker: kafka-broker

  filter:
    attributes:
      type: com.company.order.created

  # Transform events before delivery
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: event-enricher
    uri: /transform

  # Forward transformed events
  reply:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
```

Implement the transformer:

```javascript
// event-enricher/server.js
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const ENRICHMENT_API = process.env.ENRICHMENT_API_URL;

app.post('/transform', async (req, res) => {
  const event = req.body;

  console.log(`Enriching event ${event.id} of type ${event.type}`);

  try {
    // Extract order data
    const orderData = event.data;

    // Enrich with customer information
    const customerData = await axios.get(
      `${ENRICHMENT_API}/customers/${orderData.customerId}`
    );

    // Enrich with product information
    const productPromises = orderData.items.map(item =>
      axios.get(`${ENRICHMENT_API}/products/${item.productId}`)
    );
    const productResponses = await Promise.all(productPromises);

    // Create enriched event
    const enrichedEvent = {
      ...event,
      data: {
        ...orderData,
        customer: {
          name: customerData.data.name,
          tier: customerData.data.tier,
          lifetime_value: customerData.data.lifetimeValue
        },
        items: orderData.items.map((item, index) => ({
          ...item,
          productName: productResponses[index].data.name,
          category: productResponses[index].data.category,
          margin: productResponses[index].data.margin
        })),
        enriched: true,
        enrichedAt: new Date().toISOString()
      }
    };

    // Add custom extension attribute
    res.set('Ce-Enriched', 'true');

    // Return enriched event
    res.status(200).json(enrichedEvent);

  } catch (error) {
    console.error('Enrichment failed:', error.message);

    // Return original event on failure
    res.set('Ce-Enrichment-Failed', 'true');
    res.status(200).json(event);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Event enricher on ${PORT}`));
```

## Building Event Routing Topologies

Create complex routing with multiple triggers and transformers:

```yaml
# routing-topology.yaml
# Stage 1: All events enter the broker
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: audit-logger
spec:
  broker: kafka-broker
  # No filter - receives all events
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: audit-log-service
---
# Stage 2: Filter and validate
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: validation-trigger
spec:
  broker: kafka-broker
  filter:
    attributes:
      type: com.company.transaction
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: transaction-validator
  # Valid events sent to processing broker
  reply:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: validated-broker
---
# Stage 3: Process validated events
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: validated-broker
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: domestic-transaction
spec:
  broker: validated-broker
  filter:
    attributes:
      region: domestic
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: domestic-processor
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: international-transaction
spec:
  broker: validated-broker
  filter:
    attributes:
      region: international
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: international-processor
```

## Pattern Matching with Prefix Filters

Use prefix matching for hierarchical event types:

```yaml
# prefix-filtering.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: all-user-events
  namespace: default
spec:
  broker: kafka-broker

  # Match all events with type starting with "com.company.user"
  filter:
    attributes:
      type: com.company.user
      # This implicitly matches:
      # - com.company.user.registered
      # - com.company.user.updated
      # - com.company.user.deleted
      # - etc.

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: user-event-aggregator
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: all-analytics-events
spec:
  broker: kafka-broker

  filter:
    attributes:
      source: analytics-pipeline

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: analytics-processor
```

## Handling Failed Events

Configure dead letter sinks for events that fail processing:

```yaml
# dlq-configuration.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: dlq-handler
spec:
  template:
    spec:
      containers:
      - image: your-registry/dlq-handler:latest
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: payment-processing
spec:
  broker: kafka-broker

  filter:
    attributes:
      type: com.company.payment

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: payment-processor

  # Delivery configuration
  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: dlq-handler
    retry: 3
    backoffPolicy: exponential
    backoffDelay: PT5S
```

Implement the DLQ handler:

```python
# dlq-handler/app.py
from flask import Flask, request, jsonify
import logging
import json

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/', methods=['POST'])
def handle_failed_event():
    """Handle events that failed processing"""

    # Get CloudEvents headers
    event_id = request.headers.get('Ce-Id')
    event_type = request.headers.get('Ce-Type')
    event_source = request.headers.get('Ce-Source')

    # Get failure context
    attempts = request.headers.get('Ce-Knativedeliveryattempts', '0')

    event_data = request.get_json()

    logging.error(f"Event {event_id} failed after {attempts} attempts")
    logging.error(f"Type: {event_type}, Source: {event_source}")
    logging.error(f"Data: {json.dumps(event_data, indent=2)}")

    # Store failed event for analysis
    store_failed_event({
        'id': event_id,
        'type': event_type,
        'source': event_source,
        'attempts': attempts,
        'data': event_data,
        'headers': dict(request.headers)
    })

    # Notify operations team
    send_alert(f"Event processing failed: {event_type}")

    return jsonify({'status': 'logged'}), 200

def store_failed_event(event):
    """Store failed event in database"""
    # Implementation depends on your storage system
    pass

def send_alert(message):
    """Send alert to ops team"""
    # Implementation depends on your alerting system
    pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Monitoring Event Flow

Track event routing and filtering:

```bash
# Check trigger status
kubectl get triggers

# View trigger details
kubectl describe trigger user-registration-trigger

# Check broker metrics
kubectl get broker kafka-broker -o yaml

# View event flow logs
kubectl logs -n knative-eventing -l eventing.knative.dev/broker=kafka-broker

# Count events by trigger
kubectl logs -n knative-eventing -l eventing.knative.dev/broker=kafka-broker \
  | grep "Dispatching event" \
  | awk '{print $NF}' \
  | sort | uniq -c
```

Create Prometheus queries for monitoring:

```promql
# Events received by broker
rate(event_count{namespace="default",broker_name="kafka-broker"}[5m])

# Events dispatched by trigger
rate(event_dispatch_latencies_count{trigger_name="user-registration-trigger"}[5m])

# Filter match rate
(
  rate(event_dispatch_latencies_count[5m])
  /
  rate(event_count[5m])
)

# Failed event deliveries
rate(event_dispatch_latencies_count{response_code=~"5.."}[5m])
```

## Best Practices

Design clear event type hierarchies. Use reverse DNS notation like "com.company.domain.entity.action" to enable prefix matching and logical grouping.

Keep filters simple and specific. Complex filtering logic should live in services, not trigger configurations. Use triggers for routing, services for business logic.

Implement idempotent handlers. Events may be delivered multiple times due to retries. Design services to handle duplicate events gracefully.

Use dead letter sinks consistently. Configure DLQ handlers for all production triggers to capture and analyze failed events.

Monitor filter effectiveness. Track how many events match each trigger's filters. Unused triggers or overly broad filters waste resources.

Version your event types. Include version information in event types to support schema evolution. This enables gradual migrations when event formats change.

## Conclusion

Knative Eventing triggers provide a powerful declarative model for event routing and filtering. By combining brokers, triggers, and CloudEvents attributes, you can build sophisticated event-driven architectures that efficiently route events to appropriate handlers. This pattern enables scalable microservices architectures where services remain decoupled while processing only the events relevant to their domain. Proper filtering reduces load on services and improves overall system efficiency.
