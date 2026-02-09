# How to Monitor Customer Review and Rating Submission Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Customer Reviews, Content Pipeline, E-Commerce

Description: Monitor and trace the entire customer review and rating submission pipeline including moderation and aggregation with OpenTelemetry.

Customer reviews drive purchasing decisions. When a customer takes the time to write a review, that submission passes through several stages: validation, spam detection, content moderation, sentiment analysis, rating aggregation, and finally publishing to the product page. If any stage fails or is slow, the review might silently disappear, frustrating the customer and costing you valuable social proof. OpenTelemetry lets you monitor this entire pipeline end to end.

## The Review Submission Pipeline

A review goes through these stages after a customer clicks "Submit":

1. Input validation and sanitization
2. Spam/bot detection
3. Content moderation (profanity, abuse, policy compliance)
4. Sentiment analysis
5. Rating aggregation update
6. Search index update
7. Notification to the seller

Let's instrument each stage.

## Core Instrumentation Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("review.pipeline")
meter = metrics.get_meter("review.pipeline")

# Metrics for pipeline health
review_submissions = meter.create_counter(
    "review.submissions.total",
    description="Total review submissions"
)

review_pipeline_duration = meter.create_histogram(
    "review.pipeline.duration",
    unit="ms",
    description="Total time to process a review through the pipeline"
)

review_stage_duration = meter.create_histogram(
    "review.stage.duration",
    unit="ms",
    description="Time spent in each pipeline stage"
)

reviews_rejected = meter.create_counter(
    "review.rejected.total",
    description="Reviews rejected by stage"
)
```

## Instrumenting the Review Pipeline

```python
import time

class ReviewPipeline:
    def __init__(self, spam_detector, moderator, sentiment_analyzer,
                 rating_aggregator, search_indexer, notification_svc):
        self.spam_detector = spam_detector
        self.moderator = moderator
        self.sentiment_analyzer = sentiment_analyzer
        self.rating_aggregator = rating_aggregator
        self.search_indexer = search_indexer
        self.notification_svc = notification_svc

    def submit_review(self, review: dict):
        pipeline_start = time.time()

        with tracer.start_as_current_span("review.submit") as span:
            span.set_attribute("review.product_id", review["product_id"])
            span.set_attribute("review.user_id", review["user_id"])
            span.set_attribute("review.rating", review["rating"])
            span.set_attribute("review.text_length", len(review["text"]))
            span.set_attribute("review.has_images", len(review.get("images", [])) > 0)

            review_submissions.add(1, {
                "review.rating": str(review["rating"]),
                "review.has_text": str(len(review["text"]) > 0)
            })

            # Stage 1: Validate input
            validated = self._run_stage("validate", self._validate, review)
            if not validated:
                return {"status": "rejected", "reason": "validation_failed"}

            # Stage 2: Spam detection
            is_spam = self._run_stage("spam_check",
                                       self.spam_detector.check, review)
            if is_spam:
                reviews_rejected.add(1, {"stage": "spam_check"})
                span.set_attribute("review.rejected_by", "spam_check")
                return {"status": "rejected", "reason": "spam_detected"}

            # Stage 3: Content moderation
            mod_result = self._run_stage("moderate",
                                          self.moderator.check, review)
            if mod_result["action"] == "reject":
                reviews_rejected.add(1, {"stage": "moderation"})
                span.set_attribute("review.rejected_by", "moderation")
                span.set_attribute("review.moderation_reason", mod_result["reason"])
                return {"status": "rejected", "reason": mod_result["reason"]}

            # Stage 4: Sentiment analysis
            sentiment = self._run_stage("sentiment",
                                         self.sentiment_analyzer.analyze,
                                         review["text"])
            review["sentiment_score"] = sentiment["score"]
            review["sentiment_label"] = sentiment["label"]
            span.set_attribute("review.sentiment", sentiment["label"])

            # Stage 5: Update rating aggregation
            self._run_stage("aggregate_rating",
                           self.rating_aggregator.add_rating,
                           review["product_id"], review["rating"])

            # Stage 6: Update search index
            self._run_stage("index_review",
                           self.search_indexer.index_review, review)

            # Stage 7: Notify seller
            self._run_stage("notify_seller",
                           self.notification_svc.notify_new_review, review)

            # Record total pipeline duration
            total_duration = (time.time() - pipeline_start) * 1000
            review_pipeline_duration.record(total_duration, {
                "review.outcome": "published"
            })

            span.set_attribute("review.outcome", "published")
            return {"status": "published", "review_id": review["id"]}

    def _run_stage(self, stage_name: str, func, *args):
        """Execute a pipeline stage with timing and error tracking."""
        with tracer.start_as_current_span(f"review.stage.{stage_name}") as span:
            start = time.time()
            try:
                result = func(*args)
                duration = (time.time() - start) * 1000

                review_stage_duration.record(duration, {
                    "stage": stage_name
                })
                span.set_attribute("stage.duration_ms", duration)

                return result
            except Exception as e:
                duration = (time.time() - start) * 1000
                span.set_status(StatusCode.ERROR, str(e))
                span.record_exception(e)

                review_stage_duration.record(duration, {
                    "stage": stage_name,
                    "stage.error": True
                })
                raise
