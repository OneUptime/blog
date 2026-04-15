# Validation Summary: How to Implement Event-Carried State Transfer with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub API, state management API)
- Python / FastAPI
- Pydantic
- httpx (async HTTP client)
- CloudEvents (implicit via Dapr pub/sub envelope)

## Sources Consulted
- Dapr Pub/Sub HTTP API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr State Management HTTP API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Programmatic Subscriptions documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr CloudEvents envelope documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Cross-referenced with other validated Dapr blog posts in this repository (fire-and-forget, event notification, CloudEvents interoperability)

## Issues Found

1. **Missing `import uuid` in publisher code block**: The publisher code called `uuid.uuid4()` to generate an event ID but did not import the `uuid` module. Added `import uuid` to the import section.

2. **Missing `import httpx` and `DAPR_HTTP_PORT` in subscriber code block**: The subscriber (order service) code block used `httpx.AsyncClient()` and referenced `DAPR_HTTP_PORT` without importing or defining them. Since the subscriber is described as a separate service, it needs its own imports. Added `import httpx` and `DAPR_HTTP_PORT = 3500`.

## Review Notes
- The Dapr HTTP API endpoints for publishing (`/v1.0/publish/{pubsubname}/{topic}`), state save (`POST /v1.0/state/{storename}`), and state get (`GET /v1.0/state/{storename}/{key}`) are all correct.
- The programmatic subscription format using `GET /dapr/subscribe` with `pubsubname`, `topic`, and `route` fields is correct. Dapr also supports a `routes` object format, but the singular `route` string format used here is valid.
- The subscriber response statuses `SUCCESS` and `DROP` are correct per Dapr's API reference (valid values: `SUCCESS`, `RETRY`, `DROP`).
- The CloudEvents envelope access pattern (`body.get("data", {})`) is correct — Dapr wraps pub/sub messages in CloudEvents v1.0 format with the payload in the `data` field.
- Pydantic's `.dict()` method is used, which is deprecated in Pydantic v2 in favor of `.model_dump()`. However, `.dict()` still works and the post does not specify a Pydantic version, so this was not changed.
- The `db.customers.save()` call in the publisher is a placeholder for application-specific database logic, which is acceptable for a tutorial.
