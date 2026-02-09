# How to Trace Loyalty Program Points Calculation and Redemption with OpenTelemetry Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Loyalty Program, Points Redemption, Travel

Description: Trace loyalty program points calculation and redemption flows using OpenTelemetry span attributes for full transaction visibility.

Travel loyalty programs are complex financial systems where points have real monetary value. Every points calculation, transfer, and redemption needs to be accurate and auditable. When a frequent flyer redeems 100,000 points for a flight, the system needs to validate their balance, calculate the correct deduction (including tier bonuses and partner transfers), process the booking, and update the account. This post shows how to trace these workflows with OpenTelemetry, using span attributes to create a clear audit trail.

## Points Lifecycle

The loyalty system handles several types of transactions:

- **Earning**: Points earned from flights, hotel stays, card spending
- **Bonus calculation**: Tier multipliers, promotional bonuses, partner bonuses
- **Transfer**: Moving points between partners (airline to hotel, etc.)
- **Redemption**: Using points for flights, upgrades, merchandise
- **Expiration**: Removing expired points from accounts

Each transaction type has its own rules and needs to be traced.

## Instrumenting Points Earning

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer("loyalty.points")
meter = metrics.get_meter("loyalty.points")

points_earned = meter.create_counter(
    "loyalty.points_earned_total",
    description="Total points earned across all members",
)

points_redeemed = meter.create_counter(
    "loyalty.points_redeemed_total",
    description="Total points redeemed across all members",
)

def earn_points(member_id, activity_type, activity_details):
    """Calculate and credit points for a qualifying activity."""
    with tracer.start_as_current_span(
        "loyalty.earn_points",
        kind=SpanKind.SERVER,
        attributes={
            "loyalty.member_id": member_id,
            "loyalty.activity_type": activity_type,  # 'flight', 'hotel', 'card_spend'
            "loyalty.transaction_type": "earn",
        }
    ) as span:
        # Load member profile for tier information
        with tracer.start_as_current_span("loyalty.load_member") as member_span:
            member = load_member_profile(member_id)
            member_span.set_attribute("loyalty.tier", member.tier)
            member_span.set_attribute("loyalty.current_balance", member.points_balance)
            member_span.set_attribute("loyalty.ytd_qualifying_points", member.ytd_qualifying)

        # Calculate base points
        with tracer.start_as_current_span("loyalty.calculate_base") as base_span:
            base_points = calculate_base_points(activity_type, activity_details)
            base_span.set_attribute("loyalty.base_points", base_points)
            base_span.set_attribute("loyalty.earning_rate", get_earning_rate(activity_type))

            if activity_type == "flight":
                base_span.set_attribute("loyalty.flight_miles", activity_details.distance)
                base_span.set_attribute("loyalty.fare_class", activity_details.fare_class)
                base_span.set_attribute("loyalty.cabin", activity_details.cabin)

        # Apply tier multiplier
        with tracer.start_as_current_span("loyalty.apply_tier_bonus") as tier_span:
            multiplier = get_tier_multiplier(member.tier)
            tier_bonus = int(base_points * (multiplier - 1))
            tier_span.set_attribute("loyalty.tier_multiplier", multiplier)
            tier_span.set_attribute("loyalty.tier_bonus_points", tier_bonus)

        # Check for active promotions
        with tracer.start_as_current_span("loyalty.check_promotions") as promo_span:
            promo_bonus = check_promotional_bonuses(member_id, activity_type, activity_details)
            promo_span.set_attribute("loyalty.promo_bonus_points", promo_bonus)
            promo_span.set_attribute("loyalty.promo_applied", promo_bonus > 0)

        total_points = base_points + tier_bonus + promo_bonus

        # Credit points to account
        with tracer.start_as_current_span("loyalty.credit_points") as credit_span:
            new_balance = credit_points_to_account(member_id, total_points, {
                "activity_type": activity_type,
                "base_points": base_points,
                "tier_bonus": tier_bonus,
                "promo_bonus": promo_bonus,
            })
            credit_span.set_attribute("loyalty.new_balance", new_balance)

        # Record metrics
        points_earned.add(total_points, {
            "loyalty.activity_type": activity_type,
            "loyalty.tier": member.tier,
        })

        span.set_attribute("loyalty.total_points_earned", total_points)
        span.set_attribute("loyalty.base_points", base_points)
        span.set_attribute("loyalty.tier_bonus", tier_bonus)
        span.set_attribute("loyalty.promo_bonus", promo_bonus)
        span.set_attribute("loyalty.new_balance", new_balance)

        return {
            "total_earned": total_points,
            "new_balance": new_balance,
        }
