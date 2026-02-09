# How to Use OpenTelemetry Queue Depth Metrics to Auto-Scale Message Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Auto-Scaling, Message Queues, Kubernetes

Description: A practical guide to instrumenting message queue depth with OpenTelemetry and using those metrics to drive consumer auto-scaling decisions.

Message queues are great at decoupling producers and consumers, but they introduce a new problem: how many consumers do you actually need? Too few and your queue backs up, adding latency. Too many and you waste resources on idle workers. The sweet spot changes throughout the day, so static scaling does not cut it.

OpenTelemetry lets you instrument queue depth and consumer lag in a vendor-neutral way, then feed those metrics into Kubernetes HPA or any other auto-scaler. This post covers the full pipeline from instrumentation to scaling.

## Instrumenting Queue Depth

Whether you use RabbitMQ, Kafka, or SQS, the pattern is the same: periodically read the queue depth and report it as a gauge metric. Here is a Python example that polls queue depth and publishes it through OpenTelemetry.

This code creates an observable gauge that checks the queue depth every time the metric is collected:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import boto3

exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=15000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("queue.monitor", version="1.0.0")

sqs_client = boto3.client("sqs", region_name="us-east-1")
QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789/order-processing"

def observe_queue_depth(options):
    """Fetch the approximate message count from SQS."""
    response = sqs_client.get_queue_attributes(
        QueueUrl=QUEUE_URL,
        AttributeNames=["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"]
    )
    attrs = response["Attributes"]
    visible = int(attrs["ApproximateNumberOfMessages"])
    in_flight = int(attrs["ApproximateNumberOfMessagesNotVisible"])

    yield metrics.Observation(
        value=visible,
        attributes={"queue": "order-processing", "state": "visible"}
    )
    yield metrics.Observation(
        value=in_flight,
        attributes={"queue": "order-processing", "state": "in_flight"}
    )

meter.create_observable_gauge(
    name="messaging.queue.depth",
    callbacks=[observe_queue_depth],
    description="Number of messages waiting in the queue"
)
```

## Tracking Consumer Processing Rate

Queue depth alone is not enough. You also need to know how fast your consumers are processing messages, so you can calculate the drain rate and determine if scaling is actually helping.

This snippet instruments a consumer to track messages processed per second and processing duration:

```python
# Inside your consumer worker
from opentelemetry import metrics

meter = metrics.get_meter("queue.consumer", version="1.0.0")

messages_processed = meter.create_counter(
    name="messaging.consumer.messages_processed",
    description="Total messages processed by this consumer",
    unit="messages"
)

processing_duration = meter.create_histogram(
    name="messaging.consumer.processing_duration",
    description="Time taken to process each message",
    unit="ms"
)

def process_message(message):
    import time
    start = time.time()

    # Your actual message processing logic
    handle_order(message)

    elapsed_ms = (time.time() - start) * 1000
    processing_duration.record(elapsed_ms, {"queue": "order-processing"})
    messages_processed.add(1, {"queue": "order-processing"})
```

## Feeding Metrics to Kubernetes HPA

The Prometheus Adapter lets you use custom metrics in Kubernetes HPA rules. First, configure your collector to expose metrics to Prometheus.

This collector config receives OTLP metrics and exposes them on a Prometheus scrape endpoint:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      exporters: [prometheus]
```

Now set up the Prometheus Adapter to make your queue depth metric available to the HPA.

This adapter configuration maps the `messaging_queue_depth` Prometheus metric to a Kubernetes custom metric:

```yaml
# prometheus-adapter-config.yaml
rules:
  - seriesQuery: 'messaging_queue_depth{state="visible"}'
    resources:
      overrides:
        namespace:
          resource: namespace
    name:
      matches: "^(.*)$"
      as: "queue_depth_visible"
    metricsQuery: 'sum(messaging_queue_depth{state="visible",queue="order-processing"})'
```

Finally, create the HPA that scales your consumer deployment based on queue depth.

This HPA targets 100 messages per consumer replica - if queue depth grows, more pods get created:

```yaml
# consumer-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-consumer-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-consumer
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: External
      external:
        metric:
          name: queue_depth_visible
          selector:
            matchLabels:
              queue: order-processing
        target:
          type: AverageValue
          # Scale up when there are more than 100 messages per replica
          averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      # Be conservative when scaling down to avoid thrashing
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 120
```

## Calculating the Right Target Value

The target value of 100 messages per replica in the example above is not arbitrary. You can calculate it from your consumer processing rate.

Here is the formula. If each consumer processes 10 messages per second on average, and your acceptable queue latency is 10 seconds, then each consumer can handle 10 * 10 = 100 messages in queue before latency exceeds your SLO.

You can query this from your collected metrics directly:

```promql
# Average messages processed per second per consumer
rate(messaging_consumer_messages_processed_total{queue="order-processing"}[5m])
/ count(up{job="order-consumer"})
```

## Avoiding Scale Thrashing

One problem teams run into is the auto-scaler oscillating - scaling up, then immediately scaling down, then up again. Here are some concrete ways to prevent that:

- **Set a stabilization window.** The HPA behavior section above includes `stabilizationWindowSeconds`. The scaler waits this long before acting on a new metric reading.
- **Scale down more slowly than you scale up.** In the config above, we allow adding 4 pods per minute but only remove 2 pods every 2 minutes. This asymmetry is intentional.
- **Use average queue depth over a window**, not the instantaneous value. A 5-minute average smooths out bursts that your current consumers can handle.
- **Set sensible min/max bounds.** The minimum replica count should handle your baseline load without any scaling events. The maximum should reflect the actual capacity of your downstream dependencies.

With these metrics flowing through OpenTelemetry, you get a scaling system that responds to actual demand rather than guessing based on CPU utilization. Queue depth is a much better signal for consumer scaling because it directly measures the work waiting to be done.
