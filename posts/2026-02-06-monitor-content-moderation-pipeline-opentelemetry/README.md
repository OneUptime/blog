# How to Monitor Content Moderation Pipeline (AI Classification, Policy Check, Human Review) Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Content Moderation, AI Classification, Trust and Safety

Description: Monitor content moderation pipeline latency across AI classification, policy checks, and human review queues using OpenTelemetry tracing.

Content moderation pipelines must balance speed with accuracy. When a user uploads content, it flows through automated AI classifiers, rule-based policy checks, and sometimes human review. Slow moderation means harmful content stays visible too long. Overly aggressive moderation means legitimate content gets blocked. OpenTelemetry tracing helps you measure each stage and understand where delays occur.

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

tracer = trace.get_tracer("moderation.pipeline")
meter = metrics.get_meter("moderation.pipeline")
```

## Tracing the Full Moderation Pipeline

Content enters the pipeline and flows through multiple stages. Each stage can either pass the content, flag it for further review, or reject it outright.

```python
def moderate_content(content_id: str, content_type: str, content_data: dict):
    with tracer.start_as_current_span("moderation.pipeline") as span:
        span.set_attribute("content.id", content_id)
        span.set_attribute("content.type", content_type)  # image, video, text, comment
        span.set_attribute("content.author_id", content_data["author_id"])

        # Stage 1: AI Classification
        with tracer.start_as_current_span("moderation.ai_classification") as ai_span:
            ai_result = run_ai_classifiers(content_id, content_type, content_data)
            ai_span.set_attribute("ai.model_name", ai_result.model_name)
            ai_span.set_attribute("ai.model_version", ai_result.model_version)
            ai_span.set_attribute("ai.overall_safe_score", ai_result.safe_score)
            ai_span.set_attribute("ai.categories_flagged", len(ai_result.flagged_categories))

            for category in ai_result.flagged_categories:
                ai_span.add_event("category_flagged", {
                    "category": category.name,
                    "confidence": category.confidence,
                    "severity": category.severity
                })

        # Stage 2: Policy Rule Checks
        with tracer.start_as_current_span("moderation.policy_check") as policy_span:
            policy_result = run_policy_checks(content_id, content_data, ai_result)
            policy_span.set_attribute("policy.rules_evaluated", policy_result.rules_evaluated)
            policy_span.set_attribute("policy.rules_triggered", policy_result.rules_triggered)
            policy_span.set_attribute("policy.action", policy_result.recommended_action)

            for rule in policy_result.triggered_rules:
                policy_span.add_event("policy_rule_triggered", {
                    "rule_id": rule.rule_id,
                    "rule_name": rule.name,
                    "action": rule.action
                })

        # Stage 3: Determine if human review is needed
        with tracer.start_as_current_span("moderation.routing_decision") as route_span:
            decision = determine_review_path(ai_result, policy_result)
            route_span.set_attribute("routing.needs_human_review", decision.needs_review)
            route_span.set_attribute("routing.auto_action", decision.auto_action)
            route_span.set_attribute("routing.confidence_threshold_met",
                                     decision.confidence_met)

        # Apply the automated action or queue for review
        if decision.needs_review:
            with tracer.start_as_current_span("moderation.queue_for_review") as queue_span:
                review_ticket = queue_human_review(content_id, ai_result, policy_result)
                queue_span.set_attribute("review.ticket_id", review_ticket.ticket_id)
                queue_span.set_attribute("review.priority", review_ticket.priority)
                queue_span.set_attribute("review.queue_name", review_ticket.queue)
                queue_span.set_attribute("review.queue_depth", review_ticket.current_queue_depth)
        else:
            with tracer.start_as_current_span("moderation.apply_auto_action") as action_span:
                apply_moderation_action(content_id, decision.auto_action)
                action_span.set_attribute("action.type", decision.auto_action)
                action_span.set_attribute("action.automated", True)

        span.set_attribute("moderation.final_action", decision.auto_action or "pending_review")
```

## Tracing AI Classifier Details

The AI classification stage often involves multiple models running in parallel: one for nudity detection, another for hate speech, another for violence, etc.

```python
def run_ai_classifiers(content_id: str, content_type: str, content_data: dict):
    with tracer.start_as_current_span("moderation.ai.run_classifiers") as span:
        classifiers = get_classifiers_for_content_type(content_type)
        span.set_attribute("classifiers.count", len(classifiers))

        results = []
        for classifier in classifiers:
            with tracer.start_as_current_span("moderation.ai.classify") as cls_span:
                cls_span.set_attribute("classifier.name", classifier.name)
                cls_span.set_attribute("classifier.category", classifier.category)
                cls_span.set_attribute("classifier.version", classifier.version)

                result = classifier.predict(content_data)
                cls_span.set_attribute("classifier.score", result.score)
                cls_span.set_attribute("classifier.threshold", classifier.threshold)
                cls_span.set_attribute("classifier.flagged", result.score > classifier.threshold)

                results.append(result)

        flagged = [r for r in results if r.flagged]
        span.set_attribute("ai.total_flagged", len(flagged))
        return ClassificationResult(results=results, flagged_categories=flagged)
```

## Tracing Human Review

Human review is the slowest stage. Tracing it helps you measure reviewer throughput and queue wait times.

```python
def complete_human_review(ticket_id: str, reviewer_id: str, decision: str):
    with tracer.start_as_current_span("moderation.human_review.complete") as span:
        span.set_attribute("review.ticket_id", ticket_id)
        span.set_attribute("review.reviewer_id", reviewer_id)
        span.set_attribute("review.decision", decision)  # approve, reject, escalate

        # Calculate time in queue
        ticket = get_review_ticket(ticket_id)
        import time
        queue_wait_seconds = time.time() - ticket.created_at.timestamp()
        span.set_attribute("review.queue_wait_seconds", round(queue_wait_seconds))

        # Calculate review duration (time reviewer spent on this)
        review_duration = time.time() - ticket.assigned_at.timestamp()
        span.set_attribute("review.duration_seconds", round(review_duration))

        # Compare with AI prediction to measure model accuracy
        span.set_attribute("review.ai_agreed", decision == ticket.ai_recommendation)

        # Apply the final action
        with tracer.start_as_current_span("moderation.apply_final_action"):
            apply_moderation_action(ticket.content_id, decision)
```

## Key Moderation Metrics

```python
moderation_latency = meter.create_histogram(
    "moderation.pipeline.latency_ms",
    description="End-to-end moderation pipeline latency",
    unit="ms"
)

ai_classification_latency = meter.create_histogram(
    "moderation.ai.latency_ms",
    description="AI classifier inference latency",
    unit="ms"
)

human_review_queue_depth = meter.create_up_down_counter(
    "moderation.review_queue.depth",
    description="Current number of items awaiting human review"
)

ai_accuracy = meter.create_counter(
    "moderation.ai.accuracy",
    description="AI classifier agreement with human reviewers"
)
```

## Actionable Insights

With these traces, you can answer critical questions: Is the AI classifier for hate speech taking longer than the nudity classifier? How deep is the human review queue and what is the average wait time? What percentage of AI decisions get overturned by human reviewers (which tells you if your model needs retraining)? These are the metrics that trust and safety teams need to keep both the platform safe and the moderation pipeline efficient.
