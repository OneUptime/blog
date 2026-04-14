# Validation Summary: How to Use Dapr Pub/Sub Outbox Pattern

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (1.12+)
- Dapr Pub/Sub building block
- Dapr State Management building block
- Transactional Outbox Pattern
- PostgreSQL (as state store)
- Python (requests, Flask)
- Go (net/http, encoding/json)

## Sources Consulted
- Dapr Outbox documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-outbox/
- Dapr State Management Transactions API: https://docs.dapr.io/reference/api/state_api/#state-transactions
- Dapr State Store Component metadata spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Preview Features documentation: https://docs.dapr.io/operations/configuration/preview-features/

## Issues Found
1. **"Enabling the Outbox Feature" section showed wrong Configuration YAML (Critical):**
   - **What was wrong:** The section displayed a Dapr Configuration resource enabling the `ActorStateTTL` feature flag, which is entirely unrelated to the outbox pattern. `ActorStateTTL` enables TTL support for actor state — it has nothing to do with pub/sub or the outbox.
   - **What was changed:** Replaced the incorrect Configuration YAML with a correct explanation that the outbox pattern is enabled through metadata fields on the state store component (`outboxPublishPubsub`, `outboxPublishTopic`, etc.), not via a Configuration-level feature flag. Added a list of the key metadata fields and pointed to the next section for a complete example.
   - **Why:** The Dapr outbox pattern does not require a feature flag in the Configuration resource. It is activated by setting the appropriate metadata on the state store component, which was already correctly shown in the subsequent "Configuring the State Store for Outbox" section.

## Review Notes
- The HTTP API, Python, and Go examples pass per-request transaction metadata keys (`outbox.topic`, `outbox.pubsub`, `outbox.cloudevent.type`). The primary mechanism for configuring the outbox is at the component level (via `outboxPublishPubsub` and `outboxPublishTopic` in the state store YAML). These per-request keys may serve as overrides but are not prominently documented. The examples will work correctly because the component-level config drives the outbox behavior.
- The Go example does not close `resp.Body` (should use `defer resp.Body.Close()`) and ignores the error from `json.Marshal`. These are Go best practices but acceptable simplifications for a blog tutorial.
- The `outboxPubsub` metadata field in the state store component YAML is valid — it specifies the pub/sub used internally by Dapr for the outbox polling mechanism, which can differ from the `outboxPublishPubsub` target.
- The subscriber example correctly uses Dapr's programmatic subscription approach via the `/dapr/subscribe` endpoint.
- The Dapr version requirement (1.12+) is accurate — the outbox pattern was introduced in Dapr 1.12.
