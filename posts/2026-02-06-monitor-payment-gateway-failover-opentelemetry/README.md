# How to Monitor Payment Gateway Failover (Stripe to Braintree to Adyen) with OpenTelemetry Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Payment Gateway, Failover Monitoring

Description: Monitor payment gateway failover chains across Stripe, Braintree, and Adyen with OpenTelemetry distributed tracing.

Most e-commerce platforms do not rely on a single payment gateway. They configure a failover chain: try Stripe first, fall back to Braintree if Stripe is down, then Adyen as the last resort. This redundancy keeps revenue flowing during outages, but it introduces a new observability challenge. You need to know when failovers are happening, why they are happening, and how much latency they add.

Without proper tracing, a Stripe outage that triggers failover to Braintree looks like "payments are slower today" instead of "Stripe has been returning 503s for the last 12 minutes and all traffic is hitting Braintree." OpenTelemetry distributed tracing makes the difference between these two scenarios.

## The Failover Architecture

```
Customer -> Payment Service -> Stripe (primary)
                            -> Braintree (secondary)
                            -> Adyen (tertiary)
```

Each gateway has its own SDK, error codes, and timeout behavior. The payment service wraps all three behind a unified interface.

## Instrumenting the Payment Service

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("ecommerce.payments", "1.0.0")
meter = metrics.get_meter("ecommerce.payments", "1.0.0")

# Track which gateway handled each payment
payment_attempt_counter = meter.create_counter(
    name="payment.attempts_total",
    description="Payment attempts per gateway",
    unit="1"
)

payment_failover_counter = meter.create_counter(
    name="payment.failovers_total",
    description="Number of failover events between gateways",
    unit="1"
)

payment_latency = meter.create_histogram(
    name="payment.processing_latency_ms",
    description="Payment processing latency including failovers",
    unit="ms"
)

# Define the gateway chain with priority order
GATEWAY_CHAIN = [
    {"name": "stripe", "client": StripeClient(), "timeout": 5.0},
    {"name": "braintree", "client": BraintreeClient(), "timeout": 8.0},
    {"name": "adyen", "client": AdyenClient(), "timeout": 10.0},
]
```

## The Failover Logic with Tracing

```python
async def process_payment(order_id: str, amount: float, currency: str, card_token: str):
    start = time.time()

    with tracer.start_as_current_span("payment.process") as root_span:
        root_span.set_attribute("payment.order_id", order_id)
        root_span.set_attribute("payment.amount", amount)
        root_span.set_attribute("payment.currency", currency)

        errors = []
        attempt_number = 0

        for gateway in GATEWAY_CHAIN:
            attempt_number += 1
            gw_name = gateway["name"]

            with tracer.start_as_current_span(f"payment.attempt.{gw_name}") as gw_span:
                gw_span.set_attribute("payment.gateway", gw_name)
                gw_span.set_attribute("payment.attempt_number", attempt_number)
                gw_span.set_attribute("payment.gateway_timeout", gateway["timeout"])

                payment_attempt_counter.add(1, {
                    "payment.gateway": gw_name,
                    "payment.attempt_number": attempt_number
                })

                try:
                    result = await attempt_gateway_charge(
                        gateway, order_id, amount, currency, card_token
                    )

                    # Successful charge
                    gw_span.set_attribute("payment.transaction_id", result["transaction_id"])
                    gw_span.set_attribute("payment.status", "success")
                    root_span.set_attribute("payment.final_gateway", gw_name)
                    root_span.set_attribute("payment.total_attempts", attempt_number)

                    total_ms = (time.time() - start) * 1000
                    payment_latency.record(total_ms, {"payment.gateway": gw_name})

                    return {
                        "status": "charged",
                        "gateway": gw_name,
                        "transaction_id": result["transaction_id"],
                        "attempts": attempt_number
                    }

                except GatewayTimeoutError as e:
                    gw_span.set_status(trace.StatusCode.ERROR, f"Timeout after {gateway['timeout']}s")
                    gw_span.set_attribute("payment.error_type", "timeout")
                    errors.append({"gateway": gw_name, "error": "timeout"})

                except GatewayDeclinedError as e:
                    # Card declined is not a gateway failure, do not failover
                    gw_span.set_attribute("payment.error_type", "declined")
                    gw_span.set_attribute("payment.decline_code", e.code)
                    root_span.set_attribute("payment.final_gateway", gw_name)
                    return {"status": "declined", "code": e.code, "gateway": gw_name}

                except GatewayError as e:
                    gw_span.set_status(trace.StatusCode.ERROR, str(e))
                    gw_span.set_attribute("payment.error_type", "gateway_error")
                    gw_span.set_attribute("payment.error_code", e.code)
                    errors.append({"gateway": gw_name, "error": str(e)})

                # Record the failover event
                if attempt_number < len(GATEWAY_CHAIN):
                    next_gw = GATEWAY_CHAIN[attempt_number]["name"]
                    payment_failover_counter.add(1, {
                        "payment.from_gateway": gw_name,
                        "payment.to_gateway": next_gw,
                        "payment.failover_reason": errors[-1]["error"]
                    })

        # All gateways failed
        root_span.set_status(trace.StatusCode.ERROR, "All payment gateways failed")
        root_span.set_attribute("payment.all_failed", True)
        root_span.set_attribute("payment.errors", str(errors))
        return {"status": "failed", "errors": errors}
