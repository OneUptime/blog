# How to Monitor Open Banking API (PSD2/Open Finance) Gateway Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Open Banking, PSD2, API Gateway

Description: Monitor PSD2 and Open Finance API gateway performance with OpenTelemetry to ensure compliance with regulatory latency requirements.

Open Banking regulations like PSD2 in Europe and similar frameworks worldwide require banks to expose APIs that let third-party providers access account information and initiate payments on behalf of customers. These APIs have strict availability and performance requirements. If your gateway is slow or unreliable, you face regulatory penalties and lose third-party integrations. OpenTelemetry provides the observability foundation you need to keep these gateways performing well.

## Regulatory Performance Requirements

PSD2 requires that API responses be at least as fast as the bank's own customer-facing channels. The European Banking Authority's technical standards specify uptime and response time targets. In practice, this means your Open Banking API needs to respond in under 500ms for most requests, with 99.5% availability. You need solid metrics to prove you are meeting these targets.

## Instrumenting the API Gateway

Let's instrument an Open Banking API gateway that handles Account Information Service (AIS) and Payment Initiation Service (PIS) requests.

```python
# open_banking_gateway.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from functools import wraps
import time

tracer = trace.get_tracer("open_banking.gateway")
meter = metrics.get_meter("open_banking.gateway")

# Metrics required for PSD2 compliance reporting
request_latency = meter.create_histogram(
    "openbanking.request.duration_ms",
    description="API request duration in milliseconds",
    unit="ms"
)

request_count = meter.create_counter(
    "openbanking.request.count",
    description="Total API requests"
)

error_count = meter.create_counter(
    "openbanking.request.errors",
    description="API request errors"
)

consent_operations = meter.create_counter(
    "openbanking.consent.operations",
    description="Consent management operations"
)

# Track availability for SLA reporting
availability_check = meter.create_counter(
    "openbanking.availability.checks",
    description="Availability check results"
)
```

## Tracing Account Information Requests

The Account Information Service (AIS) lets authorized third parties retrieve account balances and transaction history. Each request must validate the TPP's (Third Party Provider) certificate, check consent, and fetch data from the core banking system.

```python
# ais_handler.py
def get_account_balances(request, tpp_context):
    with tracer.start_as_current_span("openbanking.ais.get_balances") as span:
        span.set_attribute("openbanking.api_version", "v3.1")
        span.set_attribute("openbanking.tpp_id", tpp_context.tpp_id)
        span.set_attribute("openbanking.tpp_name", tpp_context.tpp_name)
        span.set_attribute("openbanking.service_type", "AIS")
        span.set_attribute("openbanking.endpoint", "/accounts/{id}/balances")

        t0 = time.monotonic()

        # Step 1: Validate the TPP's eIDAS certificate
        with tracer.start_as_current_span("openbanking.tpp.validate_cert") as cert_span:
            cert_result = certificate_validator.validate(tpp_context.certificate)
            cert_span.set_attribute("openbanking.cert.valid", cert_result.valid)
            cert_span.set_attribute("openbanking.cert.issuer", cert_result.issuer)
            cert_span.set_attribute("openbanking.cert.roles", str(cert_result.roles))

            if not cert_result.valid:
                span.set_status(trace.StatusCode.ERROR, "Invalid TPP certificate")
                error_count.add(1, {"reason": "invalid_cert", "service": "AIS"})
                raise UnauthorizedError("Invalid TPP certificate")

        # Step 2: Verify consent
        with tracer.start_as_current_span("openbanking.consent.verify") as consent_span:
            consent = consent_store.get(request.consent_id)
            consent_span.set_attribute("openbanking.consent.id", consent.id)
            consent_span.set_attribute("openbanking.consent.status", consent.status)
            consent_span.set_attribute("openbanking.consent.permissions",
                str(consent.permissions))
            consent_span.set_attribute("openbanking.consent.expires_at",
                str(consent.expires_at))

            if consent.status != "authorised":
                span.set_status(trace.StatusCode.ERROR, "Consent not authorized")
                error_count.add(1, {"reason": "consent_invalid", "service": "AIS"})
                raise ForbiddenError("Consent not in authorised state")

            if "ReadBalances" not in consent.permissions:
                error_count.add(1, {"reason": "insufficient_permissions", "service": "AIS"})
                raise ForbiddenError("ReadBalances permission not granted")

        # Step 3: Fetch balance from core banking
        with tracer.start_as_current_span("openbanking.core.fetch_balance") as core_span:
            balance = core_banking_client.get_balance(request.account_id)
            core_span.set_attribute("openbanking.core.response_time_ms",
                balance.response_time_ms)
            core_span.set_attribute("openbanking.core.cache_hit", balance.from_cache)

        # Record the total latency
        duration_ms = (time.monotonic() - t0) * 1000
        request_latency.record(duration_ms, {
            "service": "AIS",
            "endpoint": "balances",
            "tpp_id": tpp_context.tpp_id
        })
        request_count.add(1, {"service": "AIS", "endpoint": "balances"})

        span.set_attribute("openbanking.response_time_ms", duration_ms)
        span.set_attribute("openbanking.within_sla", duration_ms < 500)

        return format_balance_response(balance)
```

