# How to Trace Social Media Feed Ranking Algorithm Execution (Relevance Scoring, Content Mixing) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Social Media, Feed Ranking, Recommendation Systems

Description: Trace social media feed ranking algorithms including relevance scoring and content mixing stages with OpenTelemetry for performance tuning.

Every time a user opens a social media app, a ranking algorithm assembles their feed from thousands of candidate posts. This involves pulling candidates, scoring each one for relevance, applying business rules for content diversity, and returning a ranked list. The whole process needs to complete in under 200 milliseconds to feel instant. OpenTelemetry tracing lets you understand where time is spent in each ranking stage and catch regressions before users notice.

## Setting Up the Tracer

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

tracer = trace.get_tracer("feed.ranking")
meter = metrics.get_meter("feed.ranking")
```

## Tracing the Complete Feed Generation

Feed generation happens in stages: candidate retrieval, feature extraction, scoring, mixing, and final ranking.

```python
def generate_feed(user_id: str, page_size: int = 20):
    with tracer.start_as_current_span("feed.generate") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("feed.page_size", page_size)

        # Stage 1: Retrieve candidate posts from multiple sources
        with tracer.start_as_current_span("feed.candidate_retrieval") as cand_span:
            candidates = retrieve_candidates(user_id)
            cand_span.set_attribute("candidates.from_following", candidates.following_count)
            cand_span.set_attribute("candidates.from_discover", candidates.discover_count)
            cand_span.set_attribute("candidates.from_trending", candidates.trending_count)
            cand_span.set_attribute("candidates.total", candidates.total)

        # Stage 2: Extract features for each candidate
        with tracer.start_as_current_span("feed.feature_extraction") as feat_span:
            features = extract_features(user_id, candidates.all_posts)
            feat_span.set_attribute("features.count", len(features))
            feat_span.set_attribute("features.user_features_loaded", True)
            feat_span.set_attribute("features.post_features_loaded", True)

        # Stage 3: Score each candidate for relevance
        with tracer.start_as_current_span("feed.relevance_scoring") as score_span:
            scored_posts = score_candidates(features)
            score_span.set_attribute("scoring.model_name", "feed_ranker_v4")
            score_span.set_attribute("scoring.posts_scored", len(scored_posts))
            score_span.set_attribute("scoring.avg_score",
                round(sum(p.score for p in scored_posts) / len(scored_posts), 4))

        # Stage 4: Apply content mixing rules (diversity, freshness, etc.)
        with tracer.start_as_current_span("feed.content_mixing") as mix_span:
            mixed = apply_content_mixing(scored_posts, user_id)
            mix_span.set_attribute("mixing.posts_promoted", mixed.promoted_count)
            mix_span.set_attribute("mixing.posts_demoted", mixed.demoted_count)
            mix_span.set_attribute("mixing.diversity_score", mixed.diversity_score)
            mix_span.set_attribute("mixing.freshness_boost_applied", mixed.freshness_boosted)

        # Stage 5: Final ranking and truncation
        with tracer.start_as_current_span("feed.final_ranking") as rank_span:
            final_feed = finalize_ranking(mixed.posts, page_size)
            rank_span.set_attribute("feed.returned_count", len(final_feed))
            rank_span.set_attribute("feed.has_ads", any(p.is_ad for p in final_feed))

        span.set_attribute("feed.total_candidates", candidates.total)
        span.set_attribute("feed.returned", len(final_feed))
        return final_feed