```

## Instrumenting Points Redemption

Redemption is the most critical flow because it involves deducting value from a member's account:

```python
redemption_latency = meter.create_histogram(
    "loyalty.redemption_latency_ms",
    description="Time to process a points redemption",
    unit="ms",
)

def redeem_points(member_id, redemption_type, redemption_details):
    """Process a points redemption request."""
    with tracer.start_as_current_span(
        "loyalty.redeem_points",
        kind=SpanKind.SERVER,
        attributes={
            "loyalty.member_id": member_id,
            "loyalty.redemption_type": redemption_type,
            "loyalty.transaction_type": "redeem",
        }
    ) as span:
        import time
        start = time.time()

        # Load member and validate balance
        member = load_member_profile(member_id)
        span.set_attribute("loyalty.current_balance", member.points_balance)

        # Calculate points needed
        with tracer.start_as_current_span("loyalty.calculate_redemption_cost") as cost_span:
            points_needed = calculate_redemption_cost(redemption_type, redemption_details)
            cost_span.set_attribute("loyalty.points_needed", points_needed)

            # Check for tier discounts on redemption
            discount = get_redemption_discount(member.tier)
            discounted_cost = int(points_needed * (1 - discount))
            cost_span.set_attribute("loyalty.redemption_discount", discount)
            cost_span.set_attribute("loyalty.final_cost", discounted_cost)

        # Validate sufficient balance
        if member.points_balance < discounted_cost:
            span.set_attribute("loyalty.redemption_result", "insufficient_balance")
            span.set_attribute("loyalty.points_short", discounted_cost - member.points_balance)
            return {"status": "insufficient_balance"}

        # Debit points with distributed lock to prevent double spending
        with tracer.start_as_current_span("loyalty.debit_points") as debit_span:
            debit_result = debit_points_atomic(member_id, discounted_cost)
            debit_span.set_attribute("loyalty.debit_success", debit_result.success)
            debit_span.set_attribute("loyalty.new_balance", debit_result.new_balance)

            if not debit_result.success:
                span.set_attribute("loyalty.redemption_result", "debit_failed")
                return {"status": "debit_failed"}

        # Fulfill the redemption
        with tracer.start_as_current_span("loyalty.fulfill_redemption") as fulfill_span:
            fulfillment = fulfill_redemption(redemption_type, redemption_details, member)
            fulfill_span.set_attribute("loyalty.fulfillment_status", fulfillment.status)
            fulfill_span.set_attribute("loyalty.confirmation_code", fulfillment.confirmation)

        duration_ms = (time.time() - start) * 1000
        redemption_latency.record(duration_ms, {
            "loyalty.redemption_type": redemption_type,
        })

        points_redeemed.add(discounted_cost, {
            "loyalty.redemption_type": redemption_type,
            "loyalty.tier": member.tier,
        })

        span.set_attribute("loyalty.redemption_result", "success")
        span.set_attribute("loyalty.points_deducted", discounted_cost)
        span.set_attribute("loyalty.new_balance", debit_result.new_balance)

        return {
            "status": "success",
            "points_deducted": discounted_cost,
            "new_balance": debit_result.new_balance,
            "confirmation": fulfillment.confirmation,
        }
```

## Tracking Points Expiration

Points expiration is a batch process that runs periodically:

```python
def process_points_expiration():
    """Expire points that have passed their expiration date."""
    with tracer.start_as_current_span(
        "loyalty.expiration_batch",
        attributes={"loyalty.transaction_type": "expiration"}
    ) as span:
        expiring = find_expiring_points()
        span.set_attribute("loyalty.accounts_affected", len(expiring))

        total_expired = 0
        for record in expiring:
            with tracer.start_as_current_span(
                "loyalty.expire_member_points",
                attributes={
                    "loyalty.member_id": record.member_id,
                    "loyalty.points_expiring": record.points,
                }
            ):
                expire_points(record.member_id, record.points)
                total_expired += record.points

        span.set_attribute("loyalty.total_points_expired", total_expired)
```

## Conclusion

Tracing loyalty program transactions with OpenTelemetry span attributes creates a detailed, searchable audit trail for every points movement. By recording base points, tier bonuses, promotional multipliers, and redemption costs as span attributes, you can debug individual transaction discrepancies and monitor overall program health. This is especially valuable when members dispute their points balance or when you need to validate that tier multipliers and promotions are applying correctly.
