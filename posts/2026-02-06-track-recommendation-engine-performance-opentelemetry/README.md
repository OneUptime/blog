# How to Track Recommendation Engine Performance (Collaborative Filtering Latency, CTR Metrics) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Recommendation Engine, Machine Learning

Description: Track recommendation engine latency and click-through rates using OpenTelemetry to optimize collaborative filtering.

Recommendation engines drive a significant chunk of e-commerce revenue. Amazon famously attributes 35% of its sales to recommendations. But these systems are hard to monitor. A recommendation that is technically "fast" can still be useless if it surfaces irrelevant products. And a highly relevant recommendation that takes 800ms to compute will never be seen because the page has already rendered.

You need to track both the engineering metrics (latency, error rates, model serving time) and the business metrics (click-through rate, conversion rate, revenue per recommendation). OpenTelemetry lets you capture both in the same pipeline.

## The Recommendation Flow

A typical recommendation request looks like this:

1. User visits a product page or cart
2. Frontend requests recommendations for a given context
3. Backend fetches user history and item embeddings
4. Collaborative filtering model scores candidate items
5. Results are filtered, ranked, and returned
6. User interacts (or does not) with the recommendations

## Instrumenting the Recommendation Service

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("ecommerce.recommendations", "1.0.0")
meter = metrics.get_meter("ecommerce.recommendations", "1.0.0")

# Latency histogram for the full recommendation pipeline
reco_latency = meter.create_histogram(
    name="reco.latency_ms",
    description="End-to-end recommendation generation latency",
    unit="ms"
)

# Model inference time specifically
model_latency = meter.create_histogram(
    name="reco.model.latency_ms",
    description="Collaborative filtering model inference latency",
    unit="ms"
)

# Track recommendation impressions and clicks
reco_impressions = meter.create_counter(
    name="reco.impressions_total",
    description="Number of recommendation sets shown to users",
    unit="1"
)

reco_clicks = meter.create_counter(
    name="reco.clicks_total",
    description="Number of recommended items clicked",
    unit="1"
)
```

## Generating Recommendations with Tracing

```python
async def get_recommendations(user_id: str, context_product_id: str,
                               placement: str, limit: int = 12):
    """Generate product recommendations for a user in a given context."""
    start = time.time()

    with tracer.start_as_current_span("reco.generate") as span:
        # Generate a unique ID to link impressions with clicks later
        reco_request_id = generate_request_id()
        span.set_attribute("reco.request_id", reco_request_id)
        span.set_attribute("reco.user_id", user_id)
        span.set_attribute("reco.context_product_id", context_product_id)
        span.set_attribute("reco.placement", placement)
        span.set_attribute("reco.requested_limit", limit)

        # Step 1: Fetch user interaction history
        with tracer.start_as_current_span("reco.fetch_user_history") as hist_span:
            history = await user_history_store.get_recent(user_id, limit=200)
            hist_span.set_attribute("reco.history_items", len(history))
            hist_span.set_attribute("reco.history_days", history.span_days if history else 0)

            # Cold start detection
            is_cold_start = len(history) < 5
            span.set_attribute("reco.cold_start", is_cold_start)

        # Step 2: Get candidate items
        with tracer.start_as_current_span("reco.fetch_candidates") as cand_span:
            if is_cold_start:
                # Fall back to popularity-based candidates
                candidates = await popular_items_cache.get_top(limit * 3)
                cand_span.set_attribute("reco.candidate_source", "popularity_fallback")
            else:
                candidates = await candidate_generator.get_candidates(
                    user_id, context_product_id, limit * 3
                )
                cand_span.set_attribute("reco.candidate_source", "collaborative_filtering")
            cand_span.set_attribute("reco.candidate_count", len(candidates))

        # Step 3: Score candidates with collaborative filtering model
        with tracer.start_as_current_span("reco.score_candidates") as score_span:
            model_start = time.time()

            # Fetch item embeddings for scoring
            with tracer.start_as_current_span("reco.fetch_embeddings"):
                embeddings = await embedding_store.batch_get(
                    [c["product_id"] for c in candidates]
                )

            # Run the model
            with tracer.start_as_current_span("reco.model_inference") as model_span:
                scores = recommendation_model.score(
                    user_embedding=history.user_vector,
                    item_embeddings=embeddings
                )
                model_span.set_attribute("reco.model_name", recommendation_model.name)
                model_span.set_attribute("reco.model_version", recommendation_model.version)

            model_ms = (time.time() - model_start) * 1000
            score_span.set_attribute("reco.scoring_latency_ms", model_ms)
            model_latency.record(model_ms, {"reco.placement": placement})

        # Step 4: Post-processing - filtering and diversity
        with tracer.start_as_current_span("reco.post_process") as post_span:
            # Remove items already in cart or recently purchased
            filtered = filter_already_owned(candidates, scores, user_id)
            # Apply diversity rules to avoid showing too many similar items
            diversified = apply_diversity(filtered, max_per_category=3)
            final = diversified[:limit]

            post_span.set_attribute("reco.filtered_out", len(candidates) - len(filtered))
            post_span.set_attribute("reco.final_count", len(final))

        total_ms = (time.time() - start) * 1000
        reco_latency.record(total_ms, {"reco.placement": placement})
        span.set_attribute("reco.total_latency_ms", total_ms)

        reco_impressions.add(1, {
            "reco.placement": placement,
            "reco.cold_start": is_cold_start
        })

        return {
            "request_id": reco_request_id,
            "recommendations": final,
            "metadata": {
                "model_version": recommendation_model.version,
                "cold_start": is_cold_start
            }
        }
