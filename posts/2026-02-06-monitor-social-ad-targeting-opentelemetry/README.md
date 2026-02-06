# How to Monitor Social Media Ad Targeting and Audience Segmentation Pipeline with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Ad Targeting, Audience Segmentation, Advertising Pipeline

Description: Monitor social media ad targeting and audience segmentation pipelines with OpenTelemetry to optimize ad serving latency and targeting accuracy.

Ad targeting and audience segmentation are the revenue engine of social media platforms. When an ad impression opportunity arises (a user loads their feed), the system must select the best ad from thousands of candidates within a few milliseconds. This involves evaluating the user's profile against audience segments, running a bidding auction, and applying ad policy filters. OpenTelemetry tracing helps you understand the latency of each stage and ensure ads are being targeted correctly.

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

tracer = trace.get_tracer("ads.targeting")
meter = metrics.get_meter("ads.targeting")
```

## Tracing the Ad Serving Request

Every feed load triggers an ad request. The system needs to identify the user, match them to audience segments, find eligible ads, run an auction, and return the winning ad.

```python
def serve_ad(user_id: str, placement: str, context: dict):
    with tracer.start_as_current_span("ads.serve") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("ads.placement", placement)  # feed, story, sidebar
        span.set_attribute("context.platform", context.get("platform", "unknown"))

        # Step 1: Build the user's audience profile
        with tracer.start_as_current_span("ads.build_user_profile") as profile_span:
            user_profile = build_targeting_profile(user_id)
            profile_span.set_attribute("profile.segments_count", len(user_profile.segments))
            profile_span.set_attribute("profile.interests_count", len(user_profile.interests))
            profile_span.set_attribute("profile.age_bracket", user_profile.age_bracket)
            profile_span.set_attribute("profile.geo_region", user_profile.geo_region)
            profile_span.set_attribute("profile.cache_hit", user_profile.from_cache)

        # Step 2: Find ads targeting this user's segments
        with tracer.start_as_current_span("ads.candidate_selection") as select_span:
            candidates = find_matching_ads(user_profile, placement)
            select_span.set_attribute("candidates.total", len(candidates))
            select_span.set_attribute("candidates.segments_matched",
                                      len(candidates.matched_segments))

        # Step 3: Apply ad policy and frequency capping
        with tracer.start_as_current_span("ads.policy_filter") as policy_span:
            filtered = apply_ad_policies(candidates, user_id)
            policy_span.set_attribute("policy.input_count", len(candidates))
            policy_span.set_attribute("policy.removed_frequency_cap",
                                      filtered.removed_by_freq_cap)
            policy_span.set_attribute("policy.removed_policy_violation",
                                      filtered.removed_by_policy)
            policy_span.set_attribute("policy.remaining", len(filtered.ads))

        # Step 4: Run the bidding auction
        with tracer.start_as_current_span("ads.auction") as auction_span:
            auction_result = run_ad_auction(filtered.ads, user_profile)
            auction_span.set_attribute("auction.participants", len(filtered.ads))
            auction_span.set_attribute("auction.winning_bid_cpm",
                                       auction_result.winning_bid)
            auction_span.set_attribute("auction.winning_advertiser",
                                       auction_result.advertiser_id)
            auction_span.set_attribute("auction.second_price_cpm",
                                       auction_result.second_price)
            auction_span.set_attribute("auction.type", "second_price")

        # Step 5: Prepare the ad creative for rendering
        with tracer.start_as_current_span("ads.prepare_creative") as creative_span:
            creative = prepare_ad_creative(auction_result.ad_id, context)
            creative_span.set_attribute("creative.type", creative.creative_type)
            creative_span.set_attribute("creative.format", creative.format)

        span.set_attribute("ads.ad_served", True)
        span.set_attribute("ads.winning_ad_id", auction_result.ad_id)
        return AdResponse(ad=creative, tracking_id=auction_result.tracking_id)
