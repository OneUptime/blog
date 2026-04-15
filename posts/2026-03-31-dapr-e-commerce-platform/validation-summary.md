# Validation Summary: How to Build an E-Commerce Platform with Dapr

## Status
validated

## Post Type
Architecture Guide / Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr State Management building block
- Dapr Service Invocation building block
- Dapr Pub/Sub building block
- Dapr Workflow building block
- Go programming language

## Sources Consulted
- Dapr Go SDK client package reference: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK workflow package reference: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Go SDK service/common package reference: https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr Go SDK source (state.go, client.go): https://github.com/dapr/go-sdk
- Dapr State Management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr State TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/

## Issues Found

### 1. Incorrect `SaveState` call with `*StateOptions` struct (Product Search section)

**What was wrong:** The `SaveState` call passed `&dapr.StateOptions{Concurrency: dapr.StateConcurrencyLastWrite}` as the 5th argument. In the Dapr Go SDK, the 5th parameter of `SaveState` is `meta map[string]string` (metadata), not a `*StateOptions` struct. State options are passed as variadic functional options in the 6th+ position. This code would not compile.

**What was changed:** Replaced the incorrect `&dapr.StateOptions{...}` argument with a metadata map `map[string]string{"ttlInSeconds": "300"}`. This both fixes the type error and correctly implements the comment's stated intent of "cache for 5 minutes" using Dapr's built-in state TTL metadata support.

**Why:** The original code had two compounding issues — the wrong parameter type for the `SaveState` call, and the comment claiming a 5-minute cache TTL while the code only set a concurrency mode (which wouldn't enforce any TTL). The fix addresses both by using the metadata parameter correctly with Dapr's `ttlInSeconds` key.

## Review Notes
- The code examples deliberately ignore errors (using `_`) in several places for brevity. This is acceptable for a blog post but would not be appropriate in production code.
- The `goto save` pattern in the cart service is functional but unconventional Go style. Not a correctness issue.
- The inventory update handler (`handleOrderConfirmed`) uses a read-modify-write pattern without concurrency control (e.g., ETags), which could lead to race conditions under concurrent order processing. This is a design concern rather than an API correctness issue.
- All other Dapr Go SDK API calls — `GetState`, `InvokeMethod`, `PublishEvent`, `WorkflowContext.GetInput`, `CallActivity` with `ActivityInput`, and the `TopicEventHandler` signature — were verified as correct.
