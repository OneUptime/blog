# How to Build a Fraud Detection Observability Pipeline Using OpenTelemetry Kafka Spans and Risk Score Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Fraud Detection, Kafka

Description: Build an observability pipeline for fraud detection systems using OpenTelemetry Kafka spans and risk score tracking.

Fraud detection in e-commerce runs on tight latency budgets. You have milliseconds to score a transaction, decide whether to block it, and return a result before the customer notices any delay. These systems typically involve Kafka event streams, ML scoring models, and rule engines working in concert. When fraud slips through or when legitimate transactions get falsely blocked, you need to trace the entire decision pipeline to understand what went wrong.

OpenTelemetry is a natural fit here because fraud detection is inherently a distributed, event-driven workflow. This post shows how to instrument a Kafka-based fraud pipeline with spans that carry risk scores and decision metadata.

## The Pipeline Architecture

```
Order Event -> Kafka Topic (orders.new)
    -> Fraud Scoring Service (consumes, scores, produces)
        -> Kafka Topic (orders.fraud-scored)
            -> Decision Service (consumes, applies rules, produces)
                -> Kafka Topic (orders.decision)
                    -> Order Service (consumes, acts on decision)
```

## Producing Traced Kafka Messages

The first step is injecting trace context into Kafka message headers so consumers can continue the same trace.

```python
from opentelemetry import trace
from opentelemetry.propagate import inject
from confluent_kafka import Producer

tracer = trace.get_tracer("fraud.pipeline", "1.0.0")

def produce_order_event(order: dict):
    """Produce an order event to Kafka with trace context in headers."""
    with tracer.start_as_current_span("fraud.produce_order_event") as span:
        span.set_attribute("order.id", order["order_id"])
        span.set_attribute("order.amount", order["total_amount"])
        span.set_attribute("order.currency", order["currency"])
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination", "orders.new")

        # Inject trace context into Kafka headers
        headers = {}
        inject(headers)
        kafka_headers = [(k, v.encode()) for k, v in headers.items()]

        producer.produce(
            topic="orders.new",
            key=order["order_id"],
            value=json.dumps(order),
            headers=kafka_headers,
            callback=delivery_callback
        )
        producer.flush()
```

## The Fraud Scoring Consumer

This service consumes order events, runs them through an ML model, and produces scored events. The span attributes capture the risk assessment details.

```python
from opentelemetry.propagate import extract
from confluent_kafka import Consumer
import time

scoring_tracer = trace.get_tracer("fraud.scoring", "1.0.0")
meter = metrics.get_meter("fraud.scoring", "1.0.0")

# Track scoring performance
scoring_latency = meter.create_histogram(
    name="fraud.scoring.latency_ms",
    description="ML model scoring latency",
    unit="ms"
)

risk_score_histogram = meter.create_histogram(
    name="fraud.risk_score",
    description="Distribution of risk scores",
    unit="1"
)

def process_order_for_fraud(msg):
    """Consume an order event and produce a fraud-scored event."""
    # Extract trace context from Kafka headers
    headers_dict = {k: v.decode() for k, v in (msg.headers() or [])}
    ctx = extract(headers_dict)

    with scoring_tracer.start_as_current_span("fraud.score_order", context=ctx) as span:
        order = json.loads(msg.value())
        span.set_attribute("order.id", order["order_id"])
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.operation", "process")

        # Feature extraction for the ML model
        with scoring_tracer.start_as_current_span("fraud.extract_features") as feat_span:
            features = extract_fraud_features(order)
            feat_span.set_attribute("fraud.feature_count", len(features))
            feat_span.set_attribute("fraud.has_address_mismatch",
                features.get("billing_shipping_mismatch", False))
            feat_span.set_attribute("fraud.device_fingerprint_known",
                features.get("known_device", False))

        # ML model inference
        with scoring_tracer.start_as_current_span("fraud.ml_inference") as ml_span:
            score_start = time.time()
            risk_score = fraud_model.predict(features)
            score_ms = (time.time() - score_start) * 1000

            ml_span.set_attribute("fraud.risk_score", risk_score)
            ml_span.set_attribute("fraud.model_version", fraud_model.version)
            ml_span.set_attribute("fraud.inference_latency_ms", score_ms)

            scoring_latency.record(score_ms, {"fraud.model_version": fraud_model.version})
            risk_score_histogram.record(risk_score)

        # Rule-based signal enrichment
        with scoring_tracer.start_as_current_span("fraud.apply_rules") as rules_span:
            signals = apply_fraud_rules(order, features)
            rules_span.set_attribute("fraud.triggered_rules", signals["triggered_rules"])
            rules_span.set_attribute("fraud.velocity_flag", signals.get("high_velocity", False))
            rules_span.set_attribute("fraud.country_risk", signals.get("country_risk", "low"))

        # Combine ML score and rule signals into a final risk assessment
        span.set_attribute("fraud.final_risk_score", risk_score)
        span.set_attribute("fraud.risk_level",
            "high" if risk_score > 0.8 else "medium" if risk_score > 0.5 else "low")

        # Produce scored event to the next topic
        scored_event = {
            **order,
            "fraud_score": risk_score,
            "fraud_signals": signals,
            "model_version": fraud_model.version
        }
        produce_scored_event(scored_event)
```

