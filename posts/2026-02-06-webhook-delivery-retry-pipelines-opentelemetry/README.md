# How to Instrument Webhook Delivery and Retry Pipelines for SaaS Integrations with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Webhooks, SaaS Integrations, Retry Pipelines

Description: Instrument webhook delivery and retry pipelines with OpenTelemetry to track delivery success rates and debug integration failures.

Webhooks are how your SaaS platform communicates events to customers. When a webhook fails silently, customers lose data and trust. Instrumenting your webhook delivery pipeline with OpenTelemetry gives you visibility into delivery success rates, retry behavior, and endpoint health across all your integrations.

## Webhook Delivery Architecture

A typical webhook pipeline has these components: an event producer, a delivery queue, a sender that makes the HTTP call, and a retry mechanism for failures. Each component needs instrumentation.

## Instrumenting the Webhook Sender

```python
# webhook_sender.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import httpx
import time
import hashlib
import hmac

tracer = trace.get_tracer("webhooks.delivery")
meter = metrics.get_meter("webhooks.delivery")

# Metrics
delivery_counter = meter.create_counter(
    "webhooks.delivery.attempts",
    description="Number of webhook delivery attempts",
    unit="1",
)

delivery_latency = meter.create_histogram(
    "webhooks.delivery.latency",
    description="Time to deliver a webhook",
    unit="ms",
)

delivery_response_size = meter.create_histogram(
    "webhooks.delivery.response_size",
    description="Size of webhook delivery responses",
    unit="bytes",
)

class WebhookSender:
    def __init__(self, http_client: httpx.AsyncClient):
        self.client = http_client

    async def deliver(self, webhook: dict) -> dict:
        """Deliver a single webhook with full tracing."""
        with tracer.start_as_current_span(
            "webhook.deliver",
            attributes={
                "webhook.id": webhook["id"],
                "webhook.event_type": webhook["event_type"],
                "webhook.endpoint_url": webhook["url"],
                "tenant.id": webhook["tenant_id"],
                "webhook.attempt": webhook.get("attempt", 1),
            }
        ) as span:
            # Sign the payload
            signature = self._sign_payload(
                webhook["payload"], webhook["signing_secret"]
            )

            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": signature,
                "X-Webhook-Id": webhook["id"],
                "X-Webhook-Timestamp": str(int(time.time())),
            }

            start = time.time()
            try:
                response = await self.client.post(
                    webhook["url"],
                    json=webhook["payload"],
                    headers=headers,
                    timeout=30.0,
                )

                duration_ms = (time.time() - start) * 1000

                span.set_attribute("http.status_code", response.status_code)
                span.set_attribute("webhook.delivery.duration_ms", duration_ms)

                # Record metrics
                success = 200 <= response.status_code < 300
                delivery_counter.add(1, {
                    "webhook.event_type": webhook["event_type"],
                    "tenant.id": webhook["tenant_id"],
                    "webhook.success": str(success),
                    "http.status_code": str(response.status_code),
                })

                delivery_latency.record(duration_ms, {
                    "webhook.event_type": webhook["event_type"],
                    "tenant.id": webhook["tenant_id"],
                })

                if not success:
                    span.set_status(StatusCode.ERROR, f"HTTP {response.status_code}")

                return {
                    "success": success,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }

            except httpx.TimeoutException as e:
                span.set_status(StatusCode.ERROR, "Timeout")
                span.record_exception(e)
                delivery_counter.add(1, {
                    "webhook.event_type": webhook["event_type"],
                    "tenant.id": webhook["tenant_id"],
                    "webhook.success": "false",
                    "webhook.error": "timeout",
                })
                return {"success": False, "error": "timeout"}

            except httpx.ConnectError as e:
                span.set_status(StatusCode.ERROR, "Connection failed")
                span.record_exception(e)
                return {"success": False, "error": "connection_failed"}

    def _sign_payload(self, payload: dict, secret: str) -> str:
        """Create HMAC signature for webhook payload."""
        import json
        body = json.dumps(payload, sort_keys=True)
        return hmac.new(
            secret.encode(), body.encode(), hashlib.sha256
        ).hexdigest()
```

## Retry Pipeline with Exponential Backoff

```python
# webhook_retry.py
from opentelemetry import trace
import asyncio

tracer = trace.get_tracer("webhooks.retry")

retry_counter = meter.create_counter(
    "webhooks.retry.scheduled",
    description="Number of webhook retries scheduled",
    unit="1",
)

dead_letter_counter = meter.create_counter(
    "webhooks.dead_letter",
    description="Webhooks that exhausted all retries",
    unit="1",
)

RETRY_DELAYS = [60, 300, 900, 3600, 7200]  # seconds between retries

class WebhookRetryManager:
    def __init__(self, sender: WebhookSender, queue):
        self.sender = sender
        self.queue = queue

    async def process_with_retries(self, webhook: dict):
        """Process a webhook with retry logic."""
        attempt = webhook.get("attempt", 1)
        max_attempts = len(RETRY_DELAYS) + 1

        with tracer.start_as_current_span(
            "webhook.retry.process",
            attributes={
                "webhook.id": webhook["id"],
                "webhook.attempt": attempt,
                "webhook.max_attempts": max_attempts,
            }
        ) as span:
            result = await self.sender.deliver(webhook)

            if result["success"]:
                span.set_attribute("webhook.final_status", "delivered")
                return

            if attempt >= max_attempts:
                # Move to dead letter queue
                span.set_attribute("webhook.final_status", "dead_letter")
                dead_letter_counter.add(1, {
                    "webhook.event_type": webhook["event_type"],
                    "tenant.id": webhook["tenant_id"],
                })
                await self._move_to_dead_letter(webhook)
                return

            # Schedule retry with backoff
            delay = RETRY_DELAYS[attempt - 1]
            span.set_attribute("webhook.retry.delay_seconds", delay)
            retry_counter.add(1, {
                "webhook.event_type": webhook["event_type"],
                "tenant.id": webhook["tenant_id"],
                "webhook.attempt": str(attempt + 1),
            })

            webhook["attempt"] = attempt + 1
            await self.queue.schedule(webhook, delay_seconds=delay)
```

## Endpoint Health Tracking

Track the health of each webhook endpoint so you can proactively disable broken ones:

```python
# endpoint_health.py
from opentelemetry import metrics

meter = metrics.get_meter("webhooks.endpoints")

endpoint_success_rate = meter.create_histogram(
    "webhooks.endpoint.success_rate",
    description="Rolling success rate per webhook endpoint",
    unit="%",
)

class EndpointHealthTracker:
    def update_health(self, endpoint_url: str, tenant_id: str, success: bool):
        """Update endpoint health and disable consistently failing endpoints."""
        stats = self._get_endpoint_stats(endpoint_url)
        stats["total"] += 1
        stats["successes"] += 1 if success else 0

        success_rate = (stats["successes"] / stats["total"]) * 100
        endpoint_success_rate.record(success_rate, {
            "webhook.endpoint_url": endpoint_url,
            "tenant.id": tenant_id,
        })

        # Auto-disable endpoints with consistently low success rates
        if stats["total"] >= 10 and success_rate < 5:
            self._disable_endpoint(endpoint_url, tenant_id)
```

## What to Monitor

The key signals from your webhook pipeline are: delivery success rate by event type, average retry count before successful delivery, dead letter queue size growth, and per-endpoint health scores. When a customer's endpoint starts failing, you want to know before they do. With OpenTelemetry traces linking each delivery attempt together, you can show customers the exact timeline of delivery attempts, response codes, and retry delays when they ask "why did I not get the webhook?"
