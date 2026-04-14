# Validation Summary: How to Subscribe to Configuration Changes in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API (subscribe/unsubscribe)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Node.js SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr-client`)
- gRPC server streaming for configuration subscriptions
- Dapr HTTP Configuration API

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration-api/
- Dapr Configuration how-to guide: https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Go SDK source (configuration client): https://github.com/dapr/go-sdk/blob/main/client/configuration.go
- Dapr JS SDK source (configuration interface): https://github.com/dapr/js-sdk/blob/main/src/interfaces/Client/IClientConfiguration.ts
- Dapr Python SDK source: https://github.com/dapr/python-sdk
- Dapr runtime HTTP API registration source: https://github.com/dapr/dapr/blob/master/pkg/api/http/http.go
- Dapr issue #3830 (SSE not supported) and issue #5522 (Configuration API stable promotion)

## Issues Found

1. **SSE (Server-Sent Events) claim was incorrect**: The post stated Dapr uses SSE over HTTP to stream configuration change notifications. In reality, the HTTP subscribe endpoint returns a subscription ID and Dapr pushes updates to the app's own HTTP endpoint via `POST /configuration/{storeName}/{key}`. The gRPC SDKs use server streaming. Fixed by rewriting the "How Configuration Subscriptions Work" section and the HTTP example section to accurately describe the mechanism.

2. **API version `v1.0-alpha1` was outdated**: The Configuration API was promoted to stable (`v1.0`) in Dapr v1.11. Updated all HTTP endpoint URLs from `v1.0-alpha1` to `v1.0`.

3. **HTTP subscribe response format was wrong**: The post showed the subscribe response as a stream of JSON configuration items. The actual response is `{"id":"subscription-id-value"}`. Fixed the HTTP example to show the correct response and explain the push model.

4. **Node.js SDK: wrong return type and unsubscribe method**: `subscribeWithKeys` returns a `SubscribeConfigurationStream` object (with a `stop()` method), not a subscription ID string. The blog invented `client.configuration.unsubscribe()` which does not exist. Fixed to use `stream.stop()`. Also added required `CommunicationProtocolEnum.GRPC` configuration, as the HTTP client does not support configuration methods.

5. **Python example was fundamentally broken**: The example used raw `httpx` to parse SSE `data:` lines from the subscribe endpoint. Since Dapr does not send SSE streams, this code would never work. Replaced with the official Dapr Python SDK (`dapr-client`) using `client.subscribe_configuration()` with a callback handler and `client.unsubscribe_configuration()` for cleanup.

## Review Notes
- The Go SDK example was correct as written — method names (`SubscribeConfigurationItems`, `UnsubscribeConfigurationItems`), callback signature, and `ConfigurationItem.Value` field all match the SDK source.
- The `v1.0-alpha1` endpoint still works in current Dapr for backward compatibility, but `v1.0` is the correct current version to recommend.
- The Node.js SDK configuration methods only work over gRPC — the HTTP transport throws `HTTPNotSupportedError`. This is an important caveat that users should be aware of.
