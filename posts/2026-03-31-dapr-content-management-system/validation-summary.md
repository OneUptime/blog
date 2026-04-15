# Validation Summary: How to Build a Content Management System with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub, bindings, service invocation)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`, `github.com/dapr/go-sdk/service/common`)
- Go programming language
- S3-compatible object storage (via Dapr binding)

## Sources Consulted
- Dapr Go SDK source code on GitHub (`github.com/dapr/go-sdk`) — verified `SaveState`, `GetState`, `DeleteState`, `PublishEvent`, `InvokeMethod`, `InvokeBinding` signatures and `TopicEvent` handler signature
- Dapr official documentation on state management TTL (`ttlInSeconds` metadata key) — https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr official documentation on pub/sub — https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr official documentation on bindings — https://docs.dapr.io/developing-applications/building-blocks/bindings/

## Issues Found
1. **Missing TTL metadata on cache SaveState call**: The comment on line 94 stated "Cache for 5 minutes" but the `SaveState` call passed `nil` for the metadata parameter, meaning no TTL was actually set on the cached entry. Fixed by changing `nil` to `map[string]string{"ttlInSeconds": "300"}` to correctly set a 5-minute TTL via Dapr's built-in state store TTL support.

## Review Notes
- The `handleContentPublished` function references a global `daprClient` variable rather than using the `svc.daprClient` pattern used elsewhere. This is stylistically inconsistent but not technically incorrect — it represents a standalone handler function rather than a method on `CMSService`.
- Error returns from `json.Unmarshal` are consistently ignored throughout the code examples. This is acceptable for a blog tutorial focused on demonstrating Dapr concepts, but production code should handle these errors.
- The `InvokeMethod` calls in the cache invalidation handler ignore the `([]byte, error)` return values. Again, acceptable for tutorial brevity.
- All Dapr Go SDK API signatures (`SaveState`, `GetState`, `DeleteState`, `PublishEvent`, `InvokeMethod`, `InvokeBinding`, `TopicEventHandler`) were verified as correct against the current SDK.
