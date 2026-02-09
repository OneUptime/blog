# How to Build Event-Driven Microservices with Dapr Pub/Sub on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Event-Driven, Pub-Sub, Microservices

Description: Build loosely coupled event-driven microservices using Dapr's publish-subscribe API with support for multiple message brokers and cloud-agnostic patterns on Kubernetes.

---

Dapr (Distributed Application Runtime) provides a unified API for building event-driven microservices across any infrastructure. Its publish-subscribe building block abstracts message broker specifics, letting you switch between Redis, Kafka, RabbitMQ, or cloud-native services without code changes. This guide shows you how to build event-driven systems with Dapr on Kubernetes.

## Understanding Dapr Pub/Sub Architecture

Dapr implements pub/sub through components that wrap existing message brokers. Publishers send messages to topics without knowing about subscribers. Subscribers express interest in topics and receive matching messages. Dapr handles the complexity of connecting to brokers, managing subscriptions, and delivering messages.

Each Dapr-enabled pod includes a sidecar that provides the pub/sub API. Your application makes HTTP or gRPC calls to localhost to publish messages or handle subscriptions. The sidecar communicates with the message broker on your behalf.

This architecture provides several benefits. You can develop locally with one broker and deploy to production with another. You get automatic retries, dead letter queues, and message routing. Your application code remains simple and focused on business logic.

## Installing Dapr on Kubernetes

Install Dapr using the CLI:

```bash
# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Verify installation
dapr --version

# Initialize Dapr on Kubernetes
dapr init --kubernetes --wait

# Verify Dapr installation
kubectl get pods -n dapr-system
```

Or install using Helm:

```bash
# Add Dapr Helm repository
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Install Dapr
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --wait

# Check status
kubectl get pods -n dapr-system
```

## Configuring Message Broker Components

Configure Redis as your pub/sub broker:

```yaml
# redis-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.default.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "false"
scopes:
  - order-service
  - payment-service
  - notification-service
```

For production, use Kafka:

```yaml
# kafka-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092"
  - name: authType
    value: "password"
  - name: saslUsername
    secretKeyRef:
      name: kafka-credentials
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-credentials
      key: password
  - name: maxMessageBytes
    value: "1024000"
  - name: consumerGroup
    value: "dapr-consumer-group"
scopes:
  - order-service
  - payment-service
```

Apply the component:

```bash
kubectl apply -f kafka-pubsub.yaml

# Verify component
kubectl get components
```

## Building a Publisher Service

Create a service that publishes order events:

```javascript
// order-service/server.js
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || 3500;
const PUBSUB_NAME = 'pubsub';

app.post('/orders', async (req, res) => {
  try {
    const order = {
      id: generateOrderId(),
      customerId: req.body.customerId,
      items: req.body.items,
      total: calculateTotal(req.body.items),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save order to database
    await saveOrder(order);

    // Publish order created event
    await publishEvent('orders', 'order.created', order);

    console.log(`Order ${order.id} created and event published`);

    res.status(201).json({
      orderId: order.id,
      status: 'created'
    });

  } catch (error) {
    console.error('Order creation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Update order status
    await updateOrderStatus(id, status);

    // Publish status change event
    await publishEvent('orders', 'order.status.changed', {
      orderId: id,
      newStatus: status,
      changedAt: new Date().toISOString()
    });

    res.json({ orderId: id, status });

  } catch (error) {
    console.error('Status update failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

async function publishEvent(topic, eventType, data) {
  const pubsubUrl = `http://localhost:${DAPR_HTTP_PORT}/v1.0/publish/${PUBSUB_NAME}/${topic}`;

  const event = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(pubsubUrl, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Published ${eventType} to topic ${topic}`);
  } catch (error) {
    console.error(`Failed to publish event: ${error.message}`);
    throw error;
  }
}

function generateOrderId() {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

async function saveOrder(order) {
  // Database implementation
  console.log('Saving order:', order.id);
}

async function updateOrderStatus(orderId, status) {
  // Database implementation
  console.log(`Updating order ${orderId} status to ${status}`);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
```

Deploy with Dapr annotations:

```yaml
# order-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
    spec:
      containers:
      - name: order-service
        image: your-registry/order-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 8080
```

## Building Subscriber Services

Create a payment service that subscribes to order events:

```python
# payment-service/app.py
from flask import Flask, request, jsonify
import logging
import requests
import json

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

DAPR_HTTP_PORT = 3500

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    """Tell Dapr which topics to subscribe to"""
    subscriptions = [
        {
            'pubsubname': 'pubsub',
            'topic': 'orders',
            'route': '/orders'
        }
    ]
    return jsonify(subscriptions)

@app.route('/orders', methods=['POST'])
def handle_order_event():
    """Handle order events"""
    try:
        event = request.json

        event_type = event.get('type')
        data = event.get('data')

        logging.info(f"Received event: {event_type}")

        if event_type == 'order.created':
            process_payment(data)
        elif event_type == 'order.status.changed':
            handle_status_change(data)

        return jsonify({'status': 'SUCCESS'}), 200

    except Exception as e:
        logging.error(f"Event processing failed: {str(e)}")
        # Return 200 to acknowledge receipt
        # Dapr will retry based on component configuration
        return jsonify({'status': 'RETRY'}), 200

def process_payment(order):
    """Process payment for order"""
    order_id = order['id']
    total = order['total']

    logging.info(f"Processing payment for order {order_id}: ${total}")

    try:
        # Payment processing logic
        payment_result = charge_payment(order['customerId'], total)

        if payment_result['success']:
            # Publish payment success event
            publish_event('payments', 'payment.completed', {
                'orderId': order_id,
                'paymentId': payment_result['paymentId'],
                'amount': total
            })

            # Update order status
            update_order_status(order_id, 'paid')
        else:
            # Publish payment failure event
            publish_event('payments', 'payment.failed', {
                'orderId': order_id,
                'reason': payment_result['error']
            })

            update_order_status(order_id, 'payment_failed')

    except Exception as e:
        logging.error(f"Payment processing error: {str(e)}")
        raise

def charge_payment(customer_id, amount):
    """Simulate payment processing"""
    # Payment gateway integration
    return {
        'success': True,
        'paymentId': f'PAY-{customer_id}-{amount}'
    }

def publish_event(topic, event_type, data):
    """Publish event via Dapr"""
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{topic}"

    event = {
        'type': event_type,
        'data': data
    }

    try:
        response = requests.post(url, json=event)
        response.raise_for_status()
        logging.info(f"Published {event_type} to {topic}")
    except Exception as e:
        logging.error(f"Failed to publish event: {str(e)}")
        raise

def update_order_status(order_id, status):
    """Update order status via order service"""
    url = f"http://order-service.default.svc.cluster.local/orders/{order_id}/status"

    try:
        response = requests.put(url, json={'status': status})
        response.raise_for_status()
    except Exception as e:
        logging.error(f"Failed to update order status: {str(e)}")

def handle_status_change(data):
    """Handle order status changes"""
    logging.info(f"Order {data['orderId']} status changed to {data['newStatus']}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy the payment service:

```yaml
# payment-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
    spec:
      containers:
      - name: payment-service
        image: your-registry/payment-service:latest
        ports:
        - containerPort: 8080
```

## Implementing Message Routing and Filtering

Create subscriptions with routing rules:

```yaml
# subscription-routing.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    # Route order.created events to one endpoint
    rules:
      - match: event.type == "order.created"
        path: /orders/created
      # Route order.paid events to another
      - match: event.type == "order.paid"
        path: /orders/paid
      # Default route for other events
      - match: true
        path: /orders/default
  scopes:
    - payment-service
```

Implement bulk subscriptions:

```yaml
# bulk-subscription.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: analytics-subscription
spec:
  pubsubname: pubsub
  topic: orders
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
  routes:
    default: /analytics/bulk-orders
  scopes:
    - analytics-service
```

Handler for bulk messages:

```go
// analytics-service/main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type BulkMessage struct {
    Entries []struct {
        EntryId     string          `json:"entryId"`
        Event       json.RawMessage `json:"event"`
        ContentType string          `json:"contentType"`
    } `json:"entries"`
}

