# How to Trace Travel Insurance Quoting and Policy Issuance Workflows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Travel Insurance, Policy Issuance, Fintech

Description: Trace travel insurance quoting and policy issuance workflows with OpenTelemetry for reliable and auditable insurance operations.

Travel insurance is often purchased during the booking flow, which means the quoting and policy issuance process needs to be fast enough to not slow down the checkout. At the same time, insurance operations require accuracy and auditability since every quote involves risk assessment, regulatory compliance, and financial calculations. This post shows how to trace these workflows with OpenTelemetry.

## The Insurance Workflow

A travel insurance transaction involves:

1. Collecting trip and traveler details
2. Running risk assessment (destination risk, traveler age, trip duration)
3. Calculating premiums based on coverage options
4. Presenting quotes to the customer
5. Processing the purchase
6. Issuing the policy document
7. Sending confirmation and policy details

## Instrumenting the Quote Generation

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer("insurance.quoting")
meter = metrics.get_meter("insurance.quoting")

quote_latency = meter.create_histogram(
    "insurance.quote_latency_ms",
    description="Time to generate an insurance quote",
    unit="ms",
)

quotes_generated = meter.create_counter(
    "insurance.quotes_generated_total",
    description="Total insurance quotes generated",
)

def generate_travel_insurance_quote(trip_details, travelers, coverage_options):
    """Generate a travel insurance quote for a trip."""
    with tracer.start_as_current_span(
        "insurance.generate_quote",
        kind=SpanKind.SERVER,
        attributes={
            "insurance.destination": trip_details.destination,
            "insurance.trip_duration_days": trip_details.duration_days,
            "insurance.traveler_count": len(travelers),
            "insurance.departure_date": trip_details.departure_date,
            "insurance.trip_cost": trip_details.total_cost,
        }
    ) as span:
        import time
        start = time.time()

        # Step 1: Assess destination risk
        with tracer.start_as_current_span("insurance.assess_destination_risk") as risk_span:
            dest_risk = assess_destination_risk(trip_details.destination)
            risk_span.set_attribute("insurance.dest_risk_level", dest_risk.level)
            risk_span.set_attribute("insurance.dest_risk_score", dest_risk.score)
            risk_span.set_attribute("insurance.travel_advisory", dest_risk.advisory_level)
            risk_span.set_attribute("insurance.medical_risk", dest_risk.medical_risk)

        # Step 2: Assess traveler risk for each person
        traveler_risk_scores = []
        for i, traveler in enumerate(travelers):
            with tracer.start_as_current_span(
                f"insurance.assess_traveler_risk_{i}",
                attributes={
                    "insurance.traveler_age": traveler.age,
                    "insurance.traveler_index": i,
                }
            ) as trav_span:
                risk = assess_traveler_risk(traveler)
                trav_span.set_attribute("insurance.traveler_risk_score", risk.score)
                trav_span.set_attribute("insurance.pre_existing_conditions", risk.has_pre_existing)
                traveler_risk_scores.append(risk)

        # Step 3: Calculate premiums for each coverage level
        with tracer.start_as_current_span("insurance.calculate_premiums") as calc_span:
            quotes = []
            for coverage in coverage_options:
                premium = calculate_premium(
                    trip_details=trip_details,
                    travelers=travelers,
                    traveler_risks=traveler_risk_scores,
                    destination_risk=dest_risk,
                    coverage_level=coverage,
                )
                quotes.append({
                    "coverage_level": coverage.name,
                    "premium": premium.amount,
                    "coverage_limits": coverage.limits,
                })

            calc_span.set_attribute("insurance.quotes_count", len(quotes))
            calc_span.set_attribute("insurance.min_premium",
                                    min(q["premium"] for q in quotes))
            calc_span.set_attribute("insurance.max_premium",
                                    max(q["premium"] for q in quotes))

        # Step 4: Check regulatory compliance
        with tracer.start_as_current_span("insurance.compliance_check") as comp_span:
            compliance = check_regulatory_compliance(
                trip_details.destination, travelers, quotes
            )
            comp_span.set_attribute("insurance.compliant", compliance.passed)
            comp_span.set_attribute("insurance.jurisdiction", compliance.jurisdiction)

        latency = (time.time() - start) * 1000
        quote_latency.record(latency, {
            "insurance.destination": trip_details.destination,
        })
        quotes_generated.add(1, {
            "insurance.destination_risk": dest_risk.level,
        })

        span.set_attribute("insurance.quote_latency_ms", latency)
        return quotes
