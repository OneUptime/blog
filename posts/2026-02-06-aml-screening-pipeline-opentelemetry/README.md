# How to Trace Anti-Money Laundering (AML) Screening Pipeline Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AML, Anti-Money Laundering, Pipeline Performance

Description: Trace and optimize anti-money laundering screening pipeline performance using OpenTelemetry distributed tracing and custom metrics.

Anti-money laundering screening is one of the most performance-sensitive compliance workflows in banking. Every transaction, wire transfer, and account opening must pass through AML checks. When the pipeline slows down, transactions back up, customers wait, and in the worst case, suspicious activity slips through undetected. This post covers how to instrument your AML screening pipeline with OpenTelemetry so you can monitor its performance and catch bottlenecks before they become problems.

## Anatomy of an AML Pipeline

A typical AML screening pipeline has these stages:

1. **Transaction Ingestion** - Receive and normalize transaction data
2. **Customer Risk Profiling** - Look up the customer's risk profile
3. **Rule Engine Evaluation** - Apply detection rules for suspicious patterns
4. **Watchlist Screening** - Check parties against sanctions and PEP lists
5. **Behavioral Analytics** - Run ML models for anomaly detection
6. **Alert Generation** - Create alerts for suspicious activities
7. **Case Routing** - Route alerts to investigators

## Setting Up Tracing and Metrics

```python
# aml_observability.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider

tracer = trace.get_tracer("aml.screening.pipeline")
meter = metrics.get_meter("aml.screening.pipeline")

# Key metrics for AML pipeline monitoring
screening_latency = meter.create_histogram(
    "aml.screening.duration_ms",
    description="End-to-end AML screening duration",
    unit="ms"
)

stage_duration = meter.create_histogram(
    "aml.stage.duration_ms",
    description="Duration of individual AML pipeline stages",
    unit="ms"
)

alerts_generated = meter.create_counter(
    "aml.alerts.generated",
    description="Number of AML alerts generated"
)

transactions_screened = meter.create_counter(
    "aml.transactions.screened",
    description="Total transactions screened"
)

false_positive_rate = meter.create_histogram(
    "aml.false_positive.rate",
    description="False positive rate across screening runs"
)
```

## Instrumenting the Transaction Ingestion

The ingestion stage normalizes incoming transactions from various source systems. Latency here affects everything downstream.

```python
# aml_ingestion.py
def ingest_transaction(raw_transaction, source_system: str):
    with tracer.start_as_current_span("aml.ingest") as span:
        span.set_attribute("aml.source_system", source_system)
        span.set_attribute("aml.transaction_type", raw_transaction.get("type"))

        t0 = time.monotonic()

        # Normalize the transaction into the standard AML format
        normalized = normalize_transaction(raw_transaction, source_system)
        span.set_attribute("aml.normalized.currency", normalized.currency)
        span.set_attribute("aml.normalized.amount_bucket",
            categorize_amount(normalized.amount))
        span.set_attribute("aml.normalized.country_codes",
            str(normalized.country_codes))

        duration = (time.monotonic() - t0) * 1000
        stage_duration.record(duration, {"stage": "ingestion", "source": source_system})

        return normalized
```

## Tracing the Rule Engine

The rule engine evaluates transactions against hundreds of detection rules. Performance varies dramatically based on transaction complexity and the number of rules that match.

```python
# aml_rule_engine.py
def evaluate_rules(transaction, customer_profile):
    with tracer.start_as_current_span("aml.rule_engine.evaluate") as span:
        span.set_attribute("aml.customer_risk_rating", customer_profile.risk_rating)
        span.set_attribute("aml.rule_set_version", rule_engine.version)

        t0 = time.monotonic()

        # Load applicable rules based on transaction type and jurisdiction
        with tracer.start_as_current_span("aml.rule_engine.load_rules") as load_span:
            applicable_rules = rule_engine.get_applicable_rules(
                transaction_type=transaction.type,
                jurisdiction=transaction.jurisdiction,
                customer_risk=customer_profile.risk_rating
            )
            load_span.set_attribute("aml.rules.applicable_count", len(applicable_rules))

        # Evaluate each rule
        triggered_rules = []
        with tracer.start_as_current_span("aml.rule_engine.execute") as exec_span:
            for rule in applicable_rules:
                result = rule.evaluate(transaction, customer_profile)
                if result.triggered:
                    triggered_rules.append(result)

            exec_span.set_attribute("aml.rules.triggered_count", len(triggered_rules))
            exec_span.set_attribute("aml.rules.triggered_ids",
                str([r.rule_id for r in triggered_rules]))
            exec_span.set_attribute("aml.rules.highest_severity",
                max((r.severity for r in triggered_rules), default="none"))

        duration = (time.monotonic() - t0) * 1000
        stage_duration.record(duration, {
            "stage": "rule_engine",
            "risk_rating": customer_profile.risk_rating
        })

        span.set_attribute("aml.rules.total_triggered", len(triggered_rules))
        return triggered_rules
```

## Tracing Watchlist Screening

Watchlist screening checks transaction parties against OFAC, EU sanctions, PEP lists, and internal watchlists. This is often the slowest stage because it involves fuzzy name matching.