```

## Instrumenting the Content Moderation Step

The moderation step deserves extra attention because it often calls external APIs and can be the slowest stage.

```python
class ContentModerator:
    def check(self, review: dict):
        with tracer.start_as_current_span("moderation.check") as span:
            text = review["text"]
            span.set_attribute("moderation.text_length", len(text))

            # Run local profanity filter first (fast)
            with tracer.start_as_current_span("moderation.profanity_filter"):
                local_result = self._local_profanity_check(text)
                if local_result["flagged"]:
                    return {"action": "reject", "reason": "profanity"}

            # Run ML-based moderation (slower, possibly external)
            with tracer.start_as_current_span("moderation.ml_check") as ml_span:
                ml_result = self._ml_moderation_api(text)
                ml_span.set_attribute("moderation.ml_score", ml_result["score"])
                ml_span.set_attribute("moderation.ml_categories",
                                      str(ml_result["flagged_categories"]))

                if ml_result["score"] > 0.8:
                    return {"action": "reject", "reason": "policy_violation"}

            # Check images if present
            if review.get("images"):
                with tracer.start_as_current_span("moderation.image_check") as img_span:
                    img_span.set_attribute("moderation.image_count",
                                          len(review["images"]))
                    for img_url in review["images"]:
                        img_result = self._check_image(img_url)
                        if not img_result["safe"]:
                            return {"action": "reject", "reason": "inappropriate_image"}

            return {"action": "approve", "reason": None}
```

## Tracking Rating Aggregation Accuracy

The rating aggregation step updates the product's average rating. Bugs here can silently corrupt the displayed rating for millions of product views.

```python
class RatingAggregator:
    def add_rating(self, product_id: str, new_rating: int):
        with tracer.start_as_current_span("rating.aggregate") as span:
            # Fetch current aggregation
            current = self.db.get_rating_aggregate(product_id)
            span.set_attribute("rating.previous_avg", current["average"])
            span.set_attribute("rating.previous_count", current["count"])

            # Calculate new average
            new_count = current["count"] + 1
            new_average = ((current["average"] * current["count"]) + new_rating) / new_count

            span.set_attribute("rating.new_avg", round(new_average, 2))
            span.set_attribute("rating.new_count", new_count)
            span.set_attribute("rating.change",
                             round(new_average - current["average"], 4))

            self.db.update_rating_aggregate(product_id, new_average, new_count)
```

## Key Alerts to Configure

Based on these metrics, set up the following alerts:

- **Pipeline duration p95 above 5 seconds**: Reviews should process within a few seconds. Anything longer and the customer might think their review was lost.
- **Rejection rate spike above 30%**: A sudden increase in rejections usually means the moderation service is misconfigured or returning false positives.
- **Moderation ML check latency above 2 seconds**: External moderation APIs can degrade, and this directly impacts the user experience.
- **Rating aggregation errors**: Any error here is critical because it corrupts product ratings for all future visitors.

With this instrumentation, you have full visibility into every review from submission to publication, and you can quickly identify whether a "lost review" was rejected by spam filters, stuck in moderation, or hit an error in the search indexer.