func bulkOrdersHandler(w http.ResponseWriter, r *http.Request) {
    var bulk BulkMessage
    if err := json.NewDecoder(r.Body).Decode(&bulk); err != nil {
        log.Printf("Failed to decode bulk message: %v", err)
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    log.Printf("Received %d messages", len(bulk.Entries))

    // Process messages in batch
    results := make([]map[string]interface{}, len(bulk.Entries))

    for i, entry := range bulk.Entries {
        // Process individual message
        success := processMessage(entry.Event)

        results[i] = map[string]interface{}{
            "entryId": entry.EntryId,
            "status":  getStatus(success),
        }
    }

    // Return bulk response
    response := map[string]interface{}{
        "statuses": results,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func processMessage(data json.RawMessage) bool {
    // Your processing logic
    return true
}

func getStatus(success bool) string {
    if success {
        return "SUCCESS"
    }
    return "RETRY"
}

func main() {
    http.HandleFunc("/analytics/bulk-orders", bulkOrdersHandler)
    log.Println("Analytics service listening on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Monitoring and Observability

Track pub/sub metrics:

```bash
# View Dapr metrics
kubectl port-forward -n dapr-system svc/dapr-dashboard 8080:8080

# Access dashboard
open http://localhost:8080

# View component status
kubectl get components

# Check subscription status
kubectl get subscriptions
```

Create Prometheus queries:

```promql
# Message publish rate
rate(dapr_component_pubsub_egress_count[5m])

# Message processing rate
rate(dapr_component_pubsub_ingress_count[5m])

# Failed deliveries
rate(dapr_component_pubsub_ingress_error_count[5m])

# Processing latency
histogram_quantile(0.95,
  rate(dapr_http_server_request_duration_bucket[5m])
)
```

## Best Practices

Use CloudEvents format for messages. Dapr wraps messages in CloudEvents by default, providing consistent metadata across all events.

Implement idempotent handlers. Messages may be delivered multiple times. Design handlers to produce the same result when processing duplicate messages.

Configure appropriate retry policies. Use exponential backoff for transient errors. Set maximum retry counts to prevent infinite loops.

Monitor subscription health. Track message processing rates and error rates. Set up alerts for stuck subscriptions or high error rates.

Use scopes to control access. Limit which services can access specific pub/sub components using the scopes field in component definitions.

Test failure scenarios. Verify your system handles broker outages, network partitions, and processing errors gracefully.

## Conclusion

Dapr's publish-subscribe building block simplifies building event-driven microservices on Kubernetes. By abstracting message broker specifics behind a unified API, Dapr enables portable applications that work across different infrastructure providers. The combination of automatic retries, dead letter queues, and flexible routing makes it straightforward to build resilient event-driven systems. Whether using Redis for development or Kafka for production, your application code remains the same, reducing complexity and accelerating development.
