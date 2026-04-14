# Validation Summary: How to Use Streaming Subscriptions in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Pub/Sub streaming subscriptions (alpha, introduced in Dapr 1.14)
- gRPC streaming
- Go programming language

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk`), specifically `client/subscribe.go` for `SubscriptionOptions`, `Subscription`, and `SubscriptionMessage` types
- Dapr Go SDK official example (`examples/streamsub/sub/sub.go`)
- Dapr official documentation: alpha/beta API listing confirming streaming subscriptions introduced in v1.14
- Dapr official documentation: pub/sub API reference for publish endpoint format (`/v1.0/publish/<pubsubname>/<topic>`)
- Dapr official documentation: subscription methods page confirming streaming subscriptions don't require `--app-port`

## Issues Found
1. **`msg.Data()` used as a method call instead of struct field access.** The blog used `msg.Data()` (with parentheses) in two code examples. In the Dapr Go SDK, `SubscriptionMessage` embeds `*common.TopicEvent`, which has `Data` as an `interface{}` struct field and `RawData` as a `[]byte` field — neither is a method. The code as written would not compile. Fixed both occurrences to use `msg.RawData` (the `[]byte` field), which matches the official Dapr SDK example and is appropriate for the `string()` conversion shown in the code.
   - Line 66: `string(msg.Data())` changed to `string(msg.RawData)`
   - Line 87: `processMessage(msg.Data())` changed to `processMessage(msg.RawData)`

## Review Notes
- Streaming subscriptions remain an alpha feature as of the latest Dapr releases. The gRPC method is still named `SubscribeTopicEventsAlpha1`, so users should be aware the API may change in future Dapr versions.
- All other technical claims in the post are accurate: the `client.Subscribe` method signature, `SubscriptionOptions` fields, `Receive()` method, `Success()` and `Retry()` acknowledgment methods, the `dapr run` CLI flags, the publish URL format, and the comparison table between streaming and HTTP push subscriptions.
