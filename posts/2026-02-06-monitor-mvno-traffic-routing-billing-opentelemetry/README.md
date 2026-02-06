# How to Monitor MVNO Traffic Routing and Billing Mediation with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, MVNO, Billing, Traffic Routing, Telecommunications

Description: Monitor MVNO traffic routing decisions and billing mediation pipelines with OpenTelemetry for revenue assurance and SLA compliance.

Mobile Virtual Network Operators (MVNOs) rely on host network operators (MNOs) for radio access but handle their own traffic routing, rating, and billing. When traffic routing goes wrong, subscribers experience service issues. When billing mediation fails, revenue leaks. OpenTelemetry can give you full visibility into both of these critical systems.

## MVNO Architecture Overview

An MVNO typically operates:

- **Traffic routing engine**: Decides which MNO partner to route traffic through based on cost, quality, and coverage
- **Mediation platform**: Collects usage records from MNO partners, normalizes them, and feeds them to the billing system
- **Rating engine**: Applies tariff plans to usage records to calculate charges
- **Interconnect gateway**: Handles the signaling and data plane connection to MNO partners

## Instrumenting the Traffic Routing Engine

```python
# mvno_routing.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import time

tracer = trace.get_tracer("mvno.routing")
meter = metrics.get_meter("mvno.routing")

# Track routing decisions
routing_decision_counter = meter.create_counter(
    "mvno.routing.decisions",
    description="Number of routing decisions by MNO partner and reason",
    unit="{decision}",
)

routing_latency = meter.create_histogram(
    "mvno.routing.decision_latency",
    description="Time to make a routing decision",
    unit="ms",
)

# Track traffic volume by MNO partner
traffic_volume = meter.create_counter(
    "mvno.traffic.volume",
    description="Data volume routed through each MNO partner",
    unit="By",
)

# Track routing failures
routing_failures = meter.create_counter(
    "mvno.routing.failures",
    description="Failed routing attempts",
    unit="{failure}",
)


def route_subscriber_traffic(subscriber_id: str, imsi: str,
                              location: dict, service_type: str):
    """Determine which MNO partner should handle this subscriber's traffic."""

    with tracer.start_as_current_span("mvno.routing.decide") as span:
        start = time.time()

        span.set_attributes({
            "mvno.subscriber_id": subscriber_id,
            "mvno.imsi_prefix": imsi[:6],  # MCC+MNC portion only
            "mvno.location.mcc": location["mcc"],
            "mvno.location.lac": location["lac"],
            "mvno.service_type": service_type,
        })

        # Step 1: Check subscriber's plan for preferred networks
        with tracer.start_as_current_span("mvno.routing.check_plan") as plan_span:
            plan = get_subscriber_plan(subscriber_id)
            plan_span.set_attribute("mvno.plan.name", plan.name)
            plan_span.set_attribute("mvno.plan.preferred_mno", plan.preferred_mno)

        # Step 2: Check MNO partner availability and quality at this location
        with tracer.start_as_current_span("mvno.routing.check_partners") as partner_span:
            available_partners = []
            for mno in get_mno_partners():
                coverage = check_coverage(mno, location)
                quality = get_quality_score(mno, location)
                cost = get_routing_cost(mno, service_type)

                partner_span.add_event(f"mno.{mno.id}.evaluated", {
                    "mno.id": mno.id,
                    "mno.coverage": coverage,
                    "mno.quality_score": quality,
                    "mno.cost_per_mb": cost,
                })

                if coverage:
                    available_partners.append({
                        "mno": mno,
                        "quality": quality,
                        "cost": cost,
                    })

            partner_span.set_attribute(
                "mvno.available_partners",
                len(available_partners)
            )

        # Step 3: Apply routing policy
        with tracer.start_as_current_span("mvno.routing.apply_policy") as policy_span:
            if not available_partners:
                routing_failures.add(1, {
                    "reason": "no_coverage",
                    "location_mcc": location["mcc"],
                })
                span.set_status(StatusCode.ERROR, "No MNO partner with coverage")
                return None

            # Sort by policy: prefer quality for voice, prefer cost for data
            if service_type == "voice":
                selected = max(available_partners, key=lambda p: p["quality"])
                reason = "best_quality"
            else:
                selected = min(available_partners, key=lambda p: p["cost"])
                reason = "lowest_cost"

            policy_span.set_attributes({
                "mvno.selected_mno": selected["mno"].id,
                "mvno.routing_reason": reason,
                "mvno.selected_cost": selected["cost"],
                "mvno.selected_quality": selected["quality"],
            })

        # Record the decision
        elapsed = (time.time() - start) * 1000
        routing_latency.record(elapsed)
        routing_decision_counter.add(1, {
            "mno": selected["mno"].id,
            "reason": reason,
            "service_type": service_type,
        })

        return selected["mno"]
```

