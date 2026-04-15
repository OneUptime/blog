# Validation Summary: How to Use Dynamic Configuration in Dapr Applications

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Dapr Configuration API (subscribe/get)
- Redis as a Dapr configuration store
- Node.js with `@dapr/dapr` SDK
- Python with `dapr` SDK
- Go with `dapr` SDK
- Bottleneck (Node.js rate-limiting library)

## Sources Consulted
- Dapr Configuration API reference (HTTP): https://docs.dapr.io/reference/api/configuration_api/
- Dapr Configuration building block overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr Redis configuration store component: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr Redis configuration store source code (`configuration/redis/internal/redis_value.go`) for key/value format
- Dapr JavaScript SDK source (`dapr/js-sdk`) — `subscribeWithKeys` method signature and types
- Dapr Go SDK source (`dapr/go-sdk`) — `SubscribeConfigurationItems` method signature
- Dapr Python SDK source (`dapr/python-sdk`) — `subscribe_configuration` method and handler pattern
- npm registry for `@dapr/dapr` and `bottleneck` packages

## Issues Found

### 1. Incorrect Redis key format (all `redis-cli SET` commands)
**What was wrong:** The post used `myapp||key-name` as the Redis key (e.g., `redis-cli SET myapp||rate-limit-rps "500"`). The `||` separator in Dapr's Redis configuration store is used in the **value** to separate the configuration value from its version — not in the key name.
**What was changed:** Updated all Redis commands to use plain key names with the `value||version` format in the value. For example: `redis-cli SET rate-limit-rps "500||1"`.
**Why:** The Dapr Redis configuration store source code (`redis_value.go`) splits the stored value on `||` to extract value and version. The key itself should be a plain string matching the configuration key name.

### 2. Outdated API version in HTTP endpoint (Pattern 2)
**What was wrong:** The Python example used `v1.0-alpha1` in the URL path (`http://localhost:3500/v1.0-alpha1/configuration/appconfig/subscribe`). The Configuration API has graduated to stable.
**What was changed:** This was addressed as part of the larger rewrite of Pattern 2 (see issue #3 below), which replaced the raw HTTP approach entirely.
**Why:** The stable API version is `v1.0`, not `v1.0-alpha1`.

### 3. Incorrect HTTP subscription model in Python example (Pattern 2)
**What was wrong:** The Python example used raw HTTP streaming with SSE-style `data:` prefix parsing via `httpx`. Dapr's HTTP Configuration API does **not** use Server-Sent Events for subscriptions. The HTTP subscribe endpoint returns a subscription ID, and Dapr pushes updates to the application's own HTTP endpoints via callbacks (webhook model).
**What was changed:** Replaced the entire Python example with a Dapr Python SDK-based approach using `DaprClient.subscribe_configuration()` with a handler callback. This is consistent with how the JavaScript (Pattern 1) and Go (Pattern 3) examples use their respective SDKs.
**Why:** The original code would not work as written. The SDK-based approach correctly uses gRPC streaming under the hood and is the recommended way to subscribe to configuration changes in Python.

## Review Notes
- The Go example in Pattern 3 does not capture the return values `(string, error)` from `SubscribeConfigurationItems`. While valid Go (return values can be discarded), production code should check the error. This was left as-is since the blog focuses on the configuration pattern, not error handling boilerplate.
- The JavaScript SDK's `subscribeWithKeys` only works over gRPC, not HTTP. The blog doesn't specify the transport protocol, which is acceptable since gRPC is the default in recent SDK versions.
- Pattern 4 (Gradual Configuration Rollout) references `config_cache` without defining it. This appears intentional as a pseudocode/conceptual snippet rather than a complete implementation.
