# How to Build an Error Impact Score Using OpenTelemetry Metrics (Affected Users, Revenue Impact, Error Frequency)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Impact, Metrics, Prioritization

Description: Build an error impact scoring system using OpenTelemetry metrics to prioritize errors by affected users, revenue, and frequency.

When you have 200 unique errors in your system, which one do you fix first? The one that happens most often? The one that affects the most users? The one that blocks revenue? An error impact score combines multiple signals into a single number that helps you prioritize. This post shows how to build that scoring system using OpenTelemetry metrics and span attributes.

## Defining Impact Dimensions

A useful impact score considers at least three dimensions:

1. **Frequency**: How often does this error occur?
2. **User reach**: How many unique users are affected?
3. **Business criticality**: Does this error affect revenue-generating paths?

Each dimension gets a weight, and the weighted sum produces the final score.

## Instrumenting for Impact Data

First, your spans need to carry the data required for impact scoring. Add user identifiers and business context to your spans:

```python
# instrumented_handler.py
from opentelemetry import trace

tracer = trace.get_tracer("api-service")

def handle_api_request(request):
    with tracer.start_as_current_span("handle-request") as span:
        # User context for user-reach scoring
        if request.user:
            span.set_attribute("user.id", request.user.id)
            span.set_attribute("user.tier", request.user.tier)  # "free", "paid", "enterprise"

        # Business context for criticality scoring
        span.set_attribute("business.path", classify_business_path(request.path))
        span.set_attribute("business.revenue_generating", is_revenue_path(request.path))

        try:
            result = process_request(request)
            span.set_status(trace.StatusCode.OK)
            return result
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))

            # Add error-specific impact attributes
            span.set_attribute("error.type", type(e).__name__)
            span.set_attribute("error.blocks_user_action", True)
            raise


def classify_business_path(path):
    """Classify API paths by business importance."""
    if "/payments" in path or "/checkout" in path:
        return "revenue_critical"
    elif "/auth" in path or "/login" in path:
        return "auth_critical"
    elif "/api" in path:
        return "core_functionality"
    else:
        return "non_critical"

def is_revenue_path(path):
    """Check if this path is part of a revenue-generating flow."""
    revenue_paths = ["/payments", "/checkout", "/subscribe", "/upgrade"]
    return any(p in path for p in revenue_paths)
```

## Building the Impact Score Calculator

```python
# impact_scorer.py
from dataclasses import dataclass
from typing import Dict, List
from collections import defaultdict
import time

@dataclass
class ErrorImpact:
    error_type: str
    score: float
    frequency: int
    affected_users: int
    affected_paid_users: int
    revenue_impact_count: int
    first_seen: float
    last_seen: float
    details: Dict

class ErrorImpactScorer:
    """
    Calculates impact scores for errors based on OpenTelemetry
    span data. Tracks multiple dimensions and produces a weighted
    composite score.
    """

    def __init__(self, weights=None):
        self.weights = weights or {
            "frequency": 0.2,
            "user_reach": 0.3,
            "paid_user_reach": 0.2,
            "revenue_impact": 0.3,
        }

        # Internal tracking
        self.error_data = defaultdict(lambda: {
            "count": 0,
            "users": set(),
            "paid_users": set(),
            "revenue_hits": 0,
            "first_seen": None,
            "last_seen": None,
            "sample_messages": [],
        })

    def record_error(self, error_type, span_attributes):
        """
        Record an error occurrence from span data.
        Call this from a span processor when an error span completes.
        """
        data = self.error_data[error_type]
        now = time.time()

        data["count"] += 1
        data["last_seen"] = now
        if data["first_seen"] is None:
            data["first_seen"] = now

        # Track affected users
        user_id = span_attributes.get("user.id")
        if user_id:
            data["users"].add(user_id)
            if span_attributes.get("user.tier") in ("paid", "enterprise"):
                data["paid_users"].add(user_id)

        # Track revenue impact
        if span_attributes.get("business.revenue_generating"):
            data["revenue_hits"] += 1

    def calculate_scores(self) -> List[ErrorImpact]:
        """
        Calculate impact scores for all tracked errors.
        Returns a sorted list with highest impact first.
        """
        if not self.error_data:
            return []

        # Find max values for normalization
        max_count = max(d["count"] for d in self.error_data.values())
        max_users = max(len(d["users"]) for d in self.error_data.values()) or 1
        max_paid = max(len(d["paid_users"]) for d in self.error_data.values()) or 1
        max_revenue = max(d["revenue_hits"] for d in self.error_data.values()) or 1

        results = []
        for error_type, data in self.error_data.items():
            # Normalize each dimension to 0-100
            freq_score = (data["count"] / max_count) * 100
            user_score = (len(data["users"]) / max_users) * 100
            paid_score = (len(data["paid_users"]) / max_paid) * 100
            rev_score = (data["revenue_hits"] / max_revenue) * 100

            # Calculate weighted composite score
            composite = (
                self.weights["frequency"] * freq_score
                + self.weights["user_reach"] * user_score
                + self.weights["paid_user_reach"] * paid_score
                + self.weights["revenue_impact"] * rev_score
            )

            results.append(ErrorImpact(
                error_type=error_type,
                score=round(composite, 2),
                frequency=data["count"],
                affected_users=len(data["users"]),
                affected_paid_users=len(data["paid_users"]),
                revenue_impact_count=data["revenue_hits"],
                first_seen=data["first_seen"],
                last_seen=data["last_seen"],
                details={
                    "frequency_score": round(freq_score, 2),
                    "user_reach_score": round(user_score, 2),
                    "paid_user_score": round(paid_score, 2),
                    "revenue_score": round(rev_score, 2),
                },
            ))

        # Sort by composite score, highest first
        results.sort(key=lambda r: r.score, reverse=True)
        return results
```

