# How to Monitor Fraud Detection Model Inference Latency in Real-Time Payment Systems with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fraud Detection, Machine Learning, Real-Time Payments

Description: Monitor fraud detection model inference latency in real-time payment systems using OpenTelemetry metrics and distributed tracing.

In real-time payment systems, fraud detection models must return a decision within milliseconds. If the model takes too long, either the payment times out or you skip the fraud check entirely, both of which are unacceptable. This post walks through how to instrument your fraud detection inference pipeline with OpenTelemetry so you can monitor latency, track model performance, and detect degradation before it impacts transactions.

## The Fraud Detection Pipeline

A typical real-time fraud detection flow during payment authorization looks like this:

1. Payment request arrives
2. Feature extraction (pull account history, device fingerprint, etc.)
3. Model inference (run the ML model)
4. Post-processing (apply business rules to the model score)
5. Decision returned (approve, decline, or step-up authentication)

Each step contributes to the total latency budget, which for real-time payments is usually 50-200ms total.

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

tracer = trace.get_tracer("fraud-detection")
meter = metrics.get_meter("fraud-detection")
```

## Instrumenting Feature Extraction

Feature extraction is often the slowest part because it requires pulling data from multiple sources: transaction history, device profiles, geolocation, and behavioral analytics.

```python
import time

# Latency histograms for each pipeline stage
feature_extraction_latency = meter.create_histogram(
    name="fraud.feature_extraction_ms",
    description="Time spent extracting features for fraud scoring",
    unit="ms"
)

feature_source_latency = meter.create_histogram(
    name="fraud.feature_source_latency_ms",
    description="Latency for each individual feature data source",
    unit="ms"
)

def extract_features(transaction):
    """Extract all features needed for fraud scoring."""
    with tracer.start_as_current_span("fraud.feature_extraction") as span:
        start = time.monotonic()
        features = {}

        # Pull from multiple data sources in parallel
        # Each source is traced individually
        sources = {
            "transaction_history": fetch_transaction_history,
            "device_fingerprint": fetch_device_fingerprint,
            "geolocation": fetch_geolocation_data,
            "velocity_counters": fetch_velocity_counters,
            "account_profile": fetch_account_profile,
        }

        for source_name, fetch_fn in sources.items():
            with tracer.start_as_current_span(f"fraud.feature.{source_name}") as src_span:
                src_start = time.monotonic()
                try:
                    features[source_name] = fetch_fn(transaction)
                    src_span.set_attribute("feature.source.success", True)
                except TimeoutError:
                    # Use fallback/default features if a source times out
                    features[source_name] = get_default_features(source_name)
                    src_span.set_attribute("feature.source.success", False)
                    src_span.set_attribute("feature.source.fallback", True)
                finally:
                    src_elapsed = (time.monotonic() - src_start) * 1000
                    feature_source_latency.record(src_elapsed, {
                        "source": source_name,
                    })

        elapsed_ms = (time.monotonic() - start) * 1000
        feature_extraction_latency.record(elapsed_ms)
        span.set_attribute("feature.count", len(features))
        span.set_attribute("feature.extraction_ms", elapsed_ms)

        return features
```

## Instrumenting Model Inference

The model inference itself is where you call your ML model. You need to track not just how long it takes, but also the model version, the score it produces, and whether it timed out.

```python
# Inference-specific metrics
inference_latency = meter.create_histogram(
    name="fraud.inference_latency_ms",
    description="Time for the fraud model to return a score",
    unit="ms"
)

inference_timeout_counter = meter.create_counter(
    name="fraud.inference_timeouts_total",
    description="Number of inference requests that timed out"
)

score_histogram = meter.create_histogram(
    name="fraud.model_score",
    description="Distribution of fraud scores returned by the model"
)

decision_counter = meter.create_counter(
    name="fraud.decisions_total",
    description="Fraud decisions broken down by outcome"
)

