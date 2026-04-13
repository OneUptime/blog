# Validation Summary: How to Use Dapr with Zap in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go (Golang)
- Uber Zap logging library (`go.uber.org/zap`)
- Dapr Go SDK (`github.com/dapr/go-sdk`) — client, service/http, service/common
- Dapr pub/sub, state management, and service invocation

## Sources Consulted
- https://pkg.go.dev/github.com/dapr/go-sdk/service/common — verified struct definitions for `Subscription`, `InvocationEvent`, `Content`, and `TopicEvent`
- https://pkg.go.dev/github.com/dapr/go-sdk/service/http — confirmed `NewService` signature and that this package does NOT re-export types from `service/common`
- https://pkg.go.dev/github.com/dapr/go-sdk/client — verified `NewClient`, `SaveState`, and `PublishEvent` signatures
- https://pkg.go.dev/go.uber.org/zap — verified `zap.Config`, `Logger`, `SugaredLogger`, field constructors, and `Build` options

## Issues Found

### 1. Types referenced from wrong package (compilation error)
**What was wrong:** The code used `daprd.Subscription`, `daprd.InvocationEvent`, `daprd.Content`, and `daprd.TopicEvent`, all referencing the `service/http` package. These types are defined in `github.com/dapr/go-sdk/service/common` and are not re-exported by `service/http`. The code would not compile.

**What was changed:** Added import `"github.com/dapr/go-sdk/service/common"` and changed all type references from `daprd.*` to `common.*` (`common.Subscription`, `common.InvocationEvent`, `common.Content`, `common.TopicEvent`).

### 2. `InvocationEvent.TraceID` does not exist (compilation error)
**What was wrong:** The `handleOrder` function accessed `in.TraceID` on the `InvocationEvent` struct. This field does not exist — `InvocationEvent` only has `Data`, `ContentType`, `DataTypeURL`, `Verb`, and `QueryString` fields. The code would not compile.

**What was changed:** Replaced `in.TraceID` with an empty string `""` in the `DaprFields` call. Note: `TopicEvent` does have `TraceID` and `TraceParent` fields, but `InvocationEvent` does not. Dapr propagates trace context at the sidecar level for service invocations.

### 3. Missing trace context in payment event handler (enhancement)
**What was changed:** Added `zap.String("traceParent", e.TraceParent)` to the `handlePaymentEvent` logger fields, since `TopicEvent` has a `TraceParent` field. This demonstrates proper trace context logging where it is actually available, complementing the `DaprFields` helper shown earlier.

## Review Notes
- `zap.AddCallerSkip(0)` in the logger initialization is a no-op (default is 0). Not incorrect, but unnecessary.
- `go get go.uber.org/zap/zapcore` in the install commands is redundant since `zapcore` is a sub-package of the `go.uber.org/zap` module and is automatically available. Not incorrect, just unnecessary.
- The `go get github.com/dapr/go-sdk/client` and `go get github.com/dapr/go-sdk/service/http` commands both resolve to the same `github.com/dapr/go-sdk` module; only one `go get` for the module is needed. Again, not incorrect but redundant.
- The Zap and Dapr client APIs used are current as of Dapr Go SDK v1.x and Zap v1.x.
