# How to Monitor Payment Card Tokenization and Detokenization Service Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Payment Tokenization, PCI DSS, Service Performance

Description: Monitor payment card tokenization and detokenization service performance and reliability using OpenTelemetry metrics and tracing.

Payment card tokenization replaces sensitive card numbers (PANs) with non-sensitive tokens that are useless to attackers. This process sits in the critical path of every card transaction, so its performance directly affects payment success rates and customer experience. Detokenization, the reverse process, is equally critical when you need the real PAN for settlement or dispute resolution. This post covers how to monitor both services with OpenTelemetry.

## Why Tokenization Performance Matters

Every time a customer saves a card or makes a payment, the tokenization service is called. If it is slow, checkout times increase. If it is down, no new cards can be stored and recurring payments fail. The detokenization service is called during settlement, refunds, and chargeback processing. Both services must be fast, reliable, and auditable since they fall under PCI DSS scope.

## Setting Up Instrumentation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanExporter(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=5000
)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

tracer = trace.get_tracer("tokenization-service")
meter = metrics.get_meter("tokenization-service")
```

## Instrumenting the Tokenization Service

```python
import time
import hashlib

# Tokenization metrics
tokenize_latency = meter.create_histogram(
    name="tokenization.latency_ms",
    description="Latency of tokenization requests",
    unit="ms"
)

tokenize_counter = meter.create_counter(
    name="tokenization.requests_total",
    description="Total tokenization requests by outcome"
)

token_cache_hits = meter.create_counter(
    name="tokenization.cache_hits_total",
    description="Number of times a token was served from cache"
)

# Track HSM (Hardware Security Module) interaction times separately
# since the HSM is often the bottleneck
hsm_latency = meter.create_histogram(
    name="tokenization.hsm_latency_ms",
    description="Latency of HSM encrypt/decrypt operations",
    unit="ms"
)

hsm_errors = meter.create_counter(
    name="tokenization.hsm_errors_total",
    description="HSM operation errors by type"
)

class TokenizationService:
    def __init__(self, hsm_client, token_store, cache):
        self.hsm = hsm_client
        self.store = token_store
        self.cache = cache

    def tokenize(self, pan, merchant_id, token_requestor):
        """Tokenize a payment card number (PAN)."""
        with tracer.start_as_current_span("tokenization.tokenize") as span:
            start = time.monotonic()

            # IMPORTANT: Never log or set the actual PAN as a span attribute.
            # Use a hash for correlation without exposing cardholder data.
            pan_hash = hashlib.sha256(pan.encode()).hexdigest()[:16]
            span.set_attribute("pan.hash", pan_hash)
            span.set_attribute("token_requestor", token_requestor)
            span.set_attribute("merchant.id", merchant_id)

            # Check if this PAN is already tokenized for this merchant
            with tracer.start_as_current_span("tokenization.cache_lookup"):
                cache_key = f"{pan_hash}:{merchant_id}"
                cached_token = self.cache.get(cache_key)
                if cached_token:
                    token_cache_hits.add(1, {"requestor": token_requestor})
                    elapsed = (time.monotonic() - start) * 1000
                    tokenize_latency.record(elapsed, {
                        "operation": "tokenize",
                        "cache_hit": True,
                    })
                    tokenize_counter.add(1, {"outcome": "cache_hit"})
                    return cached_token

            # Generate a new token via the HSM
            with tracer.start_as_current_span("tokenization.hsm_encrypt") as hsm_span:
                hsm_start = time.monotonic()
                try:
                    encrypted_pan = self.hsm.encrypt(pan)
                    hsm_elapsed = (time.monotonic() - hsm_start) * 1000
                    hsm_latency.record(hsm_elapsed, {"operation": "encrypt"})
                    hsm_span.set_attribute("hsm.latency_ms", hsm_elapsed)
                except Exception as e:
                    hsm_errors.add(1, {
                        "operation": "encrypt",
                        "error_type": type(e).__name__,
                    })
                    tokenize_counter.add(1, {"outcome": "hsm_error"})
                    raise

            # Generate the token value (format-preserving, passes Luhn check)
            with tracer.start_as_current_span("tokenization.generate_token"):
                token = generate_format_preserving_token(pan)

            # Store the mapping
            with tracer.start_as_current_span("tokenization.store") as store_span:
                self.store.save_mapping(
                    token=token,
                    encrypted_pan=encrypted_pan,
                    merchant_id=merchant_id,
                    token_requestor=token_requestor
                )
                store_span.set_attribute("store.operation", "insert")

            # Update cache
            self.cache.set(cache_key, token, ttl=3600)

            elapsed = (time.monotonic() - start) * 1000
            tokenize_latency.record(elapsed, {
                "operation": "tokenize",
                "cache_hit": False,
            })
            tokenize_counter.add(1, {"outcome": "success"})
            span.set_attribute("tokenization.latency_ms", elapsed)

            return token