## Instrumenting the Billing Mediation Pipeline

```python
# mvno_mediation.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("mvno.mediation")
meter = metrics.get_meter("mvno.mediation")

# Track CDR processing
cdr_processed = meter.create_counter(
    "mvno.mediation.cdr.processed",
    description="Number of CDRs processed through mediation",
    unit="{cdr}",
)

cdr_rejected = meter.create_counter(
    "mvno.mediation.cdr.rejected",
    description="Number of CDRs rejected during mediation",
    unit="{cdr}",
)

mediation_latency = meter.create_histogram(
    "mvno.mediation.processing_latency",
    description="Time to process a batch of CDRs through mediation",
    unit="ms",
)

# Revenue tracking
rated_revenue = meter.create_counter(
    "mvno.mediation.revenue.rated",
    description="Total rated revenue from processed CDRs",
    unit="{currency_unit}",
)

# MNO cost tracking
mno_cost = meter.create_counter(
    "mvno.mediation.cost.mno",
    description="Total cost charged by MNO partners",
    unit="{currency_unit}",
)


def process_cdr_batch(batch_id: str, cdrs: list, mno_source: str):
    """Process a batch of CDRs received from an MNO partner."""

    with tracer.start_as_current_span("mvno.mediation.process_batch") as span:
        span.set_attributes({
            "mvno.batch_id": batch_id,
            "mvno.mno_source": mno_source,
            "mvno.batch_size": len(cdrs),
        })

        processed = 0
        rejected = 0
        total_revenue = 0.0
        total_cost = 0.0

        for cdr in cdrs:
            # Normalize the CDR format (each MNO has different formats)
            with tracer.start_as_current_span("mvno.mediation.normalize") as norm_span:
                normalized = normalize_cdr(cdr, mno_source)
                if not normalized:
                    norm_span.set_status(StatusCode.ERROR, "Normalization failed")
                    rejected += 1
                    cdr_rejected.add(1, {
                        "mno": mno_source,
                        "reason": "normalization",
                    })
                    continue

            # Validate: check for duplicates, missing fields, out-of-range values
            with tracer.start_as_current_span("mvno.mediation.validate") as val_span:
                validation = validate_cdr(normalized)
                if not validation.is_valid:
                    val_span.set_status(StatusCode.ERROR, validation.reason)
                    rejected += 1
                    cdr_rejected.add(1, {
                        "mno": mno_source,
                        "reason": validation.reason,
                    })
                    continue

            # Rate the CDR using the subscriber's tariff plan
            with tracer.start_as_current_span("mvno.mediation.rate") as rate_span:
                rated = rate_cdr(normalized)
                rate_span.set_attributes({
                    "mvno.rated_amount": rated.subscriber_charge,
                    "mvno.mno_cost": rated.mno_cost,
                    "mvno.margin": rated.subscriber_charge - rated.mno_cost,
                })
                total_revenue += rated.subscriber_charge
                total_cost += rated.mno_cost

            processed += 1

        # Record batch-level metrics
        cdr_processed.add(processed, {"mno": mno_source})
        rated_revenue.add(total_revenue, {"mno": mno_source})
        mno_cost.add(total_cost, {"mno": mno_source})

        span.set_attributes({
            "mvno.batch.processed": processed,
            "mvno.batch.rejected": rejected,
            "mvno.batch.total_revenue": total_revenue,
            "mvno.batch.total_cost": total_cost,
        })
```

## Key Alerts for MVNO Operations

- **Routing failure rate above 1%**: Subscribers are being denied service.
- **CDR rejection rate above 3%**: Revenue leakage risk. Check normalization rules for the affected MNO.
- **Margin per CDR drops below threshold**: Could indicate an MNO partner price increase that was not reflected in tariff plans.
- **Mediation pipeline lag exceeds 1 hour**: Delayed CDR processing means delayed billing and delayed fraud detection.
- **Traffic shift between MNO partners**: If one MNO suddenly gets more traffic, check whether a routing policy change happened or if another partner's coverage degraded.

## Revenue Assurance with OpenTelemetry

The combination of routing and mediation telemetry gives you a revenue assurance capability. You can reconcile the traffic you routed to each MNO partner against the CDRs you received back. If there is a discrepancy, either CDRs are being lost (revenue leakage from the MNO's side) or traffic is being misrouted. OpenTelemetry traces let you track a specific session from the routing decision all the way through to the rated CDR, giving you an audit trail for dispute resolution with MNO partners.