```python
# aml_watchlist.py
def screen_against_watchlists(transaction, parties):
    with tracer.start_as_current_span("aml.watchlist.screen") as span:
        span.set_attribute("aml.watchlist.party_count", len(parties))

        all_hits = []

        for party in parties:
            with tracer.start_as_current_span("aml.watchlist.screen_party") as party_span:
                party_span.set_attribute("aml.watchlist.party_role", party.role)
                # Do not log the actual name - log a hashed version for tracing
                party_span.set_attribute("aml.watchlist.party_hash", hash_name(party.name))

                t0 = time.monotonic()

                # Screen against each watchlist
                hits = []
                for watchlist in active_watchlists:
                    with tracer.start_as_current_span("aml.watchlist.check_list") as list_span:
                        list_span.set_attribute("aml.watchlist.list_name", watchlist.name)
                        list_span.set_attribute("aml.watchlist.list_size", watchlist.entry_count)

                        list_hits = watchlist.fuzzy_match(
                            party.name,
                            threshold=0.85  # Match confidence threshold
                        )
                        list_span.set_attribute("aml.watchlist.hits", len(list_hits))
                        list_span.set_attribute("aml.watchlist.best_score",
                            max((h.score for h in list_hits), default=0.0))

                        hits.extend(list_hits)

                duration = (time.monotonic() - t0) * 1000
                party_span.set_attribute("aml.watchlist.total_hits", len(hits))
                party_span.set_attribute("aml.watchlist.duration_ms", duration)
                all_hits.extend(hits)

        total_duration = sum_stage_durations()
        stage_duration.record(total_duration, {"stage": "watchlist_screening"})

        span.set_attribute("aml.watchlist.total_hits", len(all_hits))
        return all_hits
```

## Tracing Behavioral Analytics

The ML-based anomaly detection stage compares transaction patterns against historical behavior.

```python
# aml_behavioral.py
def run_behavioral_analytics(transaction, customer_profile):
    with tracer.start_as_current_span("aml.behavioral.analyze") as span:
        span.set_attribute("aml.behavioral.model_version", behavioral_model.version)

        # Load customer transaction history
        with tracer.start_as_current_span("aml.behavioral.load_history") as hist_span:
            history = transaction_store.get_customer_history(
                customer_profile.id,
                lookback_days=90
            )
            hist_span.set_attribute("aml.behavioral.history_count", len(history))
            hist_span.set_attribute("aml.behavioral.history_days", 90)

        # Run the anomaly detection model
        with tracer.start_as_current_span("aml.behavioral.score") as score_span:
            anomaly_result = behavioral_model.score(transaction, history)
            score_span.set_attribute("aml.behavioral.anomaly_score", anomaly_result.score)
            score_span.set_attribute("aml.behavioral.is_anomalous", anomaly_result.is_anomalous)
            score_span.set_attribute("aml.behavioral.top_features",
                str(anomaly_result.top_contributing_features))
            score_span.set_attribute("aml.behavioral.model_latency_ms",
                anomaly_result.inference_time_ms)

        return anomaly_result
```

## Alert Generation and Case Routing

When screening produces hits, we generate alerts and route them to investigators.

```python
# aml_alerting.py
def generate_and_route_alert(transaction, rule_hits, watchlist_hits, anomaly_result):
    with tracer.start_as_current_span("aml.alert.generate") as span:
        # Determine if an alert should be generated
        should_alert = (
            len(rule_hits) > 0 or
            len(watchlist_hits) > 0 or
            (anomaly_result and anomaly_result.is_anomalous)
        )

        span.set_attribute("aml.alert.should_generate", should_alert)

        if not should_alert:
            transactions_screened.add(1, {"outcome": "cleared"})
            return None

        # Create the alert
        alert = Alert(
            transaction_id=transaction.id,
            rule_hits=rule_hits,
            watchlist_hits=watchlist_hits,
            anomaly_score=anomaly_result.score if anomaly_result else 0.0,
            priority=calculate_priority(rule_hits, watchlist_hits, anomaly_result)
        )

        span.set_attribute("aml.alert.id", alert.id)
        span.set_attribute("aml.alert.priority", alert.priority)

        # Route to the appropriate investigation team
        with tracer.start_as_current_span("aml.alert.route") as route_span:
            assignment = case_router.assign(alert)
            route_span.set_attribute("aml.alert.assigned_team", assignment.team)
            route_span.set_attribute("aml.alert.assigned_queue", assignment.queue)

        alerts_generated.add(1, {"priority": alert.priority})
        transactions_screened.add(1, {"outcome": "alerted"})

        return alert
```

## Key Metrics to Dashboard

Once everything is instrumented, build dashboards that show:

- End-to-end screening latency at p50, p95, and p99, broken down by transaction type.
- Individual stage durations so you can see which stage is the bottleneck. Watchlist screening with fuzzy matching is usually the slowest.
- Alert generation rate and priority distribution. A sudden spike in high-priority alerts could indicate a real threat or a rule configuration issue.
- Throughput in transactions screened per second. If throughput drops below your ingestion rate, you are building up a backlog.

The distributed traces let you drill into any slow screening to understand exactly why it took longer than expected, whether it was a large number of watchlist entries, a complex transaction pattern, or a slow database query for customer history.
