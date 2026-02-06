# How to Instrument KYC (Know Your Customer) Verification Workflows with OpenTelemetry for Compliance Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, KYC, Know Your Customer, Compliance Tracking

Description: Instrument KYC verification workflows with OpenTelemetry to track compliance, measure processing times, and identify verification bottlenecks.

Know Your Customer (KYC) verification is a regulatory requirement for financial institutions. Every new customer must be verified before they can open accounts or transact. The KYC process involves identity document verification, address validation, sanctions screening, and risk assessment. When this process is slow, customers abandon onboarding. When it fails silently, you risk onboarding bad actors. OpenTelemetry instrumentation gives you the visibility to keep KYC fast, reliable, and compliant.

## The KYC Verification Pipeline

A typical KYC workflow consists of:

1. **Document Collection** - Customer uploads identity documents
2. **Document Verification** - OCR extraction and authenticity checks
3. **Identity Matching** - Cross-reference extracted data with submitted information
4. **Address Verification** - Validate the customer's address
5. **Sanctions/PEP Screening** - Check against watchlists
6. **Risk Scoring** - Assign a risk category
7. **Decision** - Approve, reject, or escalate for manual review

## Setting Up KYC Observability

```python
# kyc_observability.py
from opentelemetry import trace, metrics

tracer = trace.get_tracer("kyc.verification")
meter = metrics.get_meter("kyc.verification")

# Core KYC metrics
kyc_duration = meter.create_histogram(
    "kyc.verification.duration_seconds",
    description="Total KYC verification duration",
    unit="seconds"
)

kyc_stage_duration = meter.create_histogram(
    "kyc.stage.duration_ms",
    description="Duration of individual KYC verification stages",
    unit="ms"
)

kyc_outcomes = meter.create_counter(
    "kyc.verification.outcomes",
    description="KYC verification outcomes"
)

kyc_document_types = meter.create_counter(
    "kyc.documents.processed",
    description="Documents processed by type"
)

kyc_vendor_calls = meter.create_counter(
    "kyc.vendor.calls",
    description="Calls to third-party verification vendors"
)

kyc_vendor_latency = meter.create_histogram(
    "kyc.vendor.latency_ms",
    description="Third-party vendor response latency",
    unit="ms"
)
```

## Tracing Document Verification

Document verification typically involves OCR to extract data and machine learning models to detect fraud or forgery.

```python
# kyc_document_verification.py
def verify_document(customer_id: str, document):
    with tracer.start_as_current_span("kyc.document.verify") as span:
        span.set_attribute("kyc.customer_id", customer_id)
        span.set_attribute("kyc.document.type", document.type)
        span.set_attribute("kyc.document.country", document.issuing_country)

        t0 = time.monotonic()

        # Step 1: Run OCR to extract document data
        with tracer.start_as_current_span("kyc.document.ocr") as ocr_span:
            ocr_t0 = time.monotonic()
            ocr_result = ocr_service.extract(document.image)
            ocr_duration = (time.monotonic() - ocr_t0) * 1000

            ocr_span.set_attribute("kyc.ocr.confidence", ocr_result.confidence)
            ocr_span.set_attribute("kyc.ocr.fields_extracted", len(ocr_result.fields))
            ocr_span.set_attribute("kyc.ocr.vendor", ocr_service.vendor_name)

            kyc_vendor_latency.record(ocr_duration, {
                "vendor": ocr_service.vendor_name,
                "operation": "ocr"
            })
            kyc_vendor_calls.add(1, {"vendor": ocr_service.vendor_name, "operation": "ocr"})

        # Step 2: Check document authenticity
        with tracer.start_as_current_span("kyc.document.authenticity") as auth_span:
            auth_t0 = time.monotonic()
            authenticity = fraud_detection.check_document(document.image, ocr_result)
            auth_duration = (time.monotonic() - auth_t0) * 1000

            auth_span.set_attribute("kyc.authenticity.score", authenticity.score)
            auth_span.set_attribute("kyc.authenticity.checks_passed",
                str(authenticity.checks_passed))
            auth_span.set_attribute("kyc.authenticity.checks_failed",
                str(authenticity.checks_failed))
            auth_span.set_attribute("kyc.authenticity.is_authentic",
                authenticity.score > 0.8)

            kyc_stage_duration.record(auth_duration, {"stage": "authenticity_check"})

        # Step 3: Check document expiry
        with tracer.start_as_current_span("kyc.document.expiry_check") as expiry_span:
            is_expired = ocr_result.expiry_date < datetime.now()
            expiry_span.set_attribute("kyc.document.expired", is_expired)
            expiry_span.set_attribute("kyc.document.expiry_date",
                str(ocr_result.expiry_date))

        total_duration = (time.monotonic() - t0) * 1000
        kyc_stage_duration.record(total_duration, {"stage": "document_verification"})
        kyc_document_types.add(1, {
            "type": document.type,
            "country": document.issuing_country
        })

        span.set_attribute("kyc.document.verified",
            authenticity.score > 0.8 and not is_expired)

        return DocumentVerificationResult(
            ocr_data=ocr_result,
            authenticity=authenticity,
            expired=is_expired
        )
```

## Tracing Identity Matching

After extracting document data, we match it against the information the customer provided during onboarding.