```

## Instrumenting Policy Issuance

Once a customer purchases insurance, the policy needs to be issued:

```python
policy_issuance_latency = meter.create_histogram(
    "insurance.policy_issuance_latency_ms",
    description="Time to issue a travel insurance policy",
    unit="ms",
)

def issue_policy(quote_id, payment_details, customer_info):
    """Issue a travel insurance policy after purchase."""
    with tracer.start_as_current_span(
        "insurance.issue_policy",
        kind=SpanKind.SERVER,
        attributes={
            "insurance.quote_id": quote_id,
            "insurance.customer_id": customer_info.id,
        }
    ) as span:
        start = time.time()

        # Retrieve the quote
        quote = load_quote(quote_id)
        span.set_attribute("insurance.coverage_level", quote.coverage_level)
        span.set_attribute("insurance.premium", quote.premium)

        # Process payment
        with tracer.start_as_current_span("insurance.process_payment") as pay_span:
            payment = process_insurance_payment(payment_details, quote.premium)
            pay_span.set_attribute("insurance.payment_status", payment.status)
            pay_span.set_attribute("insurance.payment_id", payment.transaction_id)

            if payment.status != "approved":
                span.set_attribute("insurance.issuance_result", "payment_failed")
                return {"status": "payment_failed"}

        # Generate policy number and document
        with tracer.start_as_current_span("insurance.generate_policy") as gen_span:
            policy = create_policy_record(quote, customer_info, payment)
            gen_span.set_attribute("insurance.policy_number", policy.number)
            gen_span.set_attribute("insurance.effective_date", policy.effective_date)
            gen_span.set_attribute("insurance.expiry_date", policy.expiry_date)

        # Generate the policy PDF
        with tracer.start_as_current_span("insurance.generate_pdf") as pdf_span:
            pdf = generate_policy_document(policy)
            pdf_span.set_attribute("insurance.pdf_size_kb", pdf.size_kb)
            pdf_span.set_attribute("insurance.pdf_pages", pdf.pages)

        # Register with the underwriter
        with tracer.start_as_current_span("insurance.register_underwriter") as uw_span:
            registration = register_with_underwriter(policy)
            uw_span.set_attribute("insurance.underwriter", registration.underwriter_name)
            uw_span.set_attribute("insurance.underwriter_ref", registration.reference)

        # Send confirmation to customer
        with tracer.start_as_current_span("insurance.send_confirmation") as notif_span:
            send_policy_email(customer_info.email, policy, pdf)
            notif_span.set_attribute("insurance.email_sent", True)

        latency = (time.time() - start) * 1000
        policy_issuance_latency.record(latency)

        span.set_attribute("insurance.issuance_result", "success")
        span.set_attribute("insurance.policy_number", policy.number)

        return {
            "status": "issued",
            "policy_number": policy.number,
            "pdf_url": pdf.download_url,
        }
```

## Tracking Claims Initiation

While not part of the booking flow, tracing claims helps complete the insurance lifecycle:

```python
def initiate_claim(policy_number, claim_type, claim_details):
    with tracer.start_as_current_span(
        "insurance.initiate_claim",
        attributes={
            "insurance.policy_number": policy_number,
            "insurance.claim_type": claim_type,
            "insurance.claim_amount": claim_details.amount,
        }
    ) as span:
        # Validate the policy is active
        policy = load_policy(policy_number)
        span.set_attribute("insurance.policy_active", policy.is_active)
        span.set_attribute("insurance.coverage_level", policy.coverage_level)

        # Check coverage for the claim type
        coverage = check_claim_coverage(policy, claim_type, claim_details.amount)
        span.set_attribute("insurance.claim_covered", coverage.covered)
        span.set_attribute("insurance.deductible", coverage.deductible)
        span.set_attribute("insurance.max_payout", coverage.max_payout)

        if coverage.covered:
            claim = create_claim_record(policy, claim_type, claim_details)
            span.set_attribute("insurance.claim_id", claim.id)

        return claim
```

## Conclusion

Tracing travel insurance quoting and policy issuance with OpenTelemetry provides the dual benefit of performance optimization and regulatory auditability. By recording risk assessment scores, premium calculations, compliance checks, and underwriter registrations as span attributes, you create a transparent record of every insurance transaction that both engineers and compliance teams can use.