```

## Tracking Clicks and CTR

When a user clicks a recommended product, record it with a link back to the original recommendation request.

```python
def track_recommendation_click(reco_request_id: str, product_id: str,
                                position: int, placement: str):
    """Called when a user clicks on a recommended item."""
    with tracer.start_as_current_span("reco.click") as span:
        span.set_attribute("reco.request_id", reco_request_id)
        span.set_attribute("reco.clicked_product_id", product_id)
        span.set_attribute("reco.click_position", position)
        span.set_attribute("reco.placement", placement)

        reco_clicks.add(1, {
            "reco.placement": placement,
            "reco.position_bucket": bucket_position(position)
        })


def track_recommendation_purchase(reco_request_id: str, product_id: str,
                                    revenue: float):
    """Called when a purchase is attributed to a recommendation."""
    with tracer.start_as_current_span("reco.conversion") as span:
        span.set_attribute("reco.request_id", reco_request_id)
        span.set_attribute("reco.converted_product_id", product_id)
        span.set_attribute("reco.revenue", revenue)


def bucket_position(pos: int) -> str:
    """Bucket click positions for metric cardinality control."""
    if pos < 3:
        return "top_3"
    elif pos < 6:
        return "4_to_6"
    elif pos < 12:
        return "7_to_12"
    return "below_fold"
```

## Dashboard Panels

Build these views for your recommendation team:

- **Latency breakdown**: Stacked bar chart showing time spent in each pipeline stage (history fetch, candidate generation, scoring, post-processing)
- **CTR by placement**: Click-through rate for each recommendation widget (product page, cart page, homepage, email)
- **Cold start rate**: Percentage of users hitting the popularity fallback
- **Model version comparison**: Side-by-side latency and CTR for different model versions during A/B tests
- **Revenue attribution**: Revenue from recommendation clicks vs. organic product discovery

## Practical Takeaways

A few things we learned from running this instrumentation in production:

1. Embedding fetch is usually the bottleneck, not model inference. Caching hot embeddings in Redis cut P95 latency by 40%.
2. Cold start users have dramatically lower CTR. Investing in a better fallback strategy (e.g., session-based recommendations instead of pure popularity) pays off quickly.
3. Position bias is real. Items in positions 1-3 get 80% of clicks. If your model is not confident in its top picks, consider showing fewer recommendations rather than padding with low-confidence ones.

By combining latency traces with business outcome metrics in the same OpenTelemetry pipeline, you give both the engineering team and the product team a shared language for evaluating recommendation quality.
