# How to Monitor Dapr Pub/Sub Message Delivery Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Metric, Observability, Message

Description: Monitor Dapr pub/sub message delivery rates, failures, and latency to ensure reliable message processing across your event-driven services.

---

Pub/sub messaging in Dapr provides reliable event delivery between microservices. Monitoring delivery metrics helps you detect message loss, processing bottlenecks, and redelivery storms before they cause downstream failures.

## Pub/Sub Metric Overview

Dapr tracks metrics for both the publisher side (egress) and subscriber side (ingress):

**Egress (publishing) metrics:**
- `dapr_component_pubsub_egress_count` - total messages published (label `success="true"` or `"false"`)
- `dapr_component_pubsub_egress_latencies` - publish latency (unit: milliseconds)

**Ingress (subscribing) metrics:**
- `dapr_component_pubsub_ingress_count` - total messages received (label `process_status` indicates `success`, `retry`, or `drop`)
- `dapr_component_pubsub_ingress_latencies` - processing latency (unit: milliseconds)

## Publish Success Rate

```text
# Publish success rate per topic
1 - (
  rate(dapr_component_pubsub_egress_count{success="false"}[5m])
  / rate(dapr_component_pubsub_egress_count[5m])
)

# Raw publish rate per topic
rate(dapr_component_pubsub_egress_count[5m])
```

## Message Processing Rate

```text
# Messages processed per second per topic
rate(dapr_component_pubsub_ingress_count[5m])

# Processing success rate
1 - (
  rate(dapr_component_pubsub_ingress_count{process_status!="success"}[5m])
  / rate(dapr_component_pubsub_ingress_count[5m])
)
```

## Drop Rate - Critical for Data Loss Detection

Message drops indicate the subscriber cannot keep up or there is a configuration issue:

```text
# Drop rate - any drops mean potential message loss
rate(dapr_component_pubsub_ingress_count{process_status="drop"}[5m])

# Drop percentage
rate(dapr_component_pubsub_ingress_count{process_status="drop"}[5m])
/ rate(dapr_component_pubsub_ingress_count[5m]) * 100
```

## Processing Latency

```text
# P99 message processing time per topic
histogram_quantile(0.99,
  sum by (le, topic, component) (
    rate(dapr_component_pubsub_ingress_latencies_bucket[5m])
  )
)

# Average processing time
sum by (topic) (rate(dapr_component_pubsub_ingress_latencies_sum[5m]))
/ sum by (topic) (rate(dapr_component_pubsub_ingress_latencies_count[5m]))
```

## Alert Rules for Pub/Sub Health

```yaml
groups:
- name: dapr-pubsub
  rules:
  - alert: DaprMessageDrop
    expr: rate(dapr_component_pubsub_ingress_count{process_status="drop"}[5m]) > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Messages being dropped on topic {{ $labels.topic }}"
      description: "Drop rate: {{ $value }} messages/second"

  - alert: DaprPublishFailures
    expr: |
      rate(dapr_component_pubsub_egress_count{success="false"}[5m]) > 0.1
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "Pub/sub publish failures on {{ $labels.component }}"

  - alert: DaprHighProcessingLatency
    expr: |
      histogram_quantile(0.99,
        sum by (le, topic) (
          rate(dapr_component_pubsub_ingress_latencies_bucket[5m])
        )
      ) > 5000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High pub/sub processing latency on topic {{ $labels.topic }}"
```

## Calculating Consumer Lag (Approximate)

Dapr does not expose consumer lag directly, but you can approximate it from processing latency trends:

```text
# Rising processing latency trend suggests growing lag
deriv(
  histogram_quantile(0.50,
    sum by (le, topic) (rate(dapr_component_pubsub_ingress_latencies_bucket[10m]))
  )[30m:]
) > 0
```

For direct consumer lag monitoring, instrument your message broker (Kafka, RabbitMQ, Redis Streams) separately.

## Summary

Dapr pub/sub delivery metrics provide publisher-side and subscriber-side visibility for each topic and component. Alert on any message drops as they indicate data loss, and monitor processing failure rates to catch subscriber bugs early. Use processing latency trends as a proxy for consumer lag when direct broker metrics are not available.