```

## Tracing Candidate Retrieval in Detail

Candidate retrieval pulls posts from different sources. Each source has different latency characteristics.

```python
def retrieve_candidates(user_id: str):
    with tracer.start_as_current_span("feed.retrieve.all_sources") as span:

        # Posts from accounts the user follows
        with tracer.start_as_current_span("feed.retrieve.following") as follow_span:
            following_posts = fetch_following_posts(user_id, limit=500)
            follow_span.set_attribute("source", "following")
            follow_span.set_attribute("posts.count", len(following_posts))
            follow_span.set_attribute("cache.hit", following_posts.from_cache)

        # Posts from the discovery/explore system
        with tracer.start_as_current_span("feed.retrieve.discover") as discover_span:
            discover_posts = fetch_discover_posts(user_id, limit=200)
            discover_span.set_attribute("source", "discover")
            discover_span.set_attribute("posts.count", len(discover_posts))

        # Trending and viral content
        with tracer.start_as_current_span("feed.retrieve.trending") as trend_span:
            trending_posts = fetch_trending_posts(limit=100)
            trend_span.set_attribute("source", "trending")
            trend_span.set_attribute("posts.count", len(trending_posts))

        total = len(following_posts) + len(discover_posts) + len(trending_posts)
        span.set_attribute("candidates.total", total)

        return CandidateSet(
            following=following_posts,
            discover=discover_posts,
            trending=trending_posts
        )
```

## Tracing the Relevance Scoring Model

The scoring model is typically the most compute-intensive part. You want to track not just how long it takes but also the distribution of scores and model version.

```python
def score_candidates(features: list):
    with tracer.start_as_current_span("feed.score.model_inference") as span:
        span.set_attribute("model.name", "feed_ranker_v4")
        span.set_attribute("model.version", "4.1.2")
        span.set_attribute("input.batch_size", len(features))

        # Run batch inference
        scores = run_ranking_model(features)

        # Record score distribution stats
        sorted_scores = sorted(scores, key=lambda x: x.score, reverse=True)
        span.set_attribute("scores.max", sorted_scores[0].score)
        span.set_attribute("scores.min", sorted_scores[-1].score)
        span.set_attribute("scores.p50", sorted_scores[len(sorted_scores) // 2].score)
        span.set_attribute("scores.p90", sorted_scores[len(sorted_scores) // 10].score)

        return sorted_scores
```

## Content Mixing Rules

Content mixing ensures the feed is not dominated by a single content type or author. This is where editorial and product decisions get applied on top of the ML scores.

```python
def apply_content_mixing(scored_posts: list, user_id: str):
    with tracer.start_as_current_span("feed.mix.apply_rules") as span:
        # Rule 1: No more than 3 consecutive posts from the same author
        with tracer.start_as_current_span("feed.mix.author_diversity"):
            posts = enforce_author_diversity(scored_posts, max_consecutive=3)

        # Rule 2: Boost fresh content (< 4 hours old)
        with tracer.start_as_current_span("feed.mix.freshness_boost") as fresh_span:
            posts, freshness_count = apply_freshness_boost(posts, hours_threshold=4)
            fresh_span.set_attribute("freshness.boosted_count", freshness_count)

        # Rule 3: Ensure content type diversity (photos, videos, text)
        with tracer.start_as_current_span("feed.mix.type_diversity") as type_span:
            posts = enforce_content_type_diversity(posts)
            type_counts = count_content_types(posts[:20])
            type_span.set_attribute("mix.photo_count", type_counts.get("photo", 0))
            type_span.set_attribute("mix.video_count", type_counts.get("video", 0))
            type_span.set_attribute("mix.text_count", type_counts.get("text", 0))

        return MixResult(posts=posts, diversity_score=calculate_diversity(posts))
```

## Feed Generation Metrics

```python
feed_latency = meter.create_histogram(
    "feed.generation.latency_ms",
    description="End-to-end feed generation latency",
    unit="ms"
)

candidate_count = meter.create_histogram(
    "feed.candidates.count",
    description="Number of candidates considered per feed request"
)

scoring_latency = meter.create_histogram(
    "feed.scoring.latency_ms",
    description="ML model scoring latency",
    unit="ms"
)
```

## Why Tracing Feed Ranking Matters

Feed ranking latency directly impacts user engagement. If feed generation takes 500ms instead of 150ms, users notice the lag and may close the app. With OpenTelemetry tracing each stage, you can see that candidate retrieval from the following graph is fast (cache hit) but the discover source is slow (cold query). Or that scoring latency jumped after a model update. These insights let you optimize the right component instead of guessing.
