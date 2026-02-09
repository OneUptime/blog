# How to Instrument Content Moderation Pipeline (AI Classification, Human Review Queue) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Content Moderation, AI Pipeline, Observability

Description: Instrument your content moderation pipeline covering AI classification and human review queues with OpenTelemetry tracing.

Content moderation pipelines sit at the intersection of machine learning and human judgment. User-submitted content first passes through AI classifiers that flag potentially harmful material, and flagged items go into a human review queue. The performance of this pipeline directly affects both user experience (how quickly content becomes visible) and platform safety (how quickly harmful content is removed). OpenTelemetry helps you monitor both dimensions.

## Pipeline Architecture

A typical moderation pipeline has these stages:

1. Content submission triggers moderation
2. AI classifier analyzes the content (text, image, video)
3. Based on confidence scores, content is auto-approved, auto-rejected, or sent to human review
4. Human reviewers make final decisions on edge cases
5. Actions are applied (publish, remove, age-gate, etc.)

## Instrumenting the AI Classification Stage

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("moderation.pipeline", "1.0.0")
meter = metrics.get_meter("moderation.metrics", "1.0.0")

# Classification latency by content type and model
classification_latency = meter.create_histogram(
    name="moderation.classification.latency",
    description="Time to classify content using AI model",
    unit="ms",
)

# Classification result distribution
classification_results = meter.create_counter(
    name="moderation.classification.results",
    description="Count of classification results by decision",
)

# Confidence score distribution
confidence_scores = meter.create_histogram(
    name="moderation.classification.confidence",
    description="AI model confidence scores for classification decisions",
)

# Queue metrics
review_queue_depth = meter.create_up_down_counter(
    name="moderation.review_queue.depth",
    description="Number of items currently in the human review queue",
)

human_review_latency = meter.create_histogram(
    name="moderation.human_review.latency",
    description="Time from item entering review queue to human decision",
    unit="s",
)


def moderate_content(content_item):
    """Run the full moderation pipeline on a content item."""
    with tracer.start_as_current_span("moderation.pipeline") as span:
        span.set_attribute("content.id", content_item.id)
        span.set_attribute("content.type", content_item.content_type)
        span.set_attribute("content.author_id", content_item.author_id)

        # Stage 1: AI Classification
        classification = run_ai_classification(content_item)

        # Stage 2: Route based on classification
        if classification.decision == "auto_approve":
            apply_action(content_item, "publish")
            return "published"

        elif classification.decision == "auto_reject":
            apply_action(content_item, "remove")
            return "removed"

        else:
            # Needs human review
            enqueue_for_review(content_item, classification)
            return "pending_review"


def run_ai_classification(content_item):
    """Run AI classifiers on the content."""
    with tracer.start_as_current_span("moderation.ai.classify") as span:
        start = time.time()

        content_type = content_item.content_type
        span.set_attribute("content.type", content_type)

        # Run the appropriate classifier based on content type
        if content_type == "text":
            result = text_classifier.predict(content_item.text)
        elif content_type == "image":
            result = image_classifier.predict(content_item.image_url)
        elif content_type == "video":
            result = video_classifier.predict(content_item.video_url)
        else:
            result = generic_classifier.predict(content_item)

        elapsed_ms = (time.time() - start) * 1000

        # Record classification details on the span
        span.set_attribute("classification.model", result.model_name)
        span.set_attribute("classification.model_version", result.model_version)
        span.set_attribute("classification.confidence", result.confidence)
        span.set_attribute("classification.categories", str(result.flagged_categories))
        span.set_attribute("classification.decision", result.decision)

        metric_attrs = {
            "content_type": content_type,
            "model": result.model_name,
        }

        # Record metrics
        classification_latency.record(elapsed_ms, metric_attrs)
        confidence_scores.record(result.confidence, metric_attrs)
        classification_results.add(1, {
            **metric_attrs,
            "decision": result.decision,
        })

        # Log individual flagged categories for deeper analysis
        for category in result.flagged_categories:
            span.add_event("category_flagged", attributes={
                "category": category.name,
                "score": category.score,
            })

        return result
