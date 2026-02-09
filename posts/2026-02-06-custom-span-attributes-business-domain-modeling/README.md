# How to Create Custom Span Attributes for Business Domain Modeling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracing, Span Attributes, Domain Modeling, Observability, Semantic Conventions

Description: Learn how to design and implement custom span attributes that model your business domain, enabling powerful trace filtering and analysis beyond technical metrics.

---

Out-of-the-box OpenTelemetry instrumentation gives you HTTP status codes, database query durations, and RPC method names. That is useful for debugging infrastructure problems, but it tells you nothing about what your system is actually doing from a business perspective. Which customer placed the order? What product category was being browsed? Did the payment use a stored card or a new one?

Custom span attributes bridge this gap. By attaching business-specific metadata to your spans, you transform traces from purely technical artifacts into rich business observability tools. You can filter traces by customer segment, analyze latency by product category, or alert when error rates spike for a specific payment method.

## Why Default Attributes Are Not Enough

Consider a typical e-commerce trace. Auto-instrumentation gives you spans like:

```
POST /api/orders - 450ms (http.status_code=200)
  SELECT * FROM products - 12ms (db.system=postgresql)
  POST /payments/charge - 380ms (http.status_code=200)
  POST /notifications/email - 45ms (http.status_code=202)
```

You can see that the request took 450ms and the payment call was the bottleneck. But you cannot answer questions like: Was this a wholesale or retail order? Was the payment method a credit card or bank transfer? What was the order value? These questions matter far more to the business than raw latency numbers.

With custom span attributes, the same trace becomes:

```
POST /api/orders - 450ms
  order.type=wholesale, order.value=12500.00, order.item_count=150
  customer.tier=enterprise, customer.region=eu-west
  SELECT * FROM products - 12ms
    product.category=electronics, product.warehouse=eu-central
  POST /payments/charge - 380ms
    payment.method=bank_transfer, payment.currency=EUR
  POST /notifications/email - 45ms
    notification.channel=email, notification.priority=standard
```

Now you can query for all traces where `order.type=wholesale AND payment.method=bank_transfer` and see if bank transfers are consistently slow for wholesale orders. That is business observability.

## Designing an Attribute Naming Convention

Before writing any code, establish a naming convention. This matters more than you might think, because inconsistent naming makes querying painful and leads to duplicate attributes that mean the same thing.

Follow these principles:

Use dot-separated namespaces that mirror your business domain. Start with the domain entity, then the property.

```
# Good: clear hierarchy
order.type
order.value
order.item_count
customer.tier
customer.region
payment.method
payment.currency

# Bad: flat and ambiguous
type
value
method
tier
```

Align with OpenTelemetry semantic conventions where possible. OpenTelemetry already defines conventions for common domains. Use the `app.` or your organization prefix for truly custom attributes to avoid collision with future official conventions.

```python
# Standard OTel semantic conventions (use as-is)
# http.method, http.status_code, db.system, rpc.method

# Custom business attributes (use your domain prefix)
# order.type, customer.tier, payment.method

# Organization-specific attributes (use org prefix)
# acme.feature_flag, acme.experiment_id
```

Document your conventions in a shared schema. Here is a practical approach using a Python module:

```python
# attributes.py - Shared attribute definitions for the organization
# This module serves as the single source of truth for attribute names

class OrderAttributes:
    """Attributes related to order processing."""
    TYPE = "order.type"           # Values: retail, wholesale, subscription
    VALUE = "order.value"         # Decimal value in base currency
    ITEM_COUNT = "order.item_count"  # Number of line items
    CURRENCY = "order.currency"   # ISO 4217 currency code
    PRIORITY = "order.priority"   # Values: standard, express, overnight

class CustomerAttributes:
    """Attributes related to customer identification."""
    TIER = "customer.tier"        # Values: free, pro, enterprise
    REGION = "customer.region"    # Geographic region code
    SEGMENT = "customer.segment"  # Values: b2b, b2c, internal
    ACCOUNT_AGE_DAYS = "customer.account_age_days"  # Days since registration

class PaymentAttributes:
    """Attributes related to payment processing."""
    METHOD = "payment.method"     # Values: credit_card, bank_transfer, wallet
    PROVIDER = "payment.provider" # Values: stripe, adyen, paypal
    CURRENCY = "payment.currency" # ISO 4217 currency code
    RISK_SCORE = "payment.risk_score"  # 0-100 fraud risk score
```

This module gets imported by every service. When someone needs to set or query an attribute, they reference the constant rather than typing a string. Typos become import errors instead of silent bugs.

## Implementing Attributes in Python