```

## Tracing Audience Segmentation

Audience segments are precomputed groups of users that advertisers can target. The segmentation pipeline runs offline but you need to trace it to ensure segments are built correctly and on time.

```python
def build_audience_segment(segment_id: str, segment_definition: dict):
    with tracer.start_as_current_span("ads.segment.build") as span:
        span.set_attribute("segment.id", segment_id)
        span.set_attribute("segment.name", segment_definition["name"])
        span.set_attribute("segment.type", segment_definition["type"])

        # Evaluate the segment criteria against the user base
        with tracer.start_as_current_span("ads.segment.evaluate_criteria") as eval_span:
            criteria = segment_definition["criteria"]
            eval_span.set_attribute("criteria.count", len(criteria))
            eval_span.set_attribute("criteria.types",
                str([c["type"] for c in criteria]))

            matching_users = evaluate_segment_criteria(criteria)
            eval_span.set_attribute("segment.matched_users", len(matching_users))

        # Compare with the previous segment version to detect big changes
        with tracer.start_as_current_span("ads.segment.diff") as diff_span:
            previous = load_previous_segment(segment_id)
            if previous:
                added = len(matching_users - previous.user_set)
                removed = len(previous.user_set - matching_users)
                diff_span.set_attribute("diff.users_added", added)
                diff_span.set_attribute("diff.users_removed", removed)

                change_pct = (added + removed) / max(len(previous.user_set), 1) * 100
                diff_span.set_attribute("diff.change_pct", round(change_pct, 2))

                if change_pct > 20:
                    diff_span.add_event("large_segment_change", {
                        "change_pct": change_pct,
                        "added": added,
                        "removed": removed
                    })

        # Publish the updated segment
        with tracer.start_as_current_span("ads.segment.publish"):
            publish_segment(segment_id, matching_users)
            span.set_attribute("segment.published", True)
            span.set_attribute("segment.size", len(matching_users))
```

## Tracing the Ad Auction

The auction is the most latency-sensitive component. It must complete in single-digit milliseconds.

```python
def run_ad_auction(eligible_ads: list, user_profile):
    with tracer.start_as_current_span("ads.auction.execute") as span:
        span.set_attribute("auction.eligible_ads", len(eligible_ads))

        # Calculate effective bid for each ad (bid * predicted CTR)
        bids = []
        for ad in eligible_ads:
            with tracer.start_as_current_span("ads.auction.score_ad") as score_span:
                score_span.set_attribute("ad.id", ad.ad_id)
                score_span.set_attribute("ad.base_bid_cpm", ad.bid_cpm)

                # Predict click-through rate
                predicted_ctr = predict_ctr(ad, user_profile)
                effective_bid = ad.bid_cpm * predicted_ctr
                score_span.set_attribute("ad.predicted_ctr", round(predicted_ctr, 6))
                score_span.set_attribute("ad.effective_bid", round(effective_bid, 4))

                bids.append({"ad": ad, "effective_bid": effective_bid})

        # Sort by effective bid and select winner
        bids.sort(key=lambda x: x["effective_bid"], reverse=True)
        winner = bids[0]
        second_price = bids[1]["effective_bid"] if len(bids) > 1 else 0

        span.set_attribute("auction.winner_ad_id", winner["ad"].ad_id)
        span.set_attribute("auction.winner_effective_bid", winner["effective_bid"])
        span.set_attribute("auction.second_price", second_price)

        return AuctionResult(
            ad_id=winner["ad"].ad_id,
            advertiser_id=winner["ad"].advertiser_id,
            winning_bid=winner["effective_bid"],
            second_price=second_price
        )
```

## Ad Serving Metrics

```python
ad_serving_latency = meter.create_histogram(
    "ads.serving.latency_ms",
    description="Total time to select and serve an ad",
    unit="ms"
)

auction_latency = meter.create_histogram(
    "ads.auction.latency_ms",
    description="Ad auction execution time",
    unit="ms"
)

ads_served = meter.create_counter(
    "ads.served.total",
    description="Total ads served by placement"
)

segment_build_duration = meter.create_histogram(
    "ads.segment.build_duration_seconds",
    description="Time to build an audience segment",
    unit="s"
)

no_fill_rate = meter.create_counter(
    "ads.no_fill.total",
    description="Ad requests that returned no ad"
)
```

## Why This Matters

Ad revenue depends on fast, accurate targeting. If the ad serving pipeline takes 50ms instead of 5ms, it delays the entire feed load. If audience segments are stale or incorrectly built, advertisers waste budget on the wrong users and your platform loses credibility. OpenTelemetry tracing across the full ad serving pipeline, from user profiling through auction to creative delivery, gives you the data to keep both latency and targeting quality where they need to be.