```

## Instrumenting the Human Review Queue

The human review stage is where content sits waiting for a moderator. Tracking queue depth and wait time is critical for staffing decisions.

```python
def enqueue_for_review(content_item, classification):
    """Add a content item to the human review queue."""
    with tracer.start_as_current_span("moderation.enqueue") as span:
        priority = calculate_priority(classification)

        span.set_attribute("review.priority", priority)
        span.set_attribute("classification.confidence", classification.confidence)
        span.set_attribute("content.id", content_item.id)

        queue_item = {
            "content_id": content_item.id,
            "content_type": content_item.content_type,
            "classification": classification.to_dict(),
            "priority": priority,
            "enqueued_at": time.time(),
            "trace_context": get_serialized_context(),
        }

        review_queue.push(queue_item)
        review_queue_depth.add(1, {
            "content_type": content_item.content_type,
            "priority": priority,
        })


def handle_human_review(queue_item, reviewer_id, decision):
    """Process a human reviewer's decision."""

    # Restore the trace context from when the item was first submitted
    ctx = deserialize_context(queue_item["trace_context"])

    with tracer.start_as_current_span("moderation.human_review", context=ctx) as span:
        # Calculate how long the item waited in the queue
        wait_time = time.time() - queue_item["enqueued_at"]

        span.set_attribute("content.id", queue_item["content_id"])
        span.set_attribute("reviewer.id", reviewer_id)
        span.set_attribute("review.decision", decision)
        span.set_attribute("review.wait_time_s", wait_time)
        span.set_attribute("review.priority", queue_item["priority"])

        metric_attrs = {
            "content_type": queue_item["content_type"],
            "priority": queue_item["priority"],
        }

        human_review_latency.record(wait_time, metric_attrs)

        # Track agreement between AI and human
        ai_decision = queue_item["classification"]["decision"]
        agreed = (
            (decision == "approve" and ai_decision == "auto_approve")
            or (decision == "reject" and ai_decision == "auto_reject")
        )
        span.set_attribute("review.ai_human_agreement", agreed)

        # Apply the final action
        if decision == "approve":
            apply_action_by_id(queue_item["content_id"], "publish")
        elif decision == "reject":
            apply_action_by_id(queue_item["content_id"], "remove")
        elif decision == "escalate":
            escalate_to_senior_reviewer(queue_item)

        review_queue_depth.add(-1, metric_attrs)
```

## Tracking AI Model Accuracy Over Time

By comparing AI decisions with human review outcomes, you can monitor model drift.

```python
ai_human_agreement = meter.create_counter(
    name="moderation.ai_human.agreement",
    description="Cases where AI and human reviewer agreed",
)

ai_human_disagreement = meter.create_counter(
    name="moderation.ai_human.disagreement",
    description="Cases where AI and human reviewer disagreed",
)

def record_ai_accuracy(ai_decision, human_decision, content_type, model_name):
    attrs = {
        "content_type": content_type,
        "model": model_name,
        "ai_decision": ai_decision,
        "human_decision": human_decision,
    }

    if decisions_agree(ai_decision, human_decision):
        ai_human_agreement.add(1, attrs)
    else:
        ai_human_disagreement.add(1, attrs)
```

## Dashboard Priorities

For a moderation pipeline, your dashboard should focus on:

- **Classification latency by content type**: Video classification is inherently slower than text. Set appropriate expectations for each.
- **Auto-approve/auto-reject/review split**: The ratio tells you how much human work the AI is saving. If the review queue percentage grows, the model might need retraining.
- **Queue depth over time**: A growing queue means you need more reviewers or the AI is sending too many borderline cases.
- **Human review wait time**: This directly impacts how long potentially harmful content stays visible, or how long safe content is unnecessarily hidden.
- **AI-human agreement rate**: A declining agreement rate signals model drift. Time to retrain.
- **Review decisions by reviewer**: Helps identify reviewers who might need calibration or additional training.

## Alerting

- Review queue depth exceeding capacity-based thresholds
- AI classification latency p95 exceeding 2 seconds for any content type
- AI-human disagreement rate climbing above 20%
- Human review wait time p50 exceeding your safety SLA (for example, 30 minutes for high-priority items)

The trace context linking the original submission through AI classification to human review gives you a complete timeline for every content item. When regulators or trust-and-safety teams ask how long it took to action a specific piece of content, you can answer with exact timestamps from the trace.
