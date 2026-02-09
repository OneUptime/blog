# How to Monitor RabbitMQ Queue Depth, Consumer Count, Unacked Messages, and Publish Rates with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RabbitMQ, Queue Monitoring, Message Broker

Description: Monitor RabbitMQ queue depth, consumer count, unacknowledged messages, and publish rates using the OpenTelemetry Collector RabbitMQ receiver.

RabbitMQ is a widely used message broker. Monitoring queue depth, consumer count, unacknowledged messages, and publish rates helps you detect consumer bottlenecks, message backlogs, and throughput issues. The OpenTelemetry Collector includes a RabbitMQ receiver that connects to the management API and collects these metrics.

## Enabling the RabbitMQ Management Plugin

The Collector uses the RabbitMQ management HTTP API. Enable the management plugin:

```bash
rabbitmq-plugins enable rabbitmq_management
```

The management API is available at `http://rabbitmq:15672/api/`.

## Collector Configuration

```yaml
receivers:
  rabbitmq:
    endpoint: http://rabbitmq:15672
    username: monitoring
    password: "${RABBITMQ_PASSWORD}"
    collection_interval: 15s
    metrics:
      rabbitmq.consumer.count:
        enabled: true
      rabbitmq.message.current:
        enabled: true
      rabbitmq.message.delivered:
        enabled: true
      rabbitmq.message.published:
        enabled: true
      rabbitmq.message.acknowledged:
        enabled: true
      rabbitmq.message.dropped:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: rabbitmq
        action: upsert
      - key: service.type
        value: message-broker
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [rabbitmq]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key RabbitMQ Metrics

### Queue Depth (Message Count)

```
rabbitmq.message.current{state="ready"}          - Messages ready for delivery
rabbitmq.message.current{state="unacknowledged"}  - Messages delivered but not acked
```

The total queue depth is `ready + unacknowledged`. Growing `ready` count means consumers are not consuming fast enough. Growing `unacknowledged` means consumers are receiving messages but not acknowledging them (possibly processing is slow).

### Consumer Count

```
rabbitmq.consumer.count - Number of consumers on the queue
```

If consumers drop to zero, messages accumulate. If consumers increase but queue depth still grows, each consumer is too slow.

### Publish Rate

```
rabbitmq.message.published - Total messages published (cumulative)
publish_rate = rate(rabbitmq.message.published[5m])
```

### Delivery and Acknowledge Rate

```
rabbitmq.message.delivered - Total messages delivered to consumers
rabbitmq.message.acknowledged - Total messages acknowledged

delivery_rate = rate(rabbitmq.message.delivered[5m])
ack_rate = rate(rabbitmq.message.acknowledged[5m])
```

When `delivery_rate` is much higher than `ack_rate`, consumers are receiving messages faster than they can process them.

## Using the Prometheus Plugin

RabbitMQ also has a Prometheus plugin that exposes metrics in Prometheus format:

```bash
rabbitmq-plugins enable rabbitmq_prometheus
```

Scrape with the Prometheus receiver for additional metrics:

```yaml
receivers:
  prometheus/rabbitmq:
    config:
      scrape_configs:
        - job_name: "rabbitmq"
          scrape_interval: 15s
          static_configs:
            - targets: ["rabbitmq:15692"]
          metrics_path: /metrics
```

The Prometheus plugin exposes per-queue metrics:

```
rabbitmq_queue_messages_ready              - Ready messages per queue
rabbitmq_queue_messages_unacked            - Unacked messages per queue
rabbitmq_queue_consumers                   - Consumers per queue
rabbitmq_queue_messages_published_total    - Published messages per queue
rabbitmq_queue_messages_delivered_total    - Delivered messages per queue
```

## Per-Queue Monitoring

Monitor specific queues that are critical to your application:

```yaml
processors:
  filter/important-queues:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "rabbitmq.*"
        resource_attributes:
          - key: rabbitmq.queue.name
            value: "(orders|payments|notifications)"
```

## Alert Conditions

```yaml
# Queue depth growing
- alert: RabbitMQQueueBacklog
  condition: rabbitmq.message.current{state="ready"} > 10000
  for: 10m
  severity: warning
  message: "Queue '{{ queue }}' has {{ value }} messages ready. Consumers may be slow."

# No consumers on a queue
- alert: RabbitMQNoConsumers
  condition: rabbitmq.consumer.count == 0 and rabbitmq.message.current > 0
  for: 5m
  severity: critical
  message: "Queue '{{ queue }}' has messages but no consumers."

# High unacked count
- alert: RabbitMQHighUnacked
  condition: rabbitmq.message.current{state="unacknowledged"} > 5000
  for: 5m
  severity: warning
  message: "{{ value }} unacknowledged messages on queue '{{ queue }}'. Consumer processing is slow."

# Messages being dropped
- alert: RabbitMQMessagesDropped
  condition: rate(rabbitmq.message.dropped[5m]) > 0
  severity: critical
  message: "Messages are being dropped on queue '{{ queue }}'."

# Publish rate spike
- alert: RabbitMQPublishRateSpike
  condition: rate(rabbitmq.message.published[5m]) > 10000
  for: 5m
  severity: info
  message: "High publish rate of {{ value }} msgs/sec on queue '{{ queue }}'."
```

## Creating a Monitoring User

Create a dedicated monitoring user with read-only access:

```bash
rabbitmqctl add_user monitoring monitor_password
rabbitmqctl set_user_tags monitoring monitoring
rabbitmqctl set_permissions -p / monitoring "" "" ".*"
```

The `monitoring` tag gives read-only access to the management API.

## Docker Compose Example

```yaml
version: "3.8"

services:
  rabbitmq:
    image: rabbitmq:management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    ports:
      - "5672:5672"
      - "15672:15672"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      RABBITMQ_PASSWORD: admin
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
```

## Summary

RabbitMQ queue monitoring focuses on four key metrics: queue depth (ready messages), consumer count, unacknowledged messages, and publish/delivery rates. The OpenTelemetry Collector's RabbitMQ receiver connects to the management API and collects these metrics per queue. Alert on growing queue depth, missing consumers, high unacked counts, and dropped messages to ensure your message broker is healthy and consumers are keeping up with producers.
