# How to Document Custom Semantic Conventions for Your Business Domain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, Documentation, Domain Modeling

Description: Learn how to document custom OpenTelemetry semantic conventions that capture your business domain and make telemetry data meaningful across teams.

OpenTelemetry's built-in semantic conventions cover generic infrastructure concerns like HTTP, databases, and messaging. They do not know anything about your business. If you run an e-commerce platform, there are no upstream conventions for `order.id`, `cart.item_count`, or `payment.method`. You need to define these yourself, and more importantly, you need to document them so that every team uses them consistently.

## Why Custom Conventions Matter

Without custom conventions, each team invents their own attribute names. One team uses `orderId`, another uses `order_id`, and a third uses `order.identifier`. When you try to query across services for a specific order, you need three different queries. Custom semantic conventions eliminate this fragmentation.

## Convention Document Structure

Organize your conventions by business domain, not by service. A domain like "Commerce" might span five services, and the conventions should be consistent across all of them.

```markdown
# Custom Semantic Conventions

## Version: 2.1.0
## Last Updated: 2026-02-06

### Domains
1. Commerce (orders, carts, products)
2. Payments (charges, refunds, subscriptions)
3. Identity (users, accounts, sessions)
4. Shipping (shipments, tracking, carriers)
```

## Defining an Attribute

Each attribute definition should include:

```yaml
# conventions/commerce/order.yaml

group: commerce.order
prefix: order
brief: "Attributes describing a customer order"

attributes:
  - id: order.id
    type: string
    requirement_level: required
    brief: "Unique identifier for the order"
    examples: ["ord_2kf9d8s", "ord_x8j3m1p"]
    note: "Must be the external order ID, not the database primary key"

  - id: order.status
    type: string
    requirement_level: required
    brief: "Current status of the order"
    examples: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
    note: "Must be one of the allowed values listed in examples"

  - id: order.total_amount
    type: double
    requirement_level: recommended
    brief: "Total order amount in the base currency unit"
    examples: [29.99, 149.00, 1250.50]
    note: "Always in the currency specified by order.currency. Use the smallest common denomination (e.g., dollars, not cents)"

  - id: order.currency
    type: string
    requirement_level:
      conditionally_required: "Required when order.total_amount is set"
    brief: "ISO 4217 currency code"
    examples: ["USD", "EUR", "GBP"]

  - id: order.item_count
    type: int
    requirement_level: recommended
    brief: "Number of distinct items in the order"
    examples: [1, 3, 12]
```

## Requirement Levels

Follow the same requirement levels as upstream OpenTelemetry conventions:

- **Required**: Must always be set. Missing this attribute indicates a bug.
- **Conditionally Required**: Must be set when a specific condition is met. Document the condition.
- **Recommended**: Should be set when the information is available. Omission is acceptable.
- **Optional**: Set only when it adds value to a specific debugging scenario.

These levels help teams prioritize. When instrumenting a new feature under time pressure, engineers know they must add required attributes and can skip optional ones.

## Code Examples Per Language

For each attribute group, provide usage examples in every language your organization uses:

```python
# Python example: setting order attributes on a span
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def create_order(cart, user):
    with tracer.start_as_current_span("order.create") as span:
        order = Order.from_cart(cart, user)

        # Required attributes - always set these
        span.set_attribute("order.id", order.id)
        span.set_attribute("order.status", "pending")

        # Recommended attributes - set when available
        span.set_attribute("order.total_amount", order.total)
        span.set_attribute("order.currency", order.currency)
        span.set_attribute("order.item_count", len(order.items))

        # Cross-domain reference - link to user identity conventions
        span.set_attribute("user.id", user.id)

        return order
```

```go
// Go example: setting order attributes on a span
func createOrder(ctx context.Context, cart *Cart, user *User) (*Order, error) {
    ctx, span := tracer.Start(ctx, "order.create")
    defer span.End()

    order, err := NewOrderFromCart(cart, user)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }

    // Required attributes
    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.String("order.status", "pending"),
    )

    // Recommended attributes
    span.SetAttributes(
        attribute.Float64("order.total_amount", order.Total),
        attribute.String("order.currency", order.Currency),
        attribute.Int("order.item_count", len(order.Items)),
        attribute.String("user.id", user.ID),
    )

    return order, nil
}
```

## Cross-Domain References

Document how attributes from different domains relate to each other. Orders reference users. Payments reference orders. Shipments reference orders. Make these relationships explicit:

```yaml
# Cross-domain attribute references
#
# When a span involves multiple domains, include the primary identifier
# from each related domain:
#
# order.create span:
#   - order.id (from commerce.order)
#   - user.id (from identity.user)
#
# payment.charge span:
#   - payment.id (from payments.charge)
#   - order.id (from commerce.order)
#   - user.id (from identity.user)
#
# shipment.create span:
#   - shipment.id (from shipping.shipment)
#   - order.id (from commerce.order)
```

These cross-references are what enable queries like "show me all traces related to order ord_2kf9d8s" regardless of which service generated the spans.

## Deprecation Policy

Attributes will change over time. Document your deprecation process:

1. Mark the old attribute as deprecated with a note pointing to the replacement
2. Emit both old and new attributes for one release cycle (minimum 30 days)
3. After the migration window, stop emitting the old attribute
4. Remove the old attribute from the convention document after 90 days

```yaml
# Example of a deprecated attribute
- id: order.amount
  type: double
  deprecated: "Use order.total_amount instead. Deprecated in v2.0.0, removal in v3.0.0"
  brief: "Legacy order amount field"
```

## Review and Governance

New custom conventions should go through a lightweight review process:

- Any team can propose a new attribute by submitting a PR to the conventions repository
- The observability platform team reviews for consistency and naming conflicts
- At least one consuming team (a team that will query this attribute) should approve
- Changes to required attributes need broader review since they affect all services in the domain

Keep the governance lightweight. If the process is too heavy, teams will skip it and define ad-hoc attributes instead, which defeats the entire purpose.

Document your conventions, make them easy to find, and keep them up to date. Your future self, debugging a production incident at midnight, will appreciate the consistency.