## Integrating with a Span Processor

Wire the scorer into the OpenTelemetry pipeline:

```python
# impact_processor.py
from opentelemetry.sdk.trace import SpanProcessor
from impact_scorer import ErrorImpactScorer

class ImpactScoringProcessor(SpanProcessor):
    """
    Span processor that feeds error span data into the
    impact scorer for prioritization.
    """

    def __init__(self):
        self.scorer = ErrorImpactScorer()

    def on_end(self, span):
        if span.status.status_code.name != "ERROR":
            return

        # Extract error type from exception events
        error_type = "UnknownError"
        for event in span.events:
            if event.name == "exception" and event.attributes:
                error_type = event.attributes.get(
                    "exception.type", "UnknownError"
                )
                break

        # Feed the error into the scorer
        attrs = dict(span.attributes) if span.attributes else {}
        self.scorer.record_error(error_type, attrs)

    def get_priority_list(self):
        """Get the current error priority list."""
        return self.scorer.calculate_scores()

    def on_start(self, span, parent_context=None):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

## Exposing Impact Scores as Metrics

Export the impact scores as OpenTelemetry metrics so they show up in your dashboards:

```python
# impact_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("error-impact")

impact_score_gauge = meter.create_observable_gauge(
    name="error.impact_score",
    description="Composite impact score for each error type",
    unit="score",
)

affected_users_gauge = meter.create_observable_gauge(
    name="error.affected_users",
    description="Number of unique users affected by each error type",
    unit="users",
)

def register_impact_callbacks(scorer):
    """Register metric callbacks that read from the impact scorer."""

    def impact_callback(options):
        scores = scorer.calculate_scores()
        observations = []
        for s in scores[:20]:  # Top 20 errors
            observations.append(
                metrics.Observation(
                    s.score,
                    {"error.type": s.error_type},
                )
            )
        return observations

    def users_callback(options):
        scores = scorer.calculate_scores()
        observations = []
        for s in scores[:20]:
            observations.append(
                metrics.Observation(
                    s.affected_users,
                    {"error.type": s.error_type},
                )
            )
        return observations

    # Re-create gauges with callbacks
    global impact_score_gauge, affected_users_gauge
    impact_score_gauge = meter.create_observable_gauge(
        name="error.impact_score",
        callbacks=[impact_callback],
        description="Composite impact score for each error type",
    )
    affected_users_gauge = meter.create_observable_gauge(
        name="error.affected_users",
        callbacks=[users_callback],
        description="Unique users affected by each error type",
    )
```

## Dashboard Visualization

Create a Grafana table panel that shows the error priority list:

```promql
# Top errors by impact score
topk(10, error_impact_score)
```

Pair it with columns for affected users and revenue impact to give engineers the full picture at a glance.

## Practical Usage

When your team has a backlog of errors to fix, sort by impact score. The error that scores highest is the one affecting the most paid users on revenue-generating paths with the highest frequency. That is the one you fix first.

This shifts the team from "fix the loudest error" to "fix the most impactful error." A low-frequency error hitting every enterprise customer on the checkout page scores higher than a high-frequency error hitting free users on a settings page.

## Conclusion

An error impact score built on OpenTelemetry metrics transforms error prioritization from guesswork into data-driven decision making. By combining frequency, user reach, and revenue impact into a single composite score, you ensure your team always works on the error that matters most. The scoring system is fully customizable through weights, so you can adjust it to match your organization's priorities.
