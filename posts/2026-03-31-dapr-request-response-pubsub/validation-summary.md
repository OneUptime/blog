# Validation Summary: How to Implement Request-Response over Pub/Sub with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block with Redis backend
- Dapr HTTP API (publish endpoint, programmatic subscriptions)
- Python / Flask
- CloudEvents (implicit via Dapr Pub/Sub delivery)

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub overview and CloudEvents: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr programmatic subscriptions: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Redis Pub/Sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found
1. **CloudEvents envelope not unwrapped in subscriber handlers (both services)**: Dapr Pub/Sub delivers messages to subscribers wrapped in a CloudEvents envelope by default. The actual published payload is nested inside the `data` field of the envelope. Both the requester's `/responses` handler and the responder's `/requests` handler were accessing `correlationId`, `replyTo`, `result`, and `payload` directly from the top-level event object (`event.get('correlationId')`), which would always return `None`. Fixed both handlers to first extract `data = event.get('data', {})` and then read fields from `data`. This was a critical bug that would have prevented the pattern from working at all.

## Review Notes
- The Dapr component YAML, publish API URL format (`/v1.0/publish/<pubsubname>/<topic>`), and programmatic subscription format are all correct.
- The `dapr run` commands use correct flags (`--app-id`, `--app-port`, `--dapr-http-port`, `--`).
- The polling-based timeout function is a valid simple approach. For production use, an async approach (e.g., using `asyncio` with `asyncio.Event`) would be more efficient than busy-waiting with `time.sleep`.
- The code snippets omit `app.run()` calls and `if __name__ == '__main__'` blocks, which is acceptable for tutorial-style snippets but readers should be aware they need to add those.
- The in-memory `pending_requests` dict approach only works for single-process deployments. The post could note this limitation for production scenarios where multiple instances of the requester might run.
