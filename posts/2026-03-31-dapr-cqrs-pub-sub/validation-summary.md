# Validation Summary: How to Implement CQRS with Dapr State and Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub building blocks)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- CQRS (Command Query Responsibility Segregation) pattern
- Go (programming language)
- PostgreSQL (write-side state store)
- Redis (read-side state store)
- Dapr declarative subscriptions (YAML)

## Sources Consulted
- Dapr Go SDK client package — https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK common package (TopicEvent, handler signatures) — https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr Subscription spec — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr PostgreSQL state store component — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Redis state store component — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Go client SDK getting started — https://docs.dapr.io/developing-applications/sdks/go/go-client/

## Issues Found

### 1. Undefined `client` variable in event handler
- **What was wrong:** The `handleProductEvent` function called `client.SaveState(...)` but never created a Dapr client. Unlike the other two handler functions in the post, this function was missing the `dapr.NewClient()` call, so `client` was undefined.
- **What was changed:** Added `client, _ := dapr.NewClient()` and `defer client.Close()` inside the event handler, before the `SaveState` call.
- **Why:** Without this, the code would not compile. The other handler functions in the post correctly create their own client instances.

### 2. Deprecated Subscription API version
- **What was wrong:** The Subscription YAML used `apiVersion: dapr.io/v1alpha1` with a `route` field. This API version is deprecated in favor of `dapr.io/v2alpha1`.
- **What was changed:** Updated `apiVersion` to `dapr.io/v2alpha1` and changed `route: /product-events` to `routes: { default: /product-events }` to match the v2alpha1 schema.
- **Why:** `v1alpha1` subscriptions are deprecated. While Dapr's conversion webhook still handles them at runtime, a tutorial should demonstrate the current recommended API version.

## Review Notes
- All Dapr Go SDK API calls (`NewClient`, `SaveState`, `PublishEvent`, `GetState`) use correct signatures and parameter types.
- The `TopicEventHandler` signature `func(ctx context.Context, e *common.TopicEvent) (bool, error)` is correct, and `TopicEvent.RawData` is a valid field.
- The Dapr component YAML for `state.postgresql` (with `connectionString`) and `state.redis` (with `redisHost`) are correct.
- The `SaveState` call correctly passes `nil` for the optional metadata parameter.
- The `PublishEvent` call correctly passes a `map[string]interface{}` as the data parameter (the SDK accepts `interface{}` and handles serialization).
- The event handler's return of `(false, nil)` correctly signals successful processing (no retry).
- Error handling is minimal throughout (ignoring errors from `json.Decode`, `json.Unmarshal`, `PublishEvent`), which is acceptable for a tutorial focused on the CQRS pattern rather than production-grade error handling.
