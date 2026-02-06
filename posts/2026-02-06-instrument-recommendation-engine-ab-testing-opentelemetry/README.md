# How to Instrument Content Recommendation Engine A/B Testing with OpenTelemetry Baggage and Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, A/B Testing, Recommendation Engine, Baggage

Description: Use OpenTelemetry baggage and span attributes to instrument A/B tests in content recommendation engines effectively.

When you run A/B tests on a recommendation engine, you need to know more than just which variant won. You need to understand how each variant performed across your entire backend: did variant B cause slower database queries? Did it increase cache miss rates? OpenTelemetry baggage lets you propagate experiment context through every service in the request path, so you can slice all your telemetry data by experiment variant.

## What is OpenTelemetry Baggage?

Baggage is a set of key-value pairs that propagate across service boundaries along with the trace context. Unlike span attributes (which are local to a single span), baggage travels with the request through every service. This makes it perfect for experiment metadata that needs to be visible everywhere.

## Assigning Users to Experiments

At the entry point of your application, assign the user to an experiment variant and set it as baggage.

```python
from opentelemetry import trace, baggage, context
from opentelemetry.baggage import set_baggage
import hashlib

tracer = trace.get_tracer("recommendation.service", "1.0.0")

def assign_experiment(user_id, experiment_name, variants):
    """Deterministically assign a user to an experiment variant.
    Uses consistent hashing so the same user always gets the same variant.
    """
    hash_input = f"{user_id}:{experiment_name}"
    hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)
    variant_index = hash_value % len(variants)
    return variants[variant_index]


def handle_recommendation_request(user_id, content_context):
    """Handle an incoming recommendation request with experiment assignment."""

    # Assign user to active experiments
    rec_variant = assign_experiment(
        user_id, "rec_algorithm_v3", ["control", "collaborative", "hybrid"]
    )
    ranking_variant = assign_experiment(
        user_id, "ranking_boost_v2", ["control", "recency_boost"]
    )

    # Set experiment assignments as baggage
    # This will propagate to every downstream service automatically
    ctx = set_baggage("experiment.rec_algorithm", rec_variant)
    ctx = set_baggage("experiment.ranking_boost", ranking_variant, context=ctx)
    ctx = set_baggage("user.cohort", get_user_cohort(user_id), context=ctx)

    # Attach the context so all downstream spans inherit it
    token = context.attach(ctx)

    try:
        with tracer.start_as_current_span("recommendation.request") as span:
            # Also set as span attributes for easy querying on this span
            span.setAttribute("experiment.rec_algorithm", rec_variant)
            span.setAttribute("experiment.ranking_boost", ranking_variant)
            span.setAttribute("user.id", user_id)

            recommendations = generate_recommendations(user_id, content_context)
            return recommendations
    finally:
        context.detach(token)
```

## Propagating Experiment Context to Downstream Services

Any downstream service that receives the propagated context can read the baggage and add it to its own spans.

```python
# In the feature store service
def get_user_features(user_id):
    """Fetch user features from the feature store."""

    with tracer.start_as_current_span("feature_store.get_features") as span:
        # Read experiment baggage and add to this span
        rec_algo = baggage.get_baggage("experiment.rec_algorithm")
        ranking = baggage.get_baggage("experiment.ranking_boost")

        if rec_algo:
            span.setAttribute("experiment.rec_algorithm", rec_algo)
        if ranking:
            span.setAttribute("experiment.ranking_boost", ranking)

        # Now when you query traces for this service,
        # you can filter by experiment variant
        features = feature_store.query(user_id)
        span.setAttribute("features.count", len(features))
        return features
```

## Recording Experiment-Aware Metrics

Beyond traces, your metrics should also carry experiment dimensions so you can compare variants statistically.

```python
from opentelemetry import metrics

meter = metrics.get_meter("recommendation.metrics", "1.0.0")

# Recommendation quality metrics per experiment variant
click_through = meter.create_counter(
    "recommendation.click_through",
    description="Number of recommendations that were clicked",
)

impressions = meter.create_counter(
    "recommendation.impressions",
    description="Number of recommendations shown to users",
)

recommendation_latency = meter.create_histogram(
    "recommendation.latency",
    description="Time to generate recommendations",
    unit="ms",
)


def generate_recommendations(user_id, content_context):
    """Generate recommendations and record experiment-tagged metrics."""

    rec_variant = baggage.get_baggage("experiment.rec_algorithm")
    ranking_variant = baggage.get_baggage("experiment.ranking_boost")

    metric_attrs = {
        "experiment.rec_algorithm": rec_variant or "unknown",
        "experiment.ranking_boost": ranking_variant or "unknown",
    }

    start = time.time()

    # Pick algorithm based on variant
    if rec_variant == "collaborative":
        results = collaborative_filter(user_id, content_context)
    elif rec_variant == "hybrid":
        results = hybrid_recommend(user_id, content_context)
    else:
        results = baseline_recommend(user_id, content_context)

    elapsed_ms = (time.time() - start) * 1000
    recommendation_latency.record(elapsed_ms, metric_attrs)

    # Record impressions
    impressions.add(len(results), metric_attrs)

    return results
```

## Tracking Click-Through on the Client Side

When a user clicks a recommendation, the frontend sends an event that includes the experiment variant.

```javascript
function trackRecommendationClick(contentId, position, experimentData) {
  // experimentData was passed along with the recommendation response
  const attrs = {
    "experiment.rec_algorithm": experimentData.recAlgorithm,
    "experiment.ranking_boost": experimentData.rankingBoost,
    "recommendation.position": position,
    "content.id": contentId,
  };

  // Record the click-through metric
  clickThroughCounter.add(1, attrs);

  // Also create a span for click tracking
  const span = tracer.startSpan("recommendation.click", {
    attributes: attrs,
  });
  span.end();
}
```

## Analyzing Results

With experiment variants tagged on both traces and metrics, you can answer questions like:

- **Does variant B have higher latency?** Query `recommendation.latency` grouped by `experiment.rec_algorithm` and compare distributions.
- **Is the database struggling under variant C?** Look at database span durations filtered by the experiment baggage value.
- **Which variant drives more engagement?** Compare `recommendation.click_through` divided by `recommendation.impressions` across variants.
- **Are there downstream side effects?** Check if cache hit rates, error rates, or queue depths differ by variant.

## Avoiding Baggage Pitfalls

A few things to keep in mind:

- **Keep baggage values small.** They are sent as HTTP headers with every request. Stick to short strings.
- **Do not put sensitive data in baggage.** It is visible to every service in the path and may appear in logs.
- **Limit the number of baggage items.** Each item adds header overhead. Five to ten experiment keys is reasonable; fifty is not.
- **Clean up old experiments.** Remove baggage entries for experiments that have concluded to avoid noise.

OpenTelemetry baggage turns your A/B testing from a surface-level feature flag into a deep observability signal. Every service, every database query, every cache lookup can be analyzed through the lens of which experiment variant was active. That depth of insight is what separates teams that guess about performance from teams that know.
