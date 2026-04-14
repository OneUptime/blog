# How to Use Dapr Pub/Sub Between Python and Java Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Python, Java, Messaging, Microservice

Description: Implement event-driven communication between a Python publisher and a Java subscriber using Dapr pub/sub with Redis Streams as the message broker.

---

Dapr pub/sub decouples producers from consumers across language boundaries. A Python service can publish events that Java services consume without either knowing about the other's existence or the underlying broker technology.

## Shared Pub/Sub Component

Deploy a shared Redis Streams pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
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
```

## Python Publisher

Publish order events from a Python Flask service:

```python
# publisher.py
from flask import Flask, request, jsonify
import requests
import os
import json

app = Flask(__name__)
DAPR_PORT = os.getenv("DAPR_HTTP_PORT", "3500")
PUBSUB_NAME = "order-pubsub"
TOPIC_NAME = "orders"

@app.route('/orders', methods=['POST'])
def create_order():
    order = request.json
    order['created_at'] = "2026-03-31T10:00:00Z"
    order['status'] = "pending"

    # Publish to Dapr pub/sub
    response = requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/publish/{PUBSUB_NAME}/{TOPIC_NAME}",
        headers={"Content-Type": "application/json"},
        data=json.dumps(order)
    )

    if response.status_code == 204:
        return jsonify({"published": True, "order": order}), 201
    else:
        return jsonify({"error": "Failed to publish"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Java Subscriber

Create a Spring Boot subscriber that listens for order events:

```java
// OrderSubscriber.java
import io.dapr.Topic;
import io.dapr.client.domain.CloudEvent;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class OrderSubscriber {

    @Topic(name = "orders", pubsubName = "order-pubsub")
    @PostMapping("/orders")
    public Mono<ResponseEntity<String>> handleOrder(
        @RequestBody(required = false) CloudEvent<Order> event
    ) {
        if (event == null || event.getData() == null) {
            return Mono.just(ResponseEntity.ok("SUCCESS"));
        }

        Order order = event.getData();
        System.out.printf("Processing order: %s for item: %s%n",
            order.getId(), order.getItem());

        // Process order...

        return Mono.just(ResponseEntity.ok("SUCCESS"));
    }
}
```

The `@Topic` annotation automatically registers the subscription with Dapr at startup. Configure the Spring Boot server port in `application.properties`:

```properties
server.port=8080
```

## Java Order Model

```java
public class Order {
    private String id;
    private String item;
    private int quantity;
    private String status;
    private String createdAt;

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }
    // ... remaining getters/setters
}
```

## Testing the Pipeline

```bash
# Port-forward the Python publisher
kubectl port-forward deployment/order-publisher 5000:5000

# Publish an order
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -d '{"id": "ord-001", "item": "widget", "quantity": 5}'

# Check Java subscriber logs
kubectl logs -l app=order-subscriber --tail=20
```

## Dead Letter Handling

Configure dead-letter topics for messages the Java subscriber fails to process:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: order-pubsub
  topic: orders
  route: /orders
  deadLetterTopic: orders-dead-letter
  bulkSubscribe:
    enabled: false
```

## Summary

Dapr pub/sub between Python and Java uses a shared component definition and CloudEvents format as the common messaging contract. The Python publisher uses the HTTP API while the Java subscriber uses the Spring Boot SDK annotation. Both services remain decoupled from the broker implementation and from each other.
