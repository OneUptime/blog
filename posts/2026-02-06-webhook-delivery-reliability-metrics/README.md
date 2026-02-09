# How to Monitor Webhook Delivery Reliability (Success Rates, Retries, Latency) with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Webhooks, Metrics, Reliability Monitoring

Description: Build comprehensive webhook delivery monitoring with OpenTelemetry metrics tracking success rates, retry counts, and delivery latency.

If you send webhooks, you need to know whether they are actually being delivered. Success rates, retry counts, and delivery latency are the three pillars of webhook reliability monitoring. OpenTelemetry metrics give you a vendor-neutral way to track all three.

## Defining the Metrics

Start by setting up the OpenTelemetry meter and defining your webhook metrics:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure the meter provider
reader = PeriodicExportingMetricReader(OTLPMetricExporter())
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("webhook.delivery")

# Counter for total delivery attempts
delivery_attempts = meter.create_counter(
    name="webhook.delivery.attempts",
    description="Total number of webhook delivery attempts",
    unit="1",
)

# Counter for successful deliveries
delivery_successes = meter.create_counter(
    name="webhook.delivery.successes",
    description="Total number of successful webhook deliveries",
    unit="1",
)

# Counter for failed deliveries (after all retries exhausted)
delivery_failures = meter.create_counter(
    name="webhook.delivery.failures",
    description="Total number of permanently failed webhook deliveries",
    unit="1",
)

# Histogram for delivery latency
delivery_latency = meter.create_histogram(
    name="webhook.delivery.latency",
    description="Time taken to deliver a webhook (including retries)",
    unit="ms",
)

# Histogram for individual attempt latency
attempt_latency = meter.create_histogram(
    name="webhook.attempt.latency",
    description="Time taken for a single delivery attempt",
    unit="ms",
)

# Counter for retry attempts
retry_count = meter.create_counter(
    name="webhook.delivery.retries",
    description="Total number of retry attempts",
    unit="1",
)
```

## Instrumenting the Webhook Sender

Now wrap your webhook delivery logic with these metrics:

```python
import time
import requests
from requests.exceptions import RequestException

class InstrumentedWebhookSender:
    def __init__(self, max_retries=3, backoff_base=2):
        self.max_retries = max_retries
        self.backoff_base = backoff_base

    def deliver(self, webhook_url, payload, event_type, subscriber_id):
        """Deliver a webhook with retries, recording metrics at each step."""
        common_attrs = {
            "webhook.event_type": event_type,
            "webhook.subscriber_id": subscriber_id,
            "webhook.destination_host": self._extract_host(webhook_url),
        }

        start_time = time.time()
        last_error = None

        for attempt in range(self.max_retries + 1):
            attempt_attrs = {
                **common_attrs,
                "webhook.attempt_number": attempt + 1,
            }

            # Record the attempt
            delivery_attempts.add(1, attempt_attrs)

            if attempt > 0:
                # This is a retry
                retry_count.add(1, attempt_attrs)

            attempt_start = time.time()

            try:
                response = requests.post(
                    webhook_url,
                    json=payload,
                    timeout=10,
                    headers={"Content-Type": "application/json"},
                )

                attempt_elapsed = (time.time() - attempt_start) * 1000
                attempt_latency.record(attempt_elapsed, {
                    **attempt_attrs,
                    "http.status_code": response.status_code,
                })

                if 200 <= response.status_code < 300:
                    # Successful delivery
                    total_elapsed = (time.time() - start_time) * 1000
                    delivery_latency.record(total_elapsed, {
                        **common_attrs,
                        "webhook.final_status": "success",
                        "webhook.total_attempts": attempt + 1,
                    })
                    delivery_successes.add(1, common_attrs)
                    return True

                # Non-2xx response, treat as failure for this attempt
                last_error = f"HTTP {response.status_code}"

            except RequestException as e:
                attempt_elapsed = (time.time() - attempt_start) * 1000
                attempt_latency.record(attempt_elapsed, {
                    **attempt_attrs,
                    "webhook.error_type": type(e).__name__,
                })
                last_error = str(e)

            # Wait before retrying (exponential backoff)
            if attempt < self.max_retries:
                wait_time = self.backoff_base ** attempt
                time.sleep(wait_time)

        # All retries exhausted
        total_elapsed = (time.time() - start_time) * 1000
        delivery_latency.record(total_elapsed, {
            **common_attrs,
            "webhook.final_status": "failure",
            "webhook.total_attempts": self.max_retries + 1,
            "webhook.last_error": last_error,
        })
        delivery_failures.add(1, {
            **common_attrs,
            "webhook.last_error": last_error,
        })
        return False

    def _extract_host(self, url):
        from urllib.parse import urlparse
        return urlparse(url).hostname or "unknown"
```

## Adding a Gauge for In-Flight Deliveries

Track how many webhooks are currently being delivered to spot concurrency issues:

```python
# Use an UpDownCounter to track in-flight deliveries
in_flight = meter.create_up_down_counter(
    name="webhook.delivery.in_flight",
    description="Number of webhook deliveries currently in progress",
    unit="1",
)

class InstrumentedWebhookSenderWithInflight(InstrumentedWebhookSender):
    def deliver(self, webhook_url, payload, event_type, subscriber_id):
        attrs = {
            "webhook.event_type": event_type,
            "webhook.subscriber_id": subscriber_id,
        }
        in_flight.add(1, attrs)
        try:
            return super().deliver(webhook_url, payload, event_type, subscriber_id)
        finally:
            in_flight.add(-1, attrs)
```

## Useful Queries

Once you are collecting these metrics, here are some useful queries you can run in your backend (PromQL syntax):

```promql
# Success rate per subscriber over the last hour
sum(rate(webhook_delivery_successes_total[1h])) by (webhook_subscriber_id)
/
sum(rate(webhook_delivery_attempts_total[1h])) by (webhook_subscriber_id)

# Average delivery latency by event type
histogram_quantile(0.95,
  sum(rate(webhook_delivery_latency_bucket[5m])) by (le, webhook_event_type)
)

# Retry rate (what fraction of attempts are retries)
sum(rate(webhook_delivery_retries_total[1h]))
/
sum(rate(webhook_delivery_attempts_total[1h]))

# Subscribers with the highest failure rate
topk(10,
  sum(rate(webhook_delivery_failures_total[1h])) by (webhook_subscriber_id)
)
```

## Alerting on Webhook Health

Set up alerts based on these metrics:

```yaml
# Example Prometheus alerting rules
groups:
  - name: webhook_reliability
    rules:
      - alert: WebhookDeliverySuccessRateLow
        expr: |
          sum(rate(webhook_delivery_successes_total[15m])) by (webhook_subscriber_id)
          /
          sum(rate(webhook_delivery_attempts_total[15m])) by (webhook_subscriber_id)
          < 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Webhook delivery success rate below 95%"

      - alert: WebhookDeliveryLatencyHigh
        expr: |
          histogram_quantile(0.99,
            sum(rate(webhook_delivery_latency_bucket[5m])) by (le)
          ) > 30000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "P99 webhook delivery latency exceeds 30 seconds"
```

These metrics give you full visibility into your webhook delivery pipeline. You can see which subscribers are flaky, which event types take the longest to deliver, and whether your retry strategy is working effectively.
