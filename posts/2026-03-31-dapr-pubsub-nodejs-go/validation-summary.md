# Validation Summary: How to Use Dapr Pub/Sub Between Node.js and Go Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub API
- Dapr Node.js SDK (`@dapr/dapr`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Redis as pub/sub message broker (`pubsub.redis` component)
- Node.js with Express
- Go
- Kubernetes (kubectl commands)

## Sources Consulted
- Dapr Pub/Sub building block documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr Redis Pub/Sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Node.js SDK documentation — https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Go SDK documentation — https://docs.dapr.io/developing-applications/sdks/go/
- Dapr Go SDK source (`service/common` package) — https://github.com/dapr/go-sdk
- Dapr pub/sub dead letter topics documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Cross-referenced with validated Dapr blog posts in this repository (dapr-pubsub-redis, dapr-pubsub-subscribe-topics, dapr-pubsub-subscriptions-code-yaml, dapr-streaming-subscriptions, dapr-real-time-chat)

## Issues Found
1. **Misleading dead letter comment in retry handling example** — The comment `// Permanent failure - send to dead letter` on the `return false, err` line implied that messages are automatically routed to a dead letter topic on permanent failure. In Dapr, returning `(false, err)` drops the message; dead letter routing only occurs if a dead letter topic is explicitly configured in the component or subscription spec. Changed to `// Permanent failure - drop (or dead-letter if configured)` for accuracy.

## Review Notes
- The Node.js SDK usage follows the v3.x constructor pattern (`new DaprClient({ daprHost, daprPort, communicationProtocol })`), which is the current version. Readers using v2.x would need positional arguments instead.
- The Go SDK correctly uses `common.TopicEvent.RawData` (`[]byte`) for raw event payload access and `json.Unmarshal` for deserialization, which is the recommended pattern.
- The `common.Subscription` struct usage with `PubsubName`, `Topic`, and `Route` fields is correct for programmatic subscription in the Go SDK.
- The Redis component YAML uses `apiVersion: dapr.io/v1alpha1`, which remains the current stable API version for Dapr components.
- The retry handling pattern (returning `true` to signal Dapr to redeliver) is correctly explained.
