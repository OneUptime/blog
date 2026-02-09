# How to Trace Hashtag Trending Algorithm and Real-Time Aggregation Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Hashtag Trending, Real-Time Aggregation, Stream Processing

Description: Trace hashtag trending algorithm execution and real-time aggregation pipelines with OpenTelemetry to ensure timely and accurate trend detection.

Trending hashtags are one of the most visible features on a social platform. The system needs to count hashtag usage in real time, detect velocity changes (a hashtag going from 100 to 10,000 mentions in an hour), filter out spam and manipulation, and present a ranked list. All of this has to happen with low latency because trends are time-sensitive. OpenTelemetry tracing helps you understand the performance of each stage in this pipeline.

## Setting Up Tracing

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("trending.hashtags")
meter = metrics.get_meter("trending.hashtags")
```

## Tracing Hashtag Event Ingestion

Every post that contains a hashtag generates an event. These events flow through a stream processing system.

```python
def process_hashtag_event(event: dict):
    with tracer.start_as_current_span("trending.ingest_event") as span:
        span.set_attribute("hashtag", event["hashtag"])
        span.set_attribute("user.id", event["user_id"])
        span.set_attribute("post.id", event["post_id"])
        span.set_attribute("event.timestamp", event["timestamp"])

        # Update the real-time counter for this hashtag
        with tracer.start_as_current_span("trending.update_counter") as counter_span:
            counter_result = increment_hashtag_counter(
                event["hashtag"],
                window_minutes=60  # sliding window
            )
            counter_span.set_attribute("counter.current_count", counter_result.current_count)
            counter_span.set_attribute("counter.window_minutes", 60)
            counter_span.set_attribute("counter.store", "redis")

        # Check if this hashtag is showing unusual velocity
        with tracer.start_as_current_span("trending.velocity_check") as vel_span:
            velocity = calculate_velocity(event["hashtag"])
            vel_span.set_attribute("velocity.current_rate_per_min", velocity.current_rate)
            vel_span.set_attribute("velocity.baseline_rate_per_min", velocity.baseline_rate)
            vel_span.set_attribute("velocity.acceleration", velocity.acceleration)
            vel_span.set_attribute("velocity.is_trending", velocity.is_trending)

            if velocity.is_trending:
                vel_span.add_event("trending_detected", {
                    "hashtag": event["hashtag"],
                    "current_rate": velocity.current_rate,
                    "baseline_rate": velocity.baseline_rate
                })
```

## Tracing the Trending Algorithm

The trending algorithm runs periodically (every few seconds) to recompute the trending list. It pulls counters, scores hashtags by velocity and volume, applies filters, and produces a ranked list.

```python
def compute_trending_hashtags(region: str = "global"):
    with tracer.start_as_current_span("trending.compute") as span:
        span.set_attribute("trending.region", region)

        # Fetch all hashtag counters above a minimum threshold
        with tracer.start_as_current_span("trending.fetch_counters") as fetch_span:
            counters = fetch_active_hashtag_counters(min_count=50, region=region)
            fetch_span.set_attribute("counters.active_hashtags", len(counters))
            fetch_span.set_attribute("counters.source", "redis")

        # Score each hashtag based on velocity, volume, and freshness
        with tracer.start_as_current_span("trending.score_hashtags") as score_span:
            scored = []
            for hashtag, count_data in counters.items():
                score = compute_trending_score(hashtag, count_data)
                scored.append({"hashtag": hashtag, "score": score, "count": count_data["count"]})

            scored.sort(key=lambda x: x["score"], reverse=True)
            score_span.set_attribute("scoring.hashtags_scored", len(scored))

            if scored:
                score_span.set_attribute("scoring.top_score", scored[0]["score"])
                score_span.set_attribute("scoring.top_hashtag", scored[0]["hashtag"])

        # Filter out spam and manipulation
        with tracer.start_as_current_span("trending.spam_filter") as spam_span:
            filtered = apply_spam_filters(scored)
            spam_span.set_attribute("filter.input_count", len(scored))
            spam_span.set_attribute("filter.removed_spam", len(scored) - len(filtered))
            spam_span.set_attribute("filter.output_count", len(filtered))

            removed = set(s["hashtag"] for s in scored) - set(f["hashtag"] for f in filtered)
            if removed:
                spam_span.add_event("spam_hashtags_removed", {
                    "count": len(removed),
                    "examples": str(list(removed)[:5])
                })

        # Apply editorial overrides (pinned or suppressed hashtags)
        with tracer.start_as_current_span("trending.editorial_overrides") as edit_span:
            final_list = apply_editorial_overrides(filtered, region)
            edit_span.set_attribute("editorial.pins_applied", final_list.pins_count)
            edit_span.set_attribute("editorial.suppressions_applied", final_list.suppressions_count)

        # Publish the updated trending list
        with tracer.start_as_current_span("trending.publish") as pub_span:
            publish_trending_list(final_list.hashtags, region)
            pub_span.set_attribute("publish.hashtag_count", len(final_list.hashtags))
            pub_span.set_attribute("publish.region", region)

        span.set_attribute("trending.final_count", len(final_list.hashtags))
        return final_list
```

## Tracing Spam and Manipulation Detection

Spam detection for trending hashtags is critical. Bot networks can artificially inflate hashtag counts, so you need to trace your detection logic.

```python
def apply_spam_filters(scored_hashtags: list):
    with tracer.start_as_current_span("trending.spam.analyze") as span:
        clean_hashtags = []

        for item in scored_hashtags:
            with tracer.start_as_current_span("trending.spam.check_hashtag") as check_span:
                check_span.set_attribute("hashtag", item["hashtag"])

                # Check for bot-like posting patterns
                bot_score = analyze_posting_patterns(item["hashtag"])
                check_span.set_attribute("spam.bot_score", bot_score)

                # Check for coordinated inauthentic behavior
                coordination_score = detect_coordination(item["hashtag"])
                check_span.set_attribute("spam.coordination_score", coordination_score)

                # Check against known spam hashtag patterns
                pattern_match = check_spam_patterns(item["hashtag"])
                check_span.set_attribute("spam.pattern_match", pattern_match)

                is_spam = bot_score > 0.7 or coordination_score > 0.8 or pattern_match
                check_span.set_attribute("spam.is_spam", is_spam)

                if not is_spam:
                    clean_hashtags.append(item)

        span.set_attribute("spam.removed_count", len(scored_hashtags) - len(clean_hashtags))
        return clean_hashtags
```

## Key Metrics

```python
trending_computation_latency = meter.create_histogram(
    "trending.computation.latency_ms",
    description="Time to recompute the full trending list",
    unit="ms"
)

hashtag_events_processed = meter.create_counter(
    "trending.events.processed",
    description="Total hashtag events processed"
)

spam_hashtags_blocked = meter.create_counter(
    "trending.spam.blocked",
    description="Hashtags removed by spam filters"
)

trending_list_size = meter.create_histogram(
    "trending.list.size",
    description="Number of hashtags in the published trending list"
)
```

## Why Tracing Trending Matters

Trending hashtags need to update quickly. If the computation pipeline takes 30 seconds instead of 3, users see stale trends. With OpenTelemetry tracing, you can identify the bottleneck: maybe the Redis counter fetch is slow because of network latency, or the spam filter is doing too many database lookups per hashtag. These are specific, actionable findings that lead to targeted optimizations rather than blind guessing.
