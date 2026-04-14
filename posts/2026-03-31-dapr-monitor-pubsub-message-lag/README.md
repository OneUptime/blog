# How to Monitor Dapr Pub/Sub Message Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Monitoring, Kafka, Observability

Description: Track consumer lag in Dapr pub/sub subscriptions to detect processing bottlenecks and prevent message queue buildup.

---

Message lag is the gap between messages being published and being processed by consumers. In Dapr pub/sub, lag can build up when consumer services are slow, restarting, or misconfigured. Left unmonitored, lag can grow unbounded, causing delayed processing, memory pressure, and eventual message loss. This guide covers how to detect and alert on pub/sub lag in Dapr.

## Understanding Dapr Pub/Sub Lag

Dapr acts as a pub/sub proxy - the actual message broker (Kafka, RabbitMQ, Redis Streams, etc.) holds messages. Lag exists at two levels:

1. Broker-level lag - messages in the broker not yet delivered to Dapr
2. Application-level lag - messages delivered to app but not yet acknowledged

Dapr exposes these key metrics:

- `dapr_component_pubsub_ingress_count` - total messages received by subscribers
- `dapr_component_pubsub_egress_count` - total messages published
- `dapr_component_pubsub_ingress_latencies` - event processing latency for incoming messages

## Monitoring Kafka Consumer Lag with Dapr

For Kafka-backed Dapr pub/sub, use the Kafka consumer group metrics:

```bash
# Check consumer group lag for a Dapr app
kubectl exec -it kafka-0 -n kafka -- \
  kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --describe \
  --group dapr-my-service
```

Deploy the Kafka Exporter to expose lag metrics to Prometheus:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-exporter
  namespace: monitoring
spec:
  template:
    spec:
      containers:
        - name: kafka-exporter
          image: danielqsj/kafka-exporter:latest
          args:
            - "--kafka.server=kafka:9092"
```

## Dapr Pub/Sub Processing Rate Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-pubsub-lag-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.pubsub.lag
      rules:
        - alert: DaprPubSubConsumerLag
          expr: kafka_consumergroup_lag > 1000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Dapr pub/sub consumer lag elevated"
            description: "Consumer group {{ $labels.consumergroup }} has {{ $value }} unprocessed messages on topic {{ $labels.topic }}."

        - alert: DaprPubSubLagCritical
          expr: kafka_consumergroup_lag > 10000
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Dapr pub/sub consumer lag critical"
            description: "Consumer group {{ $labels.consumergroup }} has {{ $value }} messages pending - processing is severely backed up."

        - alert: DaprPubSubSubscriberNotProcessing
          expr: |
            rate(dapr_component_pubsub_ingress_count[5m]) == 0
            and
            kafka_consumergroup_lag > 0
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "Dapr subscriber has stopped processing"
            description: "Subscriber for topic {{ $labels.topic }} has {{ $value }} messages but is not consuming them."
```

## Monitoring Application Processing Rate

Track how fast your Dapr subscriber is processing messages:

```bash
# Query processing rate via Prometheus
curl 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=rate(dapr_component_pubsub_ingress_count{success="true"}[5m])'
```

Visualize lag trends in Grafana with this dashboard query:

```promql
kafka_consumergroup_lag{consumergroup=~"dapr-.*"}
```

## Tuning Subscriber Throughput

If lag is building up, increase parallelism using Dapr subscription configuration:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  topic: orders
  routes:
    default: /orders/process
  pubsubname: kafka-pubsub
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

## Summary

Monitoring Dapr pub/sub message lag requires combining Dapr's own metrics with broker-level consumer group lag metrics. Setting tiered alerts on lag thresholds and detecting stalled consumers enables teams to respond to processing bottlenecks before queues grow unmanageable.
