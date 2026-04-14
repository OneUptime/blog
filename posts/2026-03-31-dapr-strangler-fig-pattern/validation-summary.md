# Validation Summary: How to Implement the Strangler Fig Pattern with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, pub/sub, state store)
- Go (Dapr Go SDK: `github.com/dapr/go-sdk`)
- Strangler Fig migration pattern
- Reverse proxy with `net/http/httputil`

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk`): client interface (`client/client.go`), service invocation handler types (`service/common/service.go`, `service/common/type.go`), pub/sub (`client/pubsub.go`), state management (`client/state.go`)
- Dapr Go SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/
- Dapr State Management API: https://docs.dapr.io/reference/api/state_api/

## Issues Found

### 1. Incorrect service invocation handler signature (Step 2)
**What was wrong:** The handler `getUserHandler` used a fabricated `nethttp.Context` type with methods `PathValue("id")` and `ResponseWriter()` that do not exist in the Dapr Go SDK. The Dapr SDK's `ServiceInvocationHandler` type has the signature `func(ctx context.Context, in *common.InvocationEvent) (*common.Content, error)`. The handler receives an `InvocationEvent` and must return a `*Content` struct, not write to a response writer.

**What was changed:** Rewrote the handler to use the correct `ServiceInvocationHandler` signature: `func getUserHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error)`. Updated the body to marshal the response into `*common.Content` with `Data` and `ContentType` fields. Fixed imports to include `context` and `github.com/dapr/go-sdk/service/common`, and removed unused `net/http`.

**Why:** The original code would not compile. `nethttp.Context` is not a real type in Go or the Dapr SDK.

## Review Notes
- The `InvokeMethod` call in Step 1 uses the basic 4-argument form `(ctx, appID, methodName, verb)` returning `([]byte, error)`. The Dapr Go SDK also offers `InvokeMethodWithContent` and `InvokeMethodWithCustomContent` for passing request bodies — a real proxy would likely need these to forward POST/PUT payloads. This is acceptable for a conceptual tutorial but worth noting.
- The `PublishEvent` call in Step 3 correctly passes a struct as `data interface{}` — the SDK handles JSON marshaling automatically.
- The `GetState` and `SaveState` calls in Step 4 are correct and match the SDK interface.
- The curl command in Step 5 correctly uses the Dapr state management HTTP API format.
- All code snippets are conceptual/partial (helper functions like `getUserFromNewStore`, `updateMonolithDB`, `parseUserID` are not defined). This is appropriate for a tutorial focused on the pattern rather than a complete runnable application.