## The Decision Service

This service consumes scored events and makes the final accept/reject/review decision.

```python
decision_tracer = trace.get_tracer("fraud.decision", "1.0.0")

decision_counter = meter.create_counter(
    name="fraud.decisions_total",
    description="Fraud decisions by outcome",
    unit="1"
)

def process_fraud_decision(msg):
    headers_dict = {k: v.decode() for k, v in (msg.headers() or [])}
    ctx = extract(headers_dict)

    with decision_tracer.start_as_current_span("fraud.make_decision", context=ctx) as span:
        scored_order = json.loads(msg.value())
        risk_score = scored_order["fraud_score"]
        signals = scored_order["fraud_signals"]

        span.set_attribute("order.id", scored_order["order_id"])
        span.set_attribute("fraud.risk_score", risk_score)
        span.set_attribute("order.amount", scored_order["total_amount"])

        # Decision logic with thresholds
        if risk_score > 0.85:
            decision = "reject"
        elif risk_score > 0.6 or signals.get("high_velocity"):
            decision = "manual_review"
        else:
            decision = "accept"

        span.set_attribute("fraud.decision", decision)
        span.set_attribute("fraud.auto_decided", decision != "manual_review")

        decision_counter.add(1, {
            "fraud.decision": decision,
            "fraud.risk_level": "high" if risk_score > 0.8 else "medium" if risk_score > 0.5 else "low"
        })

        # Produce the final decision
        produce_decision_event({
            "order_id": scored_order["order_id"],
            "decision": decision,
            "risk_score": risk_score
        })
```

## Collector Pipeline Configuration

For fraud detection, you want to keep all traces for rejected and review-flagged orders, but you can sample accepted orders.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  kafka:
    brokers:
      - kafka-broker-1:9092
    topic: otel-spans
    encoding: otlp_proto

processors:
  tail_sampling:
    policies:
      # Keep all traces where fraud decision was reject or review
      - name: keep-fraud-flags
        type: string_attribute
        string_attribute:
          key: fraud.decision
          values: [reject, manual_review]
      # Sample accepted orders at 20%
      - name: sample-accepted
        type: probabilistic
        probabilistic:
          sampling_percentage: 20

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp, kafka]
      processors: [tail_sampling]
      exporters: [otlp]
```

## Key Metrics to Monitor

- **False positive rate**: Legitimate orders rejected or sent to manual review. Track this by correlating fraud decisions with chargeback data over time.
- **Scoring latency P99**: If the ML model slows down, it directly impacts checkout experience.
- **Risk score distribution**: A sudden shift in the score distribution often indicates a data pipeline issue or a new fraud pattern.
- **Kafka consumer lag**: If the scoring service falls behind, transactions are being approved without fraud checks.

The real power of this setup is that when a fraudulent order gets through, you can pull up the full trace and see exactly what risk score it received, which rules fired, and why the decision service accepted it. That forensic capability turns fraud investigation from guesswork into a structured debugging process.