```

## Instrumenting the Detokenization Service

Detokenization is the reverse: given a token, retrieve the original PAN. This is typically restricted to specific use cases like settlement processing.

```python
    def detokenize(self, token, purpose, requesting_service):
        """Retrieve the original PAN for a given token."""
        with tracer.start_as_current_span("tokenization.detokenize") as span:
            start = time.monotonic()
            span.set_attribute("token.hash", hashlib.sha256(token.encode()).hexdigest()[:16])
            span.set_attribute("detokenize.purpose", purpose)
            span.set_attribute("detokenize.requesting_service", requesting_service)

            # Validate that this service is authorized to detokenize
            with tracer.start_as_current_span("tokenization.auth_check") as auth_span:
                authorized = check_detokenize_authorization(requesting_service, purpose)
                auth_span.set_attribute("auth.authorized", authorized)
                if not authorized:
                    tokenize_counter.add(1, {"outcome": "unauthorized"})
                    span.set_status(trace.StatusCode.ERROR, "Unauthorized detokenization")
                    raise PermissionError(
                        f"Service {requesting_service} not authorized for {purpose}"
                    )

            # Look up the encrypted PAN from the token store
            with tracer.start_as_current_span("tokenization.store_lookup") as lookup_span:
                mapping = self.store.get_mapping(token)
                if not mapping:
                    tokenize_counter.add(1, {"outcome": "token_not_found"})
                    lookup_span.set_attribute("store.found", False)
                    raise ValueError("Token not found")
                lookup_span.set_attribute("store.found", True)

            # Decrypt via HSM
            with tracer.start_as_current_span("tokenization.hsm_decrypt") as hsm_span:
                hsm_start = time.monotonic()
                try:
                    pan = self.hsm.decrypt(mapping.encrypted_pan)
                    hsm_elapsed = (time.monotonic() - hsm_start) * 1000
                    hsm_latency.record(hsm_elapsed, {"operation": "decrypt"})
                    hsm_span.set_attribute("hsm.latency_ms", hsm_elapsed)
                except Exception as e:
                    hsm_errors.add(1, {
                        "operation": "decrypt",
                        "error_type": type(e).__name__,
                    })
                    tokenize_counter.add(1, {"outcome": "hsm_decrypt_error"})
                    raise

            elapsed = (time.monotonic() - start) * 1000
            tokenize_latency.record(elapsed, {"operation": "detokenize"})
            tokenize_counter.add(1, {"outcome": "success"})

            # Record the access for audit purposes
            record_detokenize_audit_log(token, purpose, requesting_service)

            return pan
```

## Monitoring HSM Health

The HSM is the most critical dependency. If it goes down, both tokenization and detokenization stop. Monitor its availability and queue depth.

```python
# Observable gauges for HSM connection pool
meter.create_observable_gauge(
    name="tokenization.hsm_connections_active",
    description="Number of active HSM connections",
    callbacks=[lambda options: [
        metrics.Observation(get_hsm_active_connections())
    ]]
)

meter.create_observable_gauge(
    name="tokenization.hsm_connections_idle",
    description="Number of idle HSM connections in the pool",
    callbacks=[lambda options: [
        metrics.Observation(get_hsm_idle_connections())
    ]]
)

meter.create_observable_gauge(
    name="tokenization.hsm_queue_depth",
    description="Number of operations waiting for an HSM connection",
    callbacks=[lambda options: [
        metrics.Observation(get_hsm_queue_depth())
    ]]
)
```

## Key Alerts

For tokenization services, you should set up alerts for:

- **Tokenization p99 latency** above 20ms, since this is in the checkout path
- **HSM error rate** above 0.1%, because any HSM issues are severe
- **Detokenization authorization failures** which could indicate a security incident
- **HSM queue depth** growing, which signals you are running out of HSM capacity
- **Cache hit rate** dropping below your baseline, suggesting cache eviction issues

## Conclusion

Tokenization services are both performance-critical and security-critical. OpenTelemetry lets you instrument them thoroughly without ever logging sensitive cardholder data. By tracking latency breakdowns across cache lookups, HSM operations, and store interactions, you can pinpoint exactly where slowdowns occur. The audit trail from traces also helps during PCI DSS assessments, where you need to demonstrate that access to cardholder data is monitored and controlled.
