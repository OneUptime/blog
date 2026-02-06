# How to Instrument Coupon and Discount Code Validation Pipelines with OpenTelemetry Spans and Error Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Coupon Validation, Error Tracking

Description: Instrument coupon and discount code validation pipelines with OpenTelemetry to track errors and performance issues.

Coupon codes seem simple. The customer types a code, you validate it, and you apply a discount. In reality, coupon validation involves checking expiration dates, usage limits, product eligibility, minimum cart values, customer segment targeting, and stacking rules. When a valid coupon gets rejected, customers contact support. When an expired coupon gets accepted, you lose revenue. Both scenarios are hard to debug without proper instrumentation.

This post shows how to trace the entire coupon validation pipeline with OpenTelemetry so you can pinpoint exactly where validation fails and why.

## The Validation Pipeline

A coupon code goes through several checks before it is applied:

1. Code lookup (does this code exist?)
2. Expiration check (is it still valid?)
3. Usage limit check (has it been used too many times?)
4. Cart eligibility (does the cart meet the requirements?)
5. Customer eligibility (is this customer in the target segment?)
6. Stacking rules (can this code be combined with other discounts?)
7. Discount calculation (how much does the customer save?)

## Setting Up Instrumentation

```python
from opentelemetry import trace, metrics

tracer = trace.get_tracer("ecommerce.coupons", "1.0.0")
meter = metrics.get_meter("ecommerce.coupons", "1.0.0")

# Validation outcome counter
validation_counter = meter.create_counter(
    name="coupon.validations_total",
    description="Coupon validation attempts and results",
    unit="1"
)

# Track which validation step rejects coupons most often
rejection_counter = meter.create_counter(
    name="coupon.rejections_total",
    description="Coupon rejections by reason",
    unit="1"
)

# Validation latency
validation_latency = meter.create_histogram(
    name="coupon.validation.latency_ms",
    description="Coupon validation pipeline latency",
    unit="ms"
)

# Discount amount distribution
discount_amount = meter.create_histogram(
    name="coupon.discount_amount",
    description="Discount amounts applied",
    unit="1"
)
```

## The Validation Pipeline with Tracing

```python
import time

async def validate_coupon(code: str, cart: dict, user_id: str):
    """Validate a coupon code against the cart and user context."""
    start = time.time()

    with tracer.start_as_current_span("coupon.validate") as root_span:
        root_span.set_attribute("coupon.code", code)
        root_span.set_attribute("coupon.user_id", user_id)
        root_span.set_attribute("coupon.cart_total", cart["total"])
        root_span.set_attribute("coupon.cart_item_count", len(cart["items"]))

        # Step 1: Look up the coupon
        with tracer.start_as_current_span("coupon.lookup") as lookup_span:
            coupon = await coupon_store.find_by_code(code)
            if not coupon:
                lookup_span.set_attribute("coupon.found", False)
                root_span.set_status(trace.StatusCode.ERROR, "Code not found")
                record_rejection("code_not_found", code)
                return {"valid": False, "reason": "invalid_code"}

            lookup_span.set_attribute("coupon.found", True)
            lookup_span.set_attribute("coupon.id", coupon["id"])
            lookup_span.set_attribute("coupon.type", coupon["discount_type"])
            lookup_span.set_attribute("coupon.campaign", coupon.get("campaign", "none"))

        # Step 2: Check expiration
        with tracer.start_as_current_span("coupon.check_expiration") as exp_span:
            now = time.time()
            exp_span.set_attribute("coupon.starts_at", str(coupon["starts_at"]))
            exp_span.set_attribute("coupon.expires_at", str(coupon["expires_at"]))

            if coupon["starts_at"].timestamp() > now:
                exp_span.set_attribute("coupon.not_yet_active", True)
                record_rejection("not_yet_active", code)
                return {"valid": False, "reason": "not_yet_active"}

            if coupon["expires_at"].timestamp() < now:
                exp_span.set_attribute("coupon.expired", True)
                record_rejection("expired", code)
                return {"valid": False, "reason": "expired"}

        # Step 3: Usage limits
        with tracer.start_as_current_span("coupon.check_usage_limits") as usage_span:
            global_usage = await coupon_store.get_usage_count(coupon["id"])
            user_usage = await coupon_store.get_user_usage_count(coupon["id"], user_id)

            usage_span.set_attribute("coupon.global_usage", global_usage)
            usage_span.set_attribute("coupon.global_limit", coupon["max_uses"])
            usage_span.set_attribute("coupon.user_usage", user_usage)
            usage_span.set_attribute("coupon.per_user_limit", coupon["max_per_user"])

            if coupon["max_uses"] and global_usage >= coupon["max_uses"]:
                record_rejection("global_limit_reached", code)
                return {"valid": False, "reason": "usage_limit_reached"}

            if coupon["max_per_user"] and user_usage >= coupon["max_per_user"]:
                record_rejection("per_user_limit_reached", code)
                return {"valid": False, "reason": "already_used"}

        # Step 4: Cart eligibility
        with tracer.start_as_current_span("coupon.check_cart_eligibility") as cart_span:
            eligible, cart_reason = check_cart_eligibility(coupon, cart)
            cart_span.set_attribute("coupon.cart_eligible", eligible)
            if not eligible:
                cart_span.set_attribute("coupon.cart_rejection_reason", cart_reason)
                record_rejection(f"cart_{cart_reason}", code)
                return {"valid": False, "reason": cart_reason}

        # Step 5: Customer eligibility
        with tracer.start_as_current_span("coupon.check_customer_eligibility") as cust_span:
            if coupon.get("target_segments"):
                user_segments = await segment_service.get_user_segments(user_id)
                cust_span.set_attribute("coupon.target_segments",
                    coupon["target_segments"])
                cust_span.set_attribute("coupon.user_segments", user_segments)

                overlap = set(coupon["target_segments"]) & set(user_segments)
                if not overlap:
                    record_rejection("customer_not_in_segment", code)
                    return {"valid": False, "reason": "not_eligible"}

        # Step 6: Stacking rules
        with tracer.start_as_current_span("coupon.check_stacking") as stack_span:
            existing_discounts = cart.get("applied_discounts", [])
            stack_span.set_attribute("coupon.existing_discounts",
                len(existing_discounts))
            stack_span.set_attribute("coupon.stackable", coupon.get("stackable", False))

            if existing_discounts and not coupon.get("stackable", False):
                record_rejection("not_stackable", code)
                return {"valid": False, "reason": "cannot_combine"}

        # Step 7: Calculate the discount
        with tracer.start_as_current_span("coupon.calculate_discount") as calc_span:
            discount = calculate_discount(coupon, cart)
            calc_span.set_attribute("coupon.discount_type", coupon["discount_type"])
            calc_span.set_attribute("coupon.discount_value", discount["amount"])
            calc_span.set_attribute("coupon.discount_percentage",
                discount.get("percentage", 0))

            discount_amount.record(discount["amount"], {
                "coupon.campaign": coupon.get("campaign", "none"),
                "coupon.type": coupon["discount_type"]
            })

        # Record success
        total_ms = (time.time() - start) * 1000
        validation_latency.record(total_ms)
        validation_counter.add(1, {
            "coupon.result": "valid",
            "coupon.campaign": coupon.get("campaign", "none")
        })

        root_span.set_attribute("coupon.valid", True)
        root_span.set_attribute("coupon.discount_amount", discount["amount"])

        return {
            "valid": True,
            "discount": discount,
            "coupon_id": coupon["id"]
        }


def record_rejection(reason: str, code: str):
    """Record a coupon rejection with the reason."""
    rejection_counter.add(1, {"coupon.rejection_reason": reason})
    validation_counter.add(1, {"coupon.result": "rejected"})
```

