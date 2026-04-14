# How to Use Dapr Pub/Sub with Multiple Message Brokers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Kafka, RabbitMQ, Microservice

Description: Learn how to configure and use multiple pub/sub broker components in a single Dapr application to route different topics to different message brokers.

---

## Why Use Multiple Brokers

Different workloads have different requirements. You might use Kafka for high-throughput event streaming, RabbitMQ for task queues, and Redis for low-latency notifications. Dapr lets you define multiple pub/sub components and reference them by name.

## Define Multiple Pub/Sub Components

Create separate component YAML files for each broker:

```yaml
# kafka-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: consumerGroup
    value: analytics-consumers
```

```yaml
# rabbitmq-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: amqp://guest:guest@rabbitmq:5672
  - name: durable
    value: "true"
```

```yaml
# redis-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Publish to Different Brokers

Reference the component name in the publish URL:

```bash
# Publish analytics event to Kafka
curl -X POST http://localhost:3500/v1.0/publish/kafka-pubsub/page-views \
  -H "Content-Type: application/json" \
  -d '{"userId": "u1", "page": "/home"}'

# Publish job to RabbitMQ
curl -X POST http://localhost:3500/v1.0/publish/rabbitmq-pubsub/email-jobs \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "template": "welcome"}'

# Publish notification to Redis
curl -X POST http://localhost:3500/v1.0/publish/redis-pubsub/alerts \
  -H "Content-Type: application/json" \
  -d '{"level": "info", "message": "Deploy completed"}'
```

## Subscribe to Topics Across Brokers

In your subscription handler, reference each component by name:

```javascript
// Programmatic subscriptions
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "kafka-pubsub",
      topic: "page-views",
      route: "/analytics/page-views",
    },
    {
      pubsubname: "rabbitmq-pubsub",
      topic: "email-jobs",
      route: "/jobs/email",
    },
    {
      pubsubname: "redis-pubsub",
      topic: "alerts",
      route: "/notifications/alerts",
    },
  ]);
});
```

## Declarative Subscriptions

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: kafka-analytics
spec:
  pubsubname: kafka-pubsub
  topic: page-views
  route: /analytics/page-views
---
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: rabbitmq-jobs
spec:
  pubsubname: rabbitmq-pubsub
  topic: email-jobs
  route: /jobs/email
```

## Scoping Components to Specific Apps

Limit which apps can access each broker using scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
scopes:
- analytics-service
- data-pipeline
```

## Summary

Dapr supports multiple pub/sub components within the same application, allowing you to route different topics to the most appropriate broker. Each component is referenced by name in publish calls and subscription configurations, keeping broker-specific routing transparent to your application logic.
