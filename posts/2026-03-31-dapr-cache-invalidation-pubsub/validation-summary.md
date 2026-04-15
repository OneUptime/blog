# Validation Summary: How to Implement Cache Invalidation with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, state management building block)
- Python
- FastAPI
- httpx (async HTTP client)
- Pydantic
- CloudEvents (Dapr's event envelope format)

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Pydantic v2 migration guide (model_dump vs dict): https://docs.pydantic.dev/latest/concepts/serialization/

## Issues Found

1. **Incorrect deduplication claim in Summary section** (line 139): The post stated "Dapr handles delivery, retries, and deduplication." Dapr pub/sub provides at-least-once delivery semantics, not deduplication. Duplicate messages are possible and must be handled by the application. Fixed by replacing the sentence to accurately describe at-least-once semantics and noting that cache deletes are idempotent, making duplicate deliveries harmless.

2. **Missing imports in subscriber code block** (lines 63-91): The subscriber code used `httpx.AsyncClient()` and `DAPR_HTTP_PORT` but neither `httpx` was imported nor `DAPR_HTTP_PORT` was defined in that code block. Fixed by adding `import httpx` and `DAPR_HTTP_PORT = 3500` to the subscriber code block.

3. **Deprecated Pydantic API** (line 42): `product.dict()` is deprecated in Pydantic v2 (which is the current version used by modern FastAPI). Fixed by replacing with `product.model_dump()`.

## Review Notes
- The programmatic subscription endpoint (`GET /dapr/subscribe`) is a valid Dapr pattern for declaring subscriptions in code rather than via YAML/CRD. This is correct.
- The Dapr publish URL format (`/v1.0/publish/{pubsubname}/{topic}`) and state delete URL format (`/v1.0/state/{storename}/{key}`) are both correct per official API docs.
- The CloudEvents envelope access pattern (`body.get("data", {})`) is correct -- Dapr wraps published messages in CloudEvents 1.0 format with the payload in the `data` field.
- The subscriber response `{"status": "SUCCESS"}` is correct; valid values are `SUCCESS`, `RETRY`, and `DROP`.
- The bulk invalidation section iterates keys sequentially. For large key sets, parallel deletion or Dapr's bulk state delete endpoint (`POST /v1.0/state/{storename}/bulk`) could be more efficient, but the current approach is functionally correct.
