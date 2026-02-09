# How to Trace Subscription Billing and Invoice Generation Workflows (Stripe/Chargebee Integration) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Billing, Stripe, Chargebee

Description: Trace subscription billing workflows including Stripe and Chargebee integration using OpenTelemetry for full visibility into invoice generation.

Billing is one of those areas where bugs cost you real money. A failed invoice, a missed webhook from Stripe, or a race condition in plan upgrades can lead to revenue leakage or angry customers. Tracing your billing workflows with OpenTelemetry gives you a clear picture of what happened, when it happened, and why it broke.

## The Billing Workflow You Need to Trace

A typical SaaS billing cycle involves several steps: a subscription event triggers an invoice, the invoice is sent to the payment provider, the payment is processed, and the result is synced back to your system. Each of these steps can fail independently.

## Instrumenting Stripe Webhook Handlers

Stripe sends webhooks for events like `invoice.payment_succeeded` and `customer.subscription.updated`. Here is how to wrap your webhook handler with tracing:

```python
# billing_webhooks.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode
import stripe
import json

tracer = trace.get_tracer("billing.webhooks")

def handle_stripe_webhook(payload: bytes, sig_header: str):
    """Process incoming Stripe webhook with full tracing."""
    event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)

    with tracer.start_as_current_span(
        "stripe.webhook.process",
        attributes={
            "stripe.event.type": event["type"],
            "stripe.event.id": event["id"],
            "billing.customer_id": event["data"]["object"].get("customer", ""),
        }
    ) as span:
        if event["type"] == "invoice.payment_succeeded":
            handle_payment_success(event["data"]["object"], span)
        elif event["type"] == "invoice.payment_failed":
            handle_payment_failure(event["data"]["object"], span)
        elif event["type"] == "customer.subscription.updated":
            handle_subscription_update(event["data"]["object"], span)

def handle_payment_success(invoice: dict, parent_span):
    """Record successful payment and update tenant status."""
    with tracer.start_as_current_span("billing.payment.success") as span:
        span.set_attribute("billing.invoice_id", invoice["id"])
        span.set_attribute("billing.amount_paid", invoice["amount_paid"])
        span.set_attribute("billing.currency", invoice["currency"])
        span.set_attribute("billing.subscription_id", invoice["subscription"])

        # Update internal records
        update_tenant_billing_status(
            customer_id=invoice["customer"],
            status="active",
            last_payment=invoice["amount_paid"]
        )
```

## Tracing Invoice Generation

When your system generates invoices (either on a schedule or triggered by usage), trace the entire pipeline:

```python
# invoice_generator.py
from opentelemetry import trace
from datetime import datetime

tracer = trace.get_tracer("billing.invoices")

def generate_monthly_invoices(tenant_ids: list):
    """Generate invoices for all active tenants."""
    with tracer.start_as_current_span(
        "billing.invoices.generate_batch",
        attributes={"billing.tenant_count": len(tenant_ids)}
    ) as batch_span:
        success_count = 0
        failure_count = 0

        for tenant_id in tenant_ids:
            try:
                generate_tenant_invoice(tenant_id)
                success_count += 1
            except Exception as e:
                failure_count += 1
                # Log but continue processing other tenants

        batch_span.set_attribute("billing.invoices.success_count", success_count)
        batch_span.set_attribute("billing.invoices.failure_count", failure_count)

def generate_tenant_invoice(tenant_id: str):
    """Generate a single tenant invoice with usage calculation."""
    with tracer.start_as_current_span(
        "billing.invoice.generate",
        attributes={"tenant.id": tenant_id}
    ) as span:
        # Step 1: Calculate usage
        with tracer.start_as_current_span("billing.usage.calculate"):
            usage = calculate_usage(tenant_id)
            span.set_attribute("billing.usage.api_calls", usage["api_calls"])
            span.set_attribute("billing.usage.storage_gb", usage["storage_gb"])

        # Step 2: Apply pricing rules
        with tracer.start_as_current_span("billing.pricing.apply"):
            line_items = apply_pricing(tenant_id, usage)
            total = sum(item["amount"] for item in line_items)
            span.set_attribute("billing.invoice.total", total)

        # Step 3: Create invoice in Stripe
        with tracer.start_as_current_span("stripe.invoice.create") as stripe_span:
            stripe_invoice = stripe.Invoice.create(
                customer=get_stripe_customer_id(tenant_id),
                auto_advance=True,
            )
            stripe_span.set_attribute("stripe.invoice.id", stripe_invoice.id)

        return stripe_invoice
```

## Chargebee Integration Tracing

If you use Chargebee instead of (or alongside) Stripe, the pattern is similar:

```python
# chargebee_billing.py
import chargebee
from opentelemetry import trace

tracer = trace.get_tracer("billing.chargebee")

def create_chargebee_subscription(tenant_id: str, plan_id: str):
    """Create a subscription in Chargebee with tracing."""
    with tracer.start_as_current_span(
        "chargebee.subscription.create",
        attributes={
            "tenant.id": tenant_id,
            "billing.plan_id": plan_id,
        }
    ) as span:
        result = chargebee.Subscription.create({
            "plan_id": plan_id,
            "customer": {"id": tenant_id},
        })

        subscription = result.subscription
        span.set_attribute("chargebee.subscription.id", subscription.id)
        span.set_attribute("chargebee.subscription.status", subscription.status)
        span.set_attribute("billing.mrr_cents", subscription.mrr or 0)

        return subscription
```

## Custom Metrics for Billing Health

Beyond traces, you want metrics that give you a real-time view of billing health:

```python
# billing_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("billing.metrics")

# Track invoice generation outcomes
invoice_counter = meter.create_counter(
    "billing.invoices.generated",
    description="Number of invoices generated",
    unit="1",
)

# Track payment amounts
payment_histogram = meter.create_histogram(
    "billing.payment.amount",
    description="Distribution of payment amounts",
    unit="cents",
)

# Track webhook processing latency
webhook_latency = meter.create_histogram(
    "billing.webhook.duration",
    description="Time to process billing webhooks",
    unit="ms",
)

def record_invoice_generated(tenant_id: str, amount: int, status: str):
    invoice_counter.add(1, {
        "tenant.id": tenant_id,
        "billing.status": status,
    })
    if status == "paid":
        payment_histogram.record(amount, {"tenant.id": tenant_id})
```

## What to Alert On

With this instrumentation in place, set up alerts for the scenarios that matter most: webhook processing failures exceeding a threshold, invoice generation batch jobs taking longer than expected, and payment failure rates spiking above normal. These signals, combined with trace data, let you pinpoint exactly where a billing pipeline broke down and for which tenants.

The traces you collect here are also valuable for audit purposes. When a customer disputes a charge, you can pull up the exact trace showing how their invoice was calculated, what usage data was used, and when the charge was submitted to the payment provider.