With the naming convention established, here is how to apply attributes in your application code:

```python
from opentelemetry import trace
from attributes import OrderAttributes, CustomerAttributes, PaymentAttributes

tracer = trace.get_tracer("order-service")

def process_order(order_request, customer):
    with tracer.start_as_current_span("process_order") as span:
        # Set business context attributes on the span
        span.set_attribute(OrderAttributes.TYPE, order_request.order_type)
        span.set_attribute(OrderAttributes.VALUE, float(order_request.total))
        span.set_attribute(OrderAttributes.ITEM_COUNT, len(order_request.items))
        span.set_attribute(OrderAttributes.CURRENCY, order_request.currency)

        # Customer context
        span.set_attribute(CustomerAttributes.TIER, customer.tier)
        span.set_attribute(CustomerAttributes.REGION, customer.region)
        span.set_attribute(CustomerAttributes.SEGMENT, customer.segment)

        # Process the order
        validated_order = validate_order(order_request)
        payment_result = charge_payment(validated_order, customer)
        send_confirmation(validated_order, customer)

        return validated_order
```

For the payment span, add payment-specific attributes:

```python
def charge_payment(order, customer):
    with tracer.start_as_current_span("charge_payment") as span:
        # Payment-specific attributes
        span.set_attribute(PaymentAttributes.METHOD, order.payment_method)
        span.set_attribute(PaymentAttributes.PROVIDER, "stripe")
        span.set_attribute(PaymentAttributes.CURRENCY, order.currency)

        # Determine fraud risk
        risk_score = assess_fraud_risk(order, customer)
        span.set_attribute(PaymentAttributes.RISK_SCORE, risk_score)

        if risk_score > 80:
            # Record high-risk event on the span
            span.add_event("high_risk_payment_detected", {
                PaymentAttributes.RISK_SCORE: risk_score,
                CustomerAttributes.TIER: customer.tier,
            })

        result = stripe_client.charge(order.total, order.currency)
        return result
```

Notice how span events can also carry custom attributes. The `high_risk_payment_detected` event captures the risk score and customer tier at the exact moment the risk was assessed, giving you a precise timeline within the span.

## Implementing Attributes in Java

For Java services, the same approach works with the OpenTelemetry Java SDK:

```java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;

// Define attribute keys as typed constants
// Using typed keys gives you compile-time type safety
public class OrderAttributes {
    public static final AttributeKey<String> TYPE =
        AttributeKey.stringKey("order.type");
    public static final AttributeKey<Double> VALUE =
        AttributeKey.doubleKey("order.value");
    public static final AttributeKey<Long> ITEM_COUNT =
        AttributeKey.longKey("order.item_count");
    public static final AttributeKey<String> CURRENCY =
        AttributeKey.stringKey("order.currency");
}

public class OrderProcessor {
    private final Tracer tracer;

    public OrderProcessor(Tracer tracer) {
        this.tracer = tracer;
    }

    public Order processOrder(OrderRequest request, Customer customer) {
        Span span = tracer.spanBuilder("process_order")
            // Set attributes at span creation time
            .setAttribute(OrderAttributes.TYPE, request.getOrderType())
            .setAttribute(OrderAttributes.VALUE, request.getTotal())
            .setAttribute(OrderAttributes.ITEM_COUNT,
                (long) request.getItems().size())
            .setAttribute(OrderAttributes.CURRENCY, request.getCurrency())
            .startSpan();

        try {
            // Business logic here
            Order order = validateAndCreate(request);
            return order;
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

The `AttributeKey` typed constants in Java provide compile-time type safety. If you try to set an `order.value` attribute with a string instead of a double, the compiler catches it.

## Attribute Value Types and Cardinality

OpenTelemetry supports specific attribute value types: string, boolean, integer, floating point, and arrays of these types. Choosing the right type matters for both storage efficiency and queryability.

```python
with tracer.start_as_current_span("process_order") as span:
    # String: use for categorical values with limited cardinality
    span.set_attribute("order.type", "wholesale")

    # Integer: use for counts and discrete numeric values
    span.set_attribute("order.item_count", 150)

    # Float: use for monetary values and measurements
    span.set_attribute("order.value", 12500.00)

    # Boolean: use for binary flags
    span.set_attribute("order.is_first_order", True)

    # Array of strings: use for multi-value categorization
    span.set_attribute("order.categories", ["electronics", "accessories"])
