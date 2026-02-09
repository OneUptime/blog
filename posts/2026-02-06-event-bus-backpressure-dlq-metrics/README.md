# How to Monitor Event Bus Backpressure and Dead Letter Queue Depth with OpenTelemetry Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Event Bus, Backpressure, Dead Letter Queue

Description: Monitor event bus backpressure and dead letter queue depth using OpenTelemetry custom metrics to prevent message processing bottlenecks.

When your event consumers cannot keep up with producers, messages pile up. This backpressure can cascade through your system, causing timeouts, dropped events, and degraded user experiences. Meanwhile, events that fail processing repeatedly end up in dead letter queues (DLQs), silently accumulating until someone notices. OpenTelemetry custom metrics let you monitor both problems in real time.

## Defining Backpressure Metrics

Backpressure manifests as growing queue depths and increasing consumer lag. Here are the metrics you need:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

reader = PeriodicExportingMetricReader(OTLPMetricExporter(), export_interval_millis=10000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("event.bus.monitoring")

# Observable gauge for current queue depth
# This gets polled periodically by the metric reader
queue_depth_gauge = meter.create_observable_gauge(
    name="event_bus.queue.depth",
    description="Current number of messages waiting in the queue",
    unit="messages",
    callbacks=[],  # We will register callbacks below
)

# Counter for messages entering the DLQ
dlq_counter = meter.create_counter(
    name="event_bus.dlq.messages_total",
    description="Total number of messages sent to the dead letter queue",
    unit="messages",
)

# Observable gauge for DLQ depth
dlq_depth_gauge = meter.create_observable_gauge(
    name="event_bus.dlq.depth",
    description="Current number of messages in the dead letter queue",
    unit="messages",
    callbacks=[],
)

# Histogram for consumer processing time
processing_time = meter.create_histogram(
    name="event_bus.consumer.processing_time",
    description="Time taken to process a single message",
    unit="ms",
)

# Counter for processed messages
messages_processed = meter.create_counter(
    name="event_bus.messages.processed_total",
    description="Total messages successfully processed",
    unit="messages",
)

# Gauge for consumer lag (difference between latest and consumed offset)
consumer_lag = meter.create_observable_gauge(
    name="event_bus.consumer.lag",
    description="Number of messages the consumer is behind the producer",
    unit="messages",
    callbacks=[],
)
```

## Implementing Observable Callbacks

Observable gauges need callback functions that report the current value when polled:

```python
import redis

class EventBusMonitor:
    """Monitors queue depths and consumer lag using observable metrics."""

    def __init__(self, redis_client, queues):
        self.redis_client = redis_client
        self.queues = queues

        # Register callbacks for observable gauges
        meter.create_observable_gauge(
            name="event_bus.queue.depth",
            description="Current number of messages waiting in the queue",
            unit="messages",
            callbacks=[self._observe_queue_depth],
        )

        meter.create_observable_gauge(
            name="event_bus.dlq.depth",
            description="Current messages in the dead letter queue",
            unit="messages",
            callbacks=[self._observe_dlq_depth],
        )

    def _observe_queue_depth(self, options):
        """Callback that reports current queue depths."""
        for queue_name in self.queues:
            depth = self.redis_client.llen(f"queue:{queue_name}")
            yield metrics.Observation(
                value=depth,
                attributes={"queue.name": queue_name},
            )

    def _observe_dlq_depth(self, options):
        """Callback that reports current DLQ depths."""
        for queue_name in self.queues:
            depth = self.redis_client.llen(f"dlq:{queue_name}")
            yield metrics.Observation(
                value=depth,
                attributes={"queue.name": queue_name},
            )
```

## Instrumenting the Consumer

Wrap your message consumer to capture processing metrics and handle DLQ routing:

```python
import time

class InstrumentedConsumer:
    def __init__(self, queue_name, handler, max_retries=3):
        self.queue_name = queue_name
        self.handler = handler
        self.max_retries = max_retries

    def process_message(self, message):
        """Process a message with metrics collection and DLQ routing."""
        attrs = {
            "queue.name": self.queue_name,
            "message.type": message.get("type", "unknown"),
        }

        start = time.time()

        try:
            self.handler(message)

            elapsed_ms = (time.time() - start) * 1000
            processing_time.record(elapsed_ms, attrs)
            messages_processed.add(1, {**attrs, "status": "success"})

        except Exception as e:
            elapsed_ms = (time.time() - start) * 1000
            processing_time.record(elapsed_ms, attrs)

            retry_count = message.get("_retry_count", 0)

            if retry_count >= self.max_retries:
                # Send to dead letter queue
                self._send_to_dlq(message, str(e))
                dlq_counter.add(1, {
                    **attrs,
                    "error.type": type(e).__name__,
                    "retry.count": retry_count,
                })
                messages_processed.add(1, {**attrs, "status": "dead_lettered"})
            else:
                # Requeue with incremented retry count
                message["_retry_count"] = retry_count + 1
                self._requeue(message)
                messages_processed.add(1, {**attrs, "status": "retried"})

    def _send_to_dlq(self, message, error_reason):
        """Move a failed message to the dead letter queue."""
        message["_dlq_reason"] = error_reason
        message["_dlq_timestamp"] = time.time()
        # Push to the DLQ in your message broker
        self.redis_client.rpush(f"dlq:{self.queue_name}", json.dumps(message))

    def _requeue(self, message):
        """Put the message back on the main queue for retry."""
        self.redis_client.rpush(f"queue:{self.queue_name}", json.dumps(message))
```

## Kafka-Specific Consumer Lag Monitoring

For Kafka, consumer lag is one of the most important backpressure indicators:

```python
from confluent_kafka.admin import AdminClient

class KafkaLagMonitor:
    def __init__(self, bootstrap_servers, consumer_group):
        self.admin = AdminClient({"bootstrap.servers": bootstrap_servers})
        self.consumer_group = consumer_group

        meter.create_observable_gauge(
            name="event_bus.kafka.consumer_lag",
            description="Kafka consumer lag per partition",
            unit="messages",
            callbacks=[self._observe_lag],
        )

    def _observe_lag(self, options):
        """Report per-partition consumer lag."""
        # Get committed offsets and high watermarks
        # and compute the difference
        group_offsets = self._get_consumer_offsets()
        for topic_partition, lag in group_offsets.items():
            yield metrics.Observation(
                value=lag,
                attributes={
                    "kafka.consumer_group": self.consumer_group,
                    "kafka.topic": topic_partition.topic,
                    "kafka.partition": topic_partition.partition,
                },
            )
```

## Alerting Rules

Set up alerts based on these metrics to catch problems early:

```yaml
groups:
  - name: event_bus_health
    rules:
      - alert: HighQueueDepth
        expr: event_bus_queue_depth > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue_name }} depth exceeds 10k messages"

      - alert: DLQGrowing
        expr: rate(event_bus_dlq_messages_total[5m]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Messages are being sent to DLQ for {{ $labels.queue_name }}"

      - alert: ConsumerLagHigh
        expr: event_bus_kafka_consumer_lag > 50000
        for: 10m
        labels:
          severity: warning
```

These metrics give you early warning when your event-driven system is under stress. You will know about backpressure before it causes visible user impact, and DLQ growth alerts ensure that failed events do not go unnoticed.