## Helper Functions

```python
def check_cart_eligibility(coupon: dict, cart: dict) -> tuple[bool, str]:
    """Check if the cart meets the coupon requirements."""
    # Minimum cart value
    if coupon.get("min_cart_value") and cart["total"] < coupon["min_cart_value"]:
        return False, "below_minimum"

    # Required products
    if coupon.get("required_product_ids"):
        cart_product_ids = {item["product_id"] for item in cart["items"]}
        if not set(coupon["required_product_ids"]) & cart_product_ids:
            return False, "missing_required_products"

    # Excluded categories
    if coupon.get("excluded_categories"):
        cart_categories = {item.get("category") for item in cart["items"]}
        if cart_categories & set(coupon["excluded_categories"]):
            return False, "contains_excluded_category"

    return True, ""


def calculate_discount(coupon: dict, cart: dict) -> dict:
    """Calculate the discount amount based on coupon type."""
    if coupon["discount_type"] == "percentage":
        raw_discount = cart["total"] * (coupon["discount_value"] / 100)
        capped = min(raw_discount, coupon.get("max_discount", float("inf")))
        return {"amount": round(capped, 2), "percentage": coupon["discount_value"]}

    elif coupon["discount_type"] == "fixed_amount":
        return {"amount": min(coupon["discount_value"], cart["total"])}

    elif coupon["discount_type"] == "free_shipping":
        return {"amount": cart.get("shipping_cost", 0), "free_shipping": True}

    return {"amount": 0}
```

## What the Data Tells You

Once this instrumentation is running, you can answer questions like:

- **Which rejection reason is most common?** If "expired" is the top reason, your marketing team is promoting old codes. If "below_minimum" is common, customers are not seeing the minimum purchase requirement.
- **Which campaigns have the highest validation failure rate?** A campaign with 40% rejection rate probably has confusing eligibility rules.
- **How long does validation take?** If the customer eligibility check is slow because the segment service is under-provisioned, you will see it clearly in the span breakdown.
- **Are there coupon abuse patterns?** A spike in "per_user_limit_reached" rejections from specific IP ranges might indicate abuse attempts.

The combination of per-step spans and rejection reason metrics turns coupon debugging from a support ticket investigation into a dashboard glance. When a customer says "my code didn't work," you can search by the code and see exactly which validation step rejected it and why.
