# Validation Summary: How to Handle Errors in Dapr Go SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Go (Golang)
- gRPC status codes (`google.golang.org/grpc/status`, `google.golang.org/grpc/codes`)

## Sources Consulted
- Dapr Go SDK source code: `github.com/dapr/go-sdk` (cloned and inspected `main` branch)
  - `client/client.go` — `InvokeMethodWithContent`, `GetState`, `SaveState` interface definitions
  - `client/invoke.go` — `InvokeMethodWithContent` implementation, `DataContent` struct
  - `service/common/type.go` — `TopicEvent` struct and methods
  - `service/common/service.go` — `TopicEventHandler` type definition
- gRPC Go status package: `google.golang.org/grpc/status` (`FromError`, `Code`, `Message`)
- gRPC Go codes package: `google.golang.org/grpc/codes` (`Unavailable`, `NotFound`, `InvalidArgument`, `Internal`, `DeadlineExceeded`)

## Issues Found
1. **`TopicEvent.DataAs` does not exist — should be `Struct`**
   - **What was wrong:** The pub/sub handler example called `e.DataAs(&payload)` on a `*common.TopicEvent`. The `DataAs` method does not exist on `TopicEvent` in the Dapr Go SDK. This name likely comes from the CloudEvents Go SDK (`github.com/cloudevents/sdk-go`), which has a `DataAs` method on its `Event` type.
   - **What was changed:** Replaced `e.DataAs(&payload)` with `e.Struct(&payload)` on line 86.
   - **Why:** The correct method on `TopicEvent` is `Struct(target interface{}) error`, which unmarshals `RawData` into the target struct via `json.Unmarshal`. The SDK source comment on the `RawData` field itself says: "This can be deserialized into a Go struct using `Struct`."

## Review Notes
- The import alias `dapr "github.com/dapr/go-sdk/client"` is used in the first code block, which makes `dapr.DataContent` valid. This is a common pattern in Dapr Go SDK examples.
- The `SaveState` call uses `data` without showing its type. The actual SDK signature requires `data []byte` — callers must marshal structs to `[]byte` before passing. The blog doesn't show this step, but this is acceptable for a focused error-handling tutorial.
- The `item.Value == nil` check for missing state keys is valid; the SDK returns nil/empty `Value` when a key doesn't exist. A more defensive check would be `len(item.Value) == 0`, but `nil` is acceptable.
- The pub/sub semantics described (returning `(false, err)` for dead-letter) are reasonable — the SDK maps this to `TopicResponseStatusDrop`, which drops the message. Whether it actually goes to a dead-letter topic depends on the pub/sub component configuration, not the SDK.
