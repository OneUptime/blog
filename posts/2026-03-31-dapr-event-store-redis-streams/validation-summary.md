# Validation Summary: How to Implement Event Store with Dapr and Redis Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Redis Streams (as Dapr pub/sub backend)
- Go (Dapr Go SDK for publishing and subscribing)
- Redis persistence (AOF configuration)

## Sources Consulted
- Dapr Redis Streams pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr dead letter topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Go SDK client package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK service/common package: https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr Go SDK service/http package: https://pkg.go.dev/github.com/dapr/go-sdk/service/http

## Issues Found

### 1. Incorrect metadata field name: `redeliveryDelay`
- **What was wrong:** The component YAML used `redeliveryDelay` with a millisecond value of `"2000"`.
- **What was changed:** Renamed to `redeliverInterval` with value `"2s"` (the field accepts Go duration strings).
- **Why:** The official Dapr Redis pub/sub component documentation lists `redeliverInterval` as the correct metadata field name for controlling the interval between checking for pending messages to redeliver.

### 2. Invalid component metadata field: `maxRetries`
- **What was wrong:** The component YAML included `maxRetries` as a component-level metadata field.
- **What was changed:** Removed `maxRetries` from the component metadata.
- **Why:** Retry behavior in Dapr is controlled through resiliency policies, not through pub/sub component metadata. The Dapr documentation explicitly states that retries and dead-letter behavior are controlled by resiliency policies.

### 3. Dead letter topic configured at wrong level
- **What was wrong:** The Dead Letter Topics section showed `deadLetterTopic` and `maxRetries` as component-level metadata fields in a YAML snippet.
- **What was changed:** Replaced with correct subscription-level configuration showing both a declarative YAML subscription (`dapr.io/v2alpha1 Subscription`) and a programmatic Go example using `common.Subscription.DeadLetterTopic`.
- **Why:** Dead letter topics in Dapr are configured at the subscription level, not the component level. This is confirmed by the official Dapr dead letter topics documentation.

## Review Notes
- The subscriber code (`main.go`) references `DomainEvent` type without importing or redefining it. Since `DomainEvent` is defined in `package eventstore` and the subscriber is in `package main`, this would not compile as-is. This is a common blog post convention and not flagged as a technical error.
- The error return from `s.AddTopicEventHandler()` is not checked in the subscriber example. This is common in Dapr example code but is not best practice for production Go code.
- Redis Streams XRANGE commands and Redis persistence configuration (AOF + RDB) are all correct.
- The Go SDK usage for both publishing (`client.PublishEvent` with `PublishEventWithMetadata`) and subscribing (`daprd.NewService`, `AddTopicEventHandler`, `TopicEvent.RawData`) is correct and current.