## Tracing Payment Initiation

Payment Initiation Service (PIS) requests are more complex because they involve Strong Customer Authentication (SCA) and multi-step authorization flows.

```python
# pis_handler.py
def initiate_payment(request, tpp_context):
    with tracer.start_as_current_span("openbanking.pis.initiate") as span:
        span.set_attribute("openbanking.service_type", "PIS")
        span.set_attribute("openbanking.tpp_id", tpp_context.tpp_id)
        span.set_attribute("openbanking.payment_type", request.payment_type)
        span.set_attribute("openbanking.currency", request.currency)

        t0 = time.monotonic()

        # Validate TPP certificate for PIS role
        with tracer.start_as_current_span("openbanking.tpp.validate_cert"):
            cert_result = certificate_validator.validate(
                tpp_context.certificate,
                required_role="PIS"
            )
            if not cert_result.valid:
                error_count.add(1, {"reason": "invalid_cert", "service": "PIS"})
                raise UnauthorizedError("TPP not authorized for PIS")

        # Validate payment request structure
        with tracer.start_as_current_span("openbanking.pis.validate_request") as val_span:
            validation = payment_validator.validate(request)
            val_span.set_attribute("openbanking.validation.passed", validation.passed)
            if not validation.passed:
                val_span.set_attribute("openbanking.validation.errors",
                    str(validation.errors))
                error_count.add(1, {"reason": "validation_failed", "service": "PIS"})
                raise BadRequestError(validation.errors)

        # Create the payment resource
        with tracer.start_as_current_span("openbanking.pis.create_payment") as create_span:
            payment = payment_service.create(request)
            create_span.set_attribute("openbanking.payment.id", payment.id)
            create_span.set_attribute("openbanking.payment.status", "pending_auth")

        # Generate SCA challenge
        with tracer.start_as_current_span("openbanking.sca.generate") as sca_span:
            sca_challenge = sca_service.create_challenge(
                payment_id=payment.id,
                customer_id=request.debtor_account_id,
                method=request.preferred_sca_method or "redirect"
            )
            sca_span.set_attribute("openbanking.sca.method", sca_challenge.method)
            sca_span.set_attribute("openbanking.sca.challenge_id", sca_challenge.id)

        duration_ms = (time.monotonic() - t0) * 1000
        request_latency.record(duration_ms, {
            "service": "PIS",
            "endpoint": "payment_initiation",
            "tpp_id": tpp_context.tpp_id
        })
        request_count.add(1, {"service": "PIS", "endpoint": "payment_initiation"})

        span.set_attribute("openbanking.response_time_ms", duration_ms)

        return PaymentInitiationResponse(
            payment_id=payment.id,
            status="pending_auth",
            sca_redirect=sca_challenge.redirect_url
        )
```

## Monitoring Consent Lifecycle

Consent management is central to Open Banking. Every access must be backed by valid consent, and consent operations need monitoring.

```python
# consent_handler.py
def create_consent(request, tpp_context):
    with tracer.start_as_current_span("openbanking.consent.create") as span:
        span.set_attribute("openbanking.tpp_id", tpp_context.tpp_id)
        span.set_attribute("openbanking.consent.permissions",
            str(request.permissions))
        span.set_attribute("openbanking.consent.expiry_days",
            request.expiry_days)

        consent = consent_store.create(
            tpp_id=tpp_context.tpp_id,
            permissions=request.permissions,
            expiry_days=request.expiry_days
        )

        span.set_attribute("openbanking.consent.id", consent.id)
        consent_operations.add(1, {
            "operation": "create",
            "tpp_id": tpp_context.tpp_id
        })

        return consent

def revoke_consent(consent_id, reason):
    with tracer.start_as_current_span("openbanking.consent.revoke") as span:
        span.set_attribute("openbanking.consent.id", consent_id)
        span.set_attribute("openbanking.consent.revoke_reason", reason)

        consent_store.revoke(consent_id, reason)
        consent_operations.add(1, {
            "operation": "revoke",
            "reason": reason
        })
```

## SLA Compliance Dashboard

Build a dashboard from these metrics that answers the questions regulators will ask:

- **Availability**: Calculate uptime from `openbanking.request.count` and `openbanking.request.errors`. PSD2 requires your API to be at least as available as your direct customer channels.
- **Latency distribution**: Use `openbanking.request.duration_ms` to show p50, p95, and p99 response times broken down by service type (AIS vs PIS) and by TPP.
- **Error breakdown**: Track error rates by reason code (certificate failures, consent issues, core banking timeouts) to identify systemic issues.
- **TPP-level metrics**: Monitor per-TPP performance to identify third parties that are generating excessive load or unusual patterns.

The trace data complements these metrics by letting you investigate specific slow or failed requests. When a TPP reports that your API is slow, you can pull up their traces and see whether the delay was in certificate validation, consent lookup, core banking, or somewhere else in the chain. That level of detail turns a back-and-forth blame game into a quick root cause identification.
