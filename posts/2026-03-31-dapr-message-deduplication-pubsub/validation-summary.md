# Validation Summary: How to Handle Message Deduplication with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, CloudEvents)
- Python (Flask)
- PostgreSQL (psycopg2, ON CONFLICT / upsert)
- Redis (SET with NX and EX for deduplication)
- CloudEvents specification

## Sources Consulted
- Dapr Pub/Sub overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr Pub/Sub CloudEvents: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Publish API reference: https://docs.dapr.io/reference/api/pubsub_api/
- CloudEvents specification: https://github.com/cloudevents/spec/blob/v1.0/spec.md
- Redis SET command documentation: https://redis.io/commands/set/
- PostgreSQL INSERT ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found

1. **Missing `import os` in Strategy 1 code example**: The code called `os.getenv('DATABASE_URL')` but did not import the `os` module. Added `import os` to the imports.

2. **Incorrect custom CloudEvent ID curl command**: The curl command used `-H "metadata.cloudevent.id: order-ORD-1001-v1"` to set a custom CloudEvent ID via an HTTP header. Dapr metadata is passed as URL query parameters, not HTTP headers. Fixed to use the query parameter syntax: `?metadata.cloudevent.id=order-ORD-1001-v1`.

## Review Notes
- The `json` import in Strategy 2 is unused but harmless; left as-is since it's a common import in real pub/sub handlers that parse nested data.
- The post correctly identifies that Dapr sets `type` to `"com.dapr.event.sent"` in its CloudEvents envelope.
- The at-least-once delivery guarantee claim is accurate per Dapr documentation.
- The subscriber pattern (HTTP POST endpoint returning 200) is correct per Dapr's subscriber protocol.
- The publish API path format `/v1.0/publish/{pubsubname}/{topic}` is correct.
- Strategy 3 (database deduplication table) has a race condition window between the INSERT and the actual processing — if the service crashes after recording the message ID but before processing, the message would be marked as processed but never actually handled. This is a known trade-off with this pattern and is acceptable for a tutorial-level discussion.
