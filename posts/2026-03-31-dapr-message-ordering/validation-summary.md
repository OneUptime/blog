# Validation Summary: How to Implement Message Ordering with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, state management building block)
- Apache Kafka (as Dapr pub/sub backend)
- Python (httpx, FastAPI)
- CloudEvents (Dapr's event envelope format)

## Sources Consulted
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Kafka Component Reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub Overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/

## Issues Found

### 1. Partition key metadata passed as HTTP headers instead of query parameters
- **What was wrong:** The `metadata.partitionKey` was passed as an HTTP header (`headers={"metadata.partitionKey": order_id}`) in two code blocks (the `publish_order_event` and `publish_ordered_event` functions). According to Dapr's official API documentation, publish metadata must be passed as URL query parameters, not HTTP headers.
- **What was changed:** Updated both code blocks to pass the partition key as a query parameter in the URL (e.g., `?metadata.partitionKey={order_id}`) instead of as an HTTP header.
- **Why:** The Dapr HTTP publish API only reads metadata from query string parameters prefixed with `metadata.`. Passing them as headers would be silently ignored, meaning messages would not be routed to the correct Kafka partition, defeating the entire purpose of the post.

### 2. Unused `asyncio` import
- **What was wrong:** The second code block ("Including Sequence Numbers") imported `asyncio` but never used it.
- **What was changed:** Removed the `import asyncio` line.
- **Why:** Unused imports are dead code and could confuse readers into thinking asyncio is needed for the example.

## Review Notes
- The Dapr component YAML configuration is correct for `pubsub.kafka` with `brokers`, `consumerGroup`, and `authType` metadata fields.
- The consumer response statuses (`"RETRY"` and `"SUCCESS"`) are valid Dapr subscriber response values.
- The state store API usage (GET `/v1.0/state/{storename}/{key}` and POST `/v1.0/state/{storename}` with `[{"key": ..., "value": ...}]`) is correct.
- The CloudEvent data extraction pattern (`body.get("data", {})`) is appropriate for Dapr's default CloudEvent envelope.
- The `get_last_sequence` function handles the "key not found" case adequately — Dapr returns 204 with empty body for missing keys, so the `resp.status_code == 200 and resp.text` check works correctly in practice.
- The post correctly notes that in-memory sequence tracking should be replaced with Dapr state store persistence for production use.