```python
# kyc_identity_matching.py
def match_identity(customer_data, document_data):
    with tracer.start_as_current_span("kyc.identity.match") as span:
        matches = {}

        # Name matching with fuzzy comparison
        with tracer.start_as_current_span("kyc.identity.match_name") as name_span:
            name_score = fuzzy_match(
                customer_data.full_name,
                document_data.extracted_name
            )
            name_span.set_attribute("kyc.match.name_score", name_score)
            matches["name"] = name_score > 0.85

        # Date of birth matching
        with tracer.start_as_current_span("kyc.identity.match_dob") as dob_span:
            dob_match = customer_data.date_of_birth == document_data.date_of_birth
            dob_span.set_attribute("kyc.match.dob_match", dob_match)
            matches["dob"] = dob_match

        # Document number verification
        with tracer.start_as_current_span("kyc.identity.verify_doc_number") as doc_span:
            doc_valid = document_registry.verify(
                document_data.document_number,
                document_data.issuing_country
            )
            doc_span.set_attribute("kyc.match.doc_number_valid", doc_valid)
            matches["document_number"] = doc_valid

        overall_match = all(matches.values())
        span.set_attribute("kyc.identity.overall_match", overall_match)
        span.set_attribute("kyc.identity.match_details", str(matches))

        return IdentityMatchResult(matches=matches, overall_match=overall_match)
```

## Tracing Address Verification

```python
# kyc_address_verification.py
def verify_address(customer_id: str, address):
    with tracer.start_as_current_span("kyc.address.verify") as span:
        span.set_attribute("kyc.address.country", address.country)
        span.set_attribute("kyc.address.verification_method", "multi_source")

        results = []

        # Check against postal database
        with tracer.start_as_current_span("kyc.address.postal_check") as postal_span:
            postal_t0 = time.monotonic()
            postal_result = postal_service.validate(address)
            postal_duration = (time.monotonic() - postal_t0) * 1000

            postal_span.set_attribute("kyc.address.postal_valid", postal_result.valid)
            postal_span.set_attribute("kyc.address.postal_normalized",
                postal_result.normalized_address)

            kyc_vendor_latency.record(postal_duration, {
                "vendor": "postal_service",
                "operation": "address_validation"
            })
            results.append(postal_result)

        # Check against credit bureau address file
        with tracer.start_as_current_span("kyc.address.bureau_check") as bureau_span:
            bureau_t0 = time.monotonic()
            bureau_result = credit_bureau.verify_address(customer_id, address)
            bureau_duration = (time.monotonic() - bureau_t0) * 1000

            bureau_span.set_attribute("kyc.address.bureau_match", bureau_result.match)
            bureau_span.set_attribute("kyc.address.bureau_confidence",
                bureau_result.confidence)

            kyc_vendor_latency.record(bureau_duration, {
                "vendor": "credit_bureau",
                "operation": "address_verification"
            })
            results.append(bureau_result)

        verified = any(r.valid or r.match for r in results)
        span.set_attribute("kyc.address.verified", verified)

        return AddressVerificationResult(verified=verified, sources=results)
```

## The Full KYC Orchestration

Putting it all together, the KYC orchestrator runs all verification steps and makes a decision.

```python
# kyc_orchestrator.py
def run_kyc_verification(customer_id: str, onboarding_data):
    with tracer.start_as_current_span("kyc.verification.full") as root_span:
        root_span.set_attribute("kyc.customer_id", customer_id)
        root_span.set_attribute("kyc.channel", onboarding_data.channel)
        root_span.set_attribute("kyc.product", onboarding_data.product_type)

        start = time.monotonic()

        # Run all verification steps
        doc_result = verify_document(customer_id, onboarding_data.document)
        identity_result = match_identity(onboarding_data, doc_result.ocr_data)
        address_result = verify_address(customer_id, onboarding_data.address)

        # Run sanctions screening
        with tracer.start_as_current_span("kyc.sanctions.screen") as sanctions_span:
            sanctions_result = sanctions_service.screen(onboarding_data)
            sanctions_span.set_attribute("kyc.sanctions.hits", sanctions_result.hit_count)
            sanctions_span.set_attribute("kyc.sanctions.clear", sanctions_result.is_clear)

        # Calculate risk score
        with tracer.start_as_current_span("kyc.risk.score") as risk_span:
            risk_score = risk_engine.calculate(
                doc_result, identity_result, address_result, sanctions_result
            )
            risk_span.set_attribute("kyc.risk.score", risk_score.value)
            risk_span.set_attribute("kyc.risk.category", risk_score.category)

        # Make decision
        decision = make_decision(doc_result, identity_result, address_result,
                                  sanctions_result, risk_score)

        duration = time.monotonic() - start
        kyc_duration.record(duration, {
            "channel": onboarding_data.channel,
            "product": onboarding_data.product_type,
            "outcome": decision.outcome
        })
        kyc_outcomes.add(1, {"outcome": decision.outcome})

        root_span.set_attribute("kyc.decision", decision.outcome)
        root_span.set_attribute("kyc.duration_seconds", duration)

        return decision
```

## Compliance Reporting From Telemetry

The metrics and traces you collect feed directly into compliance reporting. You can report on average KYC completion times (regulators want this to be reasonable so you are not discouraging customers), rejection rates by reason, the percentage of cases escalated for manual review, and vendor reliability. The trace data provides an audit trail showing every step taken for each customer verification, which is exactly what examiners ask for during regulatory audits.

Track `kyc.vendor.latency_ms` closely. Third-party vendor performance is often the biggest variable in your KYC pipeline. When a vendor degrades, your entire onboarding flow slows down. Having historical latency data lets you hold vendors accountable to their SLAs and make informed decisions about when to switch providers.
