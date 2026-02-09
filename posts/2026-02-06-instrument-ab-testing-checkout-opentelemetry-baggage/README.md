# How to Instrument A/B Testing of Checkout Flows with OpenTelemetry Baggage for Variant Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, A/B Testing, Baggage, Checkout Optimization

Description: Use OpenTelemetry baggage to propagate A/B test variant assignments across distributed checkout services for accurate experiment analysis.

A/B testing your checkout flow is high stakes. You need to know not just which variant converts better, but whether one variant causes more errors, slower page loads, or higher payment failure rates. The challenge with distributed systems is that the variant assignment happens in one service (usually the frontend or an experiment service), but the effects ripple across payment processing, inventory reservation, fraud detection, and order creation. OpenTelemetry baggage solves this by propagating the variant assignment across all services involved in a checkout.

## What is OpenTelemetry Baggage

Baggage is a set of key-value pairs that propagates alongside trace context through service boundaries. Unlike span attributes, which are local to a single span, baggage travels with the request. When your frontend assigns a user to "checkout_v2", every downstream service can read that value and attach it to their own spans and metrics.

## Setting the Variant in Baggage

When a user enters the checkout flow, the experiment service determines their variant and sets it as baggage.

```python
from opentelemetry import baggage, trace, context
from opentelemetry.baggage.propagation import W3CBaggagePropagator

tracer = trace.get_tracer("checkout.experiment")

class ExperimentService:
    def assign_checkout_variant(self, user_id: str, session_id: str):
        """Determine which checkout variant a user should see."""
        with tracer.start_as_current_span("experiment.assign_variant") as span:
            variant = self._get_or_assign_variant(
                experiment_id="checkout_redesign_2026q1",
                user_id=user_id
            )

            span.set_attribute("experiment.id", "checkout_redesign_2026q1")
            span.set_attribute("experiment.variant", variant)
            span.set_attribute("user.id", user_id)

            # Set baggage so all downstream services receive the variant
            ctx = baggage.set_baggage(
                "experiment.checkout.variant", variant
            )
            ctx = baggage.set_baggage(
                "experiment.checkout.id", "checkout_redesign_2026q1",
                context=ctx
            )

            return variant, ctx
```

## Propagating Baggage Through HTTP Calls

Make sure your HTTP client middleware attaches baggage headers. The W3C Baggage propagator handles the serialization.

```python
import requests
from opentelemetry.context import attach, detach

class CheckoutOrchestrator:
    def process_checkout(self, user_id: str, cart: dict):
        # Step 1: Get variant assignment
        exp_service = ExperimentService()
        variant, ctx = exp_service.assign_checkout_variant(user_id, cart["session_id"])

        # Attach the context with baggage
        token = attach(ctx)
        try:
            with tracer.start_as_current_span("checkout.process") as span:
                span.set_attribute("checkout.variant", variant)

                if variant == "control":
                    result = self._classic_checkout(cart)
                elif variant == "single_page":
                    result = self._single_page_checkout(cart)
                elif variant == "express":
                    result = self._express_checkout(cart)

                return result
        finally:
            detach(token)

    def _single_page_checkout(self, cart: dict):
        """The single-page checkout variant makes parallel calls."""
        with tracer.start_as_current_span("checkout.single_page"):
            # These downstream services will all receive the baggage
            inventory = self._call_service(
                "http://inventory-svc/reserve",
                {"items": cart["items"]}
            )
            tax = self._call_service(
                "http://tax-svc/calculate",
                {"items": cart["items"], "address": cart["shipping_address"]}
            )
            fraud = self._call_service(
                "http://fraud-svc/check",
                {"user_id": cart["user_id"], "total": cart["total"]}
            )

            return self._finalize_order(cart, inventory, tax, fraud)
```

## Reading Baggage in Downstream Services

Each downstream service reads the experiment baggage and attaches it to its own telemetry. This way, you can slice metrics by variant in every service.

```python
from opentelemetry import baggage, metrics

meter = metrics.get_meter("payment.service")

payment_duration = meter.create_histogram(
    "payment.processing.duration",
    unit="ms"
)
payment_errors = meter.create_counter("payment.errors")

class PaymentService:
    def process_payment(self, payment_request: dict):
        with tracer.start_as_current_span("payment.process") as span:
            # Read experiment baggage from the propagated context
            checkout_variant = baggage.get_baggage("experiment.checkout.variant")
            experiment_id = baggage.get_baggage("experiment.checkout.id")

            # Attach to span for trace-level analysis
            if checkout_variant:
                span.set_attribute("experiment.variant", checkout_variant)
                span.set_attribute("experiment.id", experiment_id)

            start = time.time()
            try:
                result = self._charge_card(payment_request)
                duration = (time.time() - start) * 1000

                # Metric includes variant for experiment analysis
                payment_duration.record(duration, {
                    "experiment.variant": checkout_variant or "none",
                    "payment.method": payment_request["method"]
                })

                return result
            except PaymentError as e:
                payment_errors.add(1, {
                    "experiment.variant": checkout_variant or "none",
                    "error.type": type(e).__name__
                })
                raise
```

## Building the Experiment Dashboard

With variant labels on both traces and metrics across all services, you can build dashboards that compare variants on dimensions that matter.

```python
# Example queries for your observability backend

# Conversion rate by variant
CONVERSION_QUERY = """
SELECT
    attributes['experiment.variant'] as variant,
    countIf(name = 'checkout.process' AND status = 'OK') as successes,
    count(name = 'checkout.process') as attempts,
    successes / attempts as conversion_rate
FROM spans
WHERE attributes['experiment.id'] = 'checkout_redesign_2026q1'
GROUP BY variant
"""

# p95 checkout duration by variant
LATENCY_QUERY = """
SELECT
    attributes['experiment.variant'] as variant,
    quantile(0.95)(duration_ms) as p95_duration
FROM spans
WHERE name = 'checkout.process'
  AND attributes['experiment.id'] = 'checkout_redesign_2026q1'
GROUP BY variant
"""

# Payment error rate by variant
ERROR_QUERY = """
SELECT
    labels['experiment.variant'] as variant,
    sum(value) as total_errors
FROM metrics
WHERE name = 'payment.errors'
  AND labels['experiment.variant'] != 'none'
GROUP BY variant
"""
```

## Baggage Size Considerations

One thing to keep in mind: baggage travels with every request, so keep the values small. Stick to short identifiers like variant names and experiment IDs. Do not put user profiles or feature flag JSON blobs in baggage. If you are running multiple experiments simultaneously, prefix your baggage keys with the experiment name to avoid collisions.

OpenTelemetry baggage turns your distributed trace into an experiment-aware system without requiring every service to call the experiment service directly. The variant assignment flows naturally through the request path, and every service can use it for its own telemetry.