```

## Tracing Individual Gateway Calls

Each gateway call gets detailed span attributes so you can compare performance across providers.

```python
async def attempt_gateway_charge(gateway: dict, order_id, amount, currency, card_token):
    """Attempt a charge through a single gateway with detailed tracing."""
    with tracer.start_as_current_span(f"payment.gateway_call.{gateway['name']}") as span:
        gw_start = time.time()

        try:
            result = await asyncio.wait_for(
                gateway["client"].charge(
                    amount=amount,
                    currency=currency,
                    token=card_token,
                    idempotency_key=f"{order_id}-{gateway['name']}"
                ),
                timeout=gateway["timeout"]
            )

            gw_ms = (time.time() - gw_start) * 1000
            span.set_attribute("payment.gateway_latency_ms", gw_ms)
            span.set_attribute("payment.gateway_response_code", result.get("code"))
            return result

        except asyncio.TimeoutError:
            gw_ms = (time.time() - gw_start) * 1000
            span.set_attribute("payment.gateway_latency_ms", gw_ms)
            raise GatewayTimeoutError(f"{gateway['name']} timed out after {gw_ms:.0f}ms")
```

## Collector Configuration for Payment Traces

You might want to sample payment traces at 100% since every transaction matters.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Sample all payment traces at 100%, other traces at 10%
  probabilistic_sampler:
    sampling_percentage: 10
  attributes:
    actions:
      - key: payment.card_token
        action: delete  # Never export card tokens

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, probabilistic_sampler]
      exporters: [otlp]
```

## Dashboards and Alerts

Build these panels for your payment operations dashboard:

- **Failover rate by gateway pair**: Shows "Stripe -> Braintree" failovers per minute
- **Gateway success rate**: Per-gateway success percentage, updated in real time
- **Latency comparison**: Side-by-side P95 latency for each gateway
- **Total payment failure rate**: When all three gateways fail, this is a revenue-critical alert

Set these alert thresholds:

- Failover rate exceeds 5% of total payments for 3 consecutive minutes
- Any single gateway drops below 95% success rate
- Average payment latency exceeds 4 seconds (indicates failover is happening on most requests)
- All-gateway failure rate exceeds 0.1%

The key insight is that failovers are supposed to be invisible to customers. Tracing makes them visible to engineers so you can address the root cause before the failover chain itself becomes a bottleneck.
