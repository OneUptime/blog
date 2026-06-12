# Validation Summary: How to Implement Exactly-Once Processing with Pub/Sub

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub exactly-once delivery
- Python
- google-cloud-pubsub Python client
- Redis and redis-py
- SQLAlchemy
- Prometheus client metrics
- Mermaid diagrams

## Sources Consulted
- Google Cloud Pub/Sub exactly-once delivery documentation: https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub exactly-once subscriber sample: https://docs.cloud.google.com/pubsub/docs/samples/pubsub-subscriber-exactly-once
- googleapis/python-pubsub official Python samples: https://github.com/googleapis/python-pubsub/blob/main/samples/snippets/subscriber.py
- Google Cloud Pub/Sub Python FlowControl reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.FlowControl
- Google Cloud Pub/Sub Python PublisherClient reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETNX command documentation: https://redis.io/docs/latest/commands/setnx/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- SQLAlchemy 2.0 migration documentation: https://docs.sqlalchemy.org/en/latest/changelog/migration_20.html

## Issues Found
- The post described exactly-once delivery as messages being delivered exactly one time. Updated the wording to match Pub/Sub semantics: successfully acknowledged messages are not redelivered, enabling once-like processing behavior.
- The Google Cloud Pub/Sub exactly-once section omitted the pull-subscription and single-region scope of the guarantee. Added the official limitations and clarified that the guarantee is based on Pub/Sub message IDs.
- The subscription creation example built a topic path from `SubscriberClient`. Updated it to follow the official Python sample pattern by using `PublisherClient.topic_path`.
- The subscriber examples used `message.ack()` while claiming to handle exactly-once acknowledgment failures. Updated them to use `message.ack_with_response().result(...)`, which is the Python client API that exposes acknowledgment success or failure for exactly-once delivery.
- The Redis idempotency examples used `SETNX` followed by `EXPIRE`, which is non-atomic and uses a command Redis marks as deprecated in favor of `SET ... NX`. Updated the examples to use atomic `redis.set(..., nx=True, ex=...)`.
- The SQLAlchemy example imported `declarative_base` from the legacy `sqlalchemy.ext.declarative` path. Updated it to `sqlalchemy.orm.declarative_base`.
- The database idempotency text claimed the code used `INSERT with ON CONFLICT`, but the example actually uses an optimistic insert plus `IntegrityError` handling. Corrected the description.
- The publisher configuration example defined retry settings but never applied them. Removed the unused configuration and used `PublisherOptions(enable_message_ordering=True)` for the ordering-key behavior described.
- The subscriber configuration snippet used `Optional` without importing it. Added the missing import.
- The FlowControl comment described `max_lease_duration` as a number of lease extensions. Corrected it to describe the maximum time to keep extending a message lease.
- The subscription configuration comment implied message ordering is required for exactly-once in many cases. Corrected it to say ordering is optional and should be enabled when the workload needs per-key ordered delivery.
- The complete implementation used plain `ack()` in one path and could expire its Redis lock too quickly for normal lease-managed processing. Updated it to use `ack_with_response()` consistently and a safer minimum lock TTL.

## Review Notes
All Python code fences compile under `python3`. The examples remain illustrative rather than complete production code; future improvements could include stronger Redis lock ownership checks before deletion and explicit regional Pub/Sub endpoints for subscribers running outside Google Cloud or across multiple regions.