```

Cardinality is the most important consideration when designing attributes. High-cardinality attributes (those with many unique values) are fine for trace attributes because traces are typically stored as individual records. But be mindful of attributes that might be used for metric aggregation later.

```python
# Good cardinality for both traces and metrics
span.set_attribute("order.type", "wholesale")       # ~5 unique values
span.set_attribute("customer.tier", "enterprise")    # ~4 unique values
span.set_attribute("payment.method", "credit_card")  # ~6 unique values

# Good for traces, problematic for metric aggregation
span.set_attribute("order.id", "ord-123456")         # Unique per order
span.set_attribute("customer.id", "cust-789")        # Unique per customer

# Avoid: unbounded cardinality
span.set_attribute("request.body", large_json)       # Never do this
span.set_attribute("user.query", free_text_search)   # Unbounded strings
```

## Building Helper Functions for Consistent Attribution

To keep attribute setting consistent across your codebase, create helper functions that encapsulate the logic:

```python
from opentelemetry import trace
from attributes import OrderAttributes, CustomerAttributes

def set_order_context(span, order):
    """Apply standard order attributes to a span.

    Call this function at the start of any order-related operation
    to ensure consistent business context across all traces.
    """
    span.set_attribute(OrderAttributes.TYPE, order.order_type)
    span.set_attribute(OrderAttributes.VALUE, float(order.total))
    span.set_attribute(OrderAttributes.ITEM_COUNT, len(order.items))
    span.set_attribute(OrderAttributes.CURRENCY, order.currency)
    span.set_attribute(OrderAttributes.PRIORITY, order.priority)

def set_customer_context(span, customer):
    """Apply standard customer attributes to a span."""
    span.set_attribute(CustomerAttributes.TIER, customer.tier)
    span.set_attribute(CustomerAttributes.REGION, customer.region)
    span.set_attribute(CustomerAttributes.SEGMENT, customer.segment)

    # Compute derived attributes
    age_days = (datetime.now() - customer.created_at).days
    span.set_attribute(CustomerAttributes.ACCOUNT_AGE_DAYS, age_days)

# Usage in handlers becomes clean and consistent
def handle_order_creation(order_request, customer):
    with tracer.start_as_current_span("create_order") as span:
        set_order_context(span, order_request)
        set_customer_context(span, customer)

        # Business logic...
        return create_order(order_request)
```

These helpers ensure that every order-related span gets the same set of attributes computed the same way. When you add a new attribute to the schema, you update one function and every span picks it up.

## Querying Traces by Business Attributes

Once your spans carry business attributes, you can write powerful queries in your observability backend. Here are examples of the kinds of questions you can now answer:

```
# Find all slow wholesale orders over $10,000
order.type = "wholesale" AND order.value > 10000 AND duration > 2s

# Compare latency between customer tiers
GROUP BY customer.tier
  PERCENTILE(duration, 99)
  WHERE span.name = "process_order"

# Find payment failures by method and provider
payment.method = "bank_transfer" AND status = ERROR
  GROUP BY payment.provider

# Identify high-risk payments from new accounts
payment.risk_score > 70 AND customer.account_age_days < 30
```

These queries turn your tracing system into a business intelligence tool. Instead of just debugging technical failures, you can analyze business patterns and performance characteristics across customer segments, product categories, and operational dimensions.

## Common Mistakes to Avoid

**Putting attributes on the wrong span.** Order attributes belong on the order processing span, not on the database query span inside it. Child spans inherit context from their parents, but attributes do not propagate down. Place attributes on the span that represents the business operation.

**Using attributes for high-volume data.** Span attributes are metadata, not data storage. Do not attach request bodies, response payloads, or large JSON objects as attributes. Keep attribute values short and categorical.

**Inconsistent attribute names across services.** If one service uses `customer.tier` and another uses `customerTier` and a third uses `user.level`, your queries become a mess. This is why the shared schema module matters so much.

**Forgetting to set attributes on error paths.** When an exception occurs, you still want the business context on the span. Set your business attributes before the try block or in a finally block so they are present even when the operation fails.

```python
def process_order(order, customer):
    with tracer.start_as_current_span("process_order") as span:
        # Set business context FIRST, before any logic that might fail
        set_order_context(span, order)
        set_customer_context(span, customer)

        try:
            result = execute_order(order)
            return result
        except PaymentError as e:
            # Business attributes are already on the span
            # so error analysis includes full business context
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            raise
```

## Conclusion

Custom span attributes transform OpenTelemetry traces from technical debugging tools into business observability instruments. By establishing a clear naming convention, centralizing attribute definitions in a shared schema, and using helper functions for consistent application, you create traces that answer business questions directly. The key is to think about what your team will need to query and filter by, then make sure that information lands on the right spans with the right names.
