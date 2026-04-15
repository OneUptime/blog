# Validation Summary: How to Use Dapr Configuration API Subscriptions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API (HTTP and gRPC subscription endpoints)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- Node.js with EventSource for HTTP SSE streaming
- Redis as a Dapr configuration store (with keyspace notifications)

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Go SDK source (`client/configuration.go`): https://github.com/dapr/go-sdk
- Dapr Python SDK source (`dapr/clients/grpc/client.py`): https://github.com/dapr/python-sdk
- Dapr v1.11 release notes (Configuration API stable): https://blog.dapr.io/posts/2023/06/12/dapr-v1.11-is-now-available/
- Dapr Redis configuration store component source (`configuration/redis/internal/redis_value.go`): https://github.com/dapr/components-contrib

## Issues Found

### 1. Outdated API version path (`v1.0-alpha1` instead of `v1.0`)
**What was wrong:** All HTTP endpoint URLs used `v1.0-alpha1` (e.g., `/v1.0-alpha1/configuration/configstore/subscribe`). The Configuration API became stable (`v1.0`) in Dapr v1.11 (June 2023), making the alpha path outdated for a 2026 blog post.
**What was changed:** Replaced all `v1.0-alpha1` occurrences with `v1.0` across curl commands, the Node.js example, and the unsubscribe example. Updated the prerequisite from "Dapr v1.7 or later" to "Dapr v1.11 or later".

### 2. Go SDK example used fictional channel-based API
**What was wrong:** The Go example used `sub.DataChannel()`, `sub.ErrorChannel()`, and `sub.Unsubscribe()` on a subscription object. The Dapr Go SDK does not expose channels; `SubscribeConfigurationItems` takes a `ConfigurationHandleFunction` callback and returns `(string, error)` where the string is a subscription ID. Unsubscribing is done via `client.UnsubscribeConfigurationItems(ctx, storeName, subscriptionID)`.
**What was changed:** Rewrote the Go example to use the correct handler callback pattern with `SubscribeConfigurationItems` and `UnsubscribeConfigurationItems`.

### 3. Python SDK example used incorrect iterator pattern
**What was wrong:** The Python example used `for update in subscription:` to iterate over a subscription object returned by `subscribe_configuration`. The Dapr Python SDK actually takes a `handler` callback function and returns a subscription ID string, not an iterable.
**What was changed:** Rewrote the Python example to use the correct handler callback pattern with `subscribe_configuration(handler=...)` and `unsubscribe_configuration(store_name, id)`. Added `threading.Event` for the main thread to wait on, and updated the shutdown handler to call `unsubscribe_configuration`.

### 4. Redis key format was incorrect
**What was wrong:** The Redis command `redis-cli SET "feature-flags||version||2" '{"darkMode":true,"betaFeatures":true}'` embedded version information in the Redis key name using a three-part `||` format. In Dapr's Redis configuration store, the key is the plain configuration key name, and the `||` separator is used in the Redis *value* in the format `<value>||<version>`.
**What was changed:** Corrected to `redis-cli SET feature-flags '{"darkMode":true,"betaFeatures":true}||2'` — plain key name with version appended to the value after the `||` separator.

## Review Notes
- The Node.js example uses the `eventsource` npm package to consume the HTTP subscribe endpoint as SSE. While Dapr's HTTP subscribe endpoint returns streaming JSON, this approach may not work perfectly with all EventSource implementations since Dapr does not strictly follow the `text/event-stream` SSE specification. A raw HTTP streaming approach (e.g., using `fetch` with `ReadableStream`) may be more reliable in practice. However, this is a pragmatic concern rather than a clear error, so it was left unchanged.
- The `v1.0-alpha1` endpoints may still work on newer Dapr versions for backward compatibility, but the stable `v1.0` endpoints should be preferred for new applications.
- The Mermaid sequence diagram accurately represents the subscription flow conceptually.
