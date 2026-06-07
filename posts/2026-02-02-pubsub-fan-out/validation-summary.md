# Validation Summary: How to Build Pub/Sub Event Fan-Out Architectures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS SNS (Simple Notification Service)
- AWS SQS (Simple Queue Service)
- AWS CloudWatch (metrics and alarms)
- Google Cloud Pub/Sub
- Redis Pub/Sub
- Python (boto3, google-cloud-pubsub, redis-py)
- Dead Letter Queue (DLQ) patterns
- Message filtering / subscription filter policies
- Auto-scaling consumer patterns
- Mermaid diagrams

## Sources Consulted
- AWS SNS Developer Guide — Fanout to SQS, RawMessageDelivery, subscription filter policies — https://docs.aws.amazon.com/sns/latest/dg/
- AWS SQS Developer Guide — CreateQueue attributes (VisibilityTimeout, MessageRetentionPeriod max 14 days, ReceiveMessageWaitTimeSeconds max 20s), ReceiveMessage limits — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/
- boto3 reference for SNS/SQS/CloudWatch clients — https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/
- AWS SNS subscription filter policy numeric matching syntax — https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Google Cloud Pub/Sub RPC reference — `ExpirationPolicy`, `Subscription`, `message_retention_duration` (max 7 days standard, up to 31 days with `retain_acked_messages`) — https://cloud.google.com/pubsub/docs/reference/rpc/google.pubsub.v1
- Google Cloud Pub/Sub subscription properties — https://cloud.google.com/pubsub/docs/subscription-properties
- google-cloud-pubsub Python SDK — `PublisherClient`, `SubscriberClient.subscribe()` (streaming pull), `PublisherOptions(enable_message_ordering=True)`, `FlowControl` — https://googleapis.dev/python/pubsub/latest/
- redis-py documentation — `Redis.publish()`, `Redis.pubsub()`, `subscribe()`, `psubscribe()`, `get_message()` — https://redis-py.readthedocs.io/
- Python `datetime` documentation — `datetime.utcnow()` deprecation in Python 3.12+ — https://docs.python.org/3/library/datetime.html

## Issues Found

1. **Google Cloud Pub/Sub subscription "never expire" configuration was incorrect.**
   - **Was:** `"expiration_policy": {"ttl": {"seconds": 0}}  # Never expire`
   - **Changed to:** `"expiration_policy": {}  # Empty policy (ttl unset) means never expire`
   - **Why:** Per the Pub/Sub `ExpirationPolicy` RPC reference, the documented way to make a subscription never expire is to set `expiration_policy` with the `ttl` field **unset**. Setting `ttl` requires a minimum of 1 day; a 0-second TTL is below the documented minimum. While proto3 default-value semantics may cause `{"seconds": 0}` to be serialized identically to "unset" in some SDK versions, this is an implementation-level coincidence rather than a documented behavior, and code that performs presence checks could reject it. Using an empty `expiration_policy` is the unambiguously correct, documented form.

2. **Deprecated Python API: `datetime.utcnow()`.**
   - **Was:** `from datetime import datetime` ... `datetime.utcnow().isoformat()`
   - **Changed to:** `from datetime import datetime, timezone` ... `datetime.now(timezone.utc).isoformat()`
   - **Why:** `datetime.utcnow()` is deprecated as of Python 3.12 because it returns a naive datetime that misleadingly represents UTC. The recommended replacement is the timezone-aware `datetime.now(timezone.utc)`, which yields an ISO-8601 string with a `+00:00` UTC offset suffix — clearer for downstream consumers of DLQ metadata.

## Review Notes

- AWS SNS/SQS code is correct: queue attributes are within service limits (`VisibilityTimeout` 300s, `MessageRetentionPeriod` 1,209,600s = 14 days max, `ReceiveMessageWaitTimeSeconds` 20s max long-polling), the SQS access policy condition correctly uses `aws:SourceArn` with `ArnEquals`, and `RawMessageDelivery=true` correctly justifies parsing `message['Body']` directly (no SNS envelope unwrap needed).
- SNS subscription filter policy numeric syntax (`{'numeric': ['>=', 1000]}`) and the `DataType: 'Number'` / `StringValue: str(...)` publish-side encoding for numeric attributes are correct per the SNS filter policy documentation.
- Redis pub/sub method `publish_to_pattern` is slightly mis-named — Redis `PUBLISH` always targets a literal channel, not a pattern; only `PSUBSCRIBE` uses glob patterns. The implementation iterates literal channel names, so behavior is correct; the name is a minor cosmetic issue, not a technical error, so left unchanged.
- `from google.api_core import retry` is imported but never used in the GCP section. Cosmetic only — left unchanged.
- The auto-scaling consumer's `adjust_workers()` calls `executor.shutdown(wait=False)` and replaces the executor while in-flight workers may still hold messages with active visibility timeouts; comment in the code already flags this as "for simplicity, in production use more sophisticated thread management," so the caveat is appropriate.
- `message_retention_duration` of 7 days (604,800 s) is within the standard Pub/Sub range (10 minutes to 7 days for standard subscriptions; up to 31 days when `retain_acked_messages` is true).
- The `pubsub_v1.SubscriberClient` instance correctly provides both the GAPIC `create_subscription` method and the high-level streaming-pull `subscribe(subscription_path, callback=..., flow_control=...)` method.