def run_fraud_inference(features, transaction):
    """Run the fraud detection model and return a decision."""
    with tracer.start_as_current_span("fraud.inference") as span:
        model_version = get_current_model_version()
        span.set_attribute("model.version", model_version)
        span.set_attribute("model.name", "fraud_detection_v3")
        span.set_attribute("transaction.amount", transaction.amount)
        span.set_attribute("transaction.currency", transaction.currency)

        start = time.monotonic()
        try:
            # Call the model serving endpoint with a strict timeout
            score = call_model_endpoint(
                features=features,
                model_version=model_version,
                timeout_ms=30  # Hard timeout: 30ms for inference
            )
            elapsed_ms = (time.monotonic() - start) * 1000
            inference_latency.record(elapsed_ms, {
                "model_version": model_version,
            })
            score_histogram.record(score, {
                "model_version": model_version,
            })
            span.set_attribute("model.score", score)
            span.set_attribute("model.latency_ms", elapsed_ms)

        except TimeoutError:
            elapsed_ms = (time.monotonic() - start) * 1000
            inference_timeout_counter.add(1, {"model_version": model_version})
            span.set_attribute("model.timed_out", True)
            # Fall back to rules-based scoring when the model is too slow
            score = run_fallback_rules(features, transaction)
            span.set_attribute("model.fallback_used", True)
            span.set_attribute("model.fallback_score", score)

        # Apply business rules on top of the model score
        with tracer.start_as_current_span("fraud.post_processing") as pp_span:
            decision = apply_business_rules(score, transaction, features)
            pp_span.set_attribute("decision.outcome", decision.outcome)
            pp_span.set_attribute("decision.reason", decision.reason)

        decision_counter.add(1, {
            "outcome": decision.outcome,
            "model_version": model_version,
        })

        return decision
```

## End-to-End Payment Authorization Trace

Tying it all together, here is how the complete payment authorization flow looks with fraud detection integrated.

```python
# Total authorization latency budget tracking
auth_latency = meter.create_histogram(
    name="payment.authorization_latency_ms",
    description="Total payment authorization latency including fraud check",
    unit="ms"
)

budget_exceeded_counter = meter.create_counter(
    name="payment.latency_budget_exceeded_total",
    description="Authorizations that exceeded the latency budget"
)

LATENCY_BUDGET_MS = 150  # 150ms total budget for authorization

def authorize_payment(transaction):
    """Full payment authorization flow with fraud detection."""
    with tracer.start_as_current_span("payment.authorize") as span:
        auth_start = time.monotonic()
        span.set_attribute("transaction.id", transaction.id)
        span.set_attribute("transaction.amount", transaction.amount)

        # Run fraud detection
        features = extract_features(transaction)
        fraud_decision = run_fraud_inference(features, transaction)

        if fraud_decision.outcome == "decline":
            span.set_attribute("auth.result", "declined_fraud")
            return {"approved": False, "reason": "fraud"}

        # Proceed with normal authorization
        with tracer.start_as_current_span("payment.balance_check"):
            balance_ok = check_balance(transaction)

        total_ms = (time.monotonic() - auth_start) * 1000
        auth_latency.record(total_ms)

        if total_ms > LATENCY_BUDGET_MS:
            budget_exceeded_counter.add(1)
            span.set_attribute("auth.budget_exceeded", True)

        span.set_attribute("auth.total_ms", total_ms)
        return {"approved": balance_ok, "fraud_score": fraud_decision.score}
```

## What to Alert On

The key alerts for fraud detection inference monitoring are:

- **p99 inference latency** exceeding your budget (e.g., 30ms). This signals model serving issues.
- **Timeout rate** above a threshold. If more than 1% of inferences time out, the fallback path is doing too much work.
- **Score distribution shift**. If the average fraud score suddenly changes, the model might be seeing different data or might have been incorrectly updated.
- **Decision rate changes**. A sudden spike in decline rates could indicate a model problem rather than actual fraud.

## Conclusion

Fraud detection in real-time payments is latency-critical, and every millisecond of your budget needs to be accounted for. OpenTelemetry lets you instrument each stage of the pipeline from feature extraction through model inference to post-processing so you can pinpoint exactly where time is spent and react before latency issues impact your payment approval rates.
