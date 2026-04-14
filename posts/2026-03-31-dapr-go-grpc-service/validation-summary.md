# Validation Summary: How to Use Dapr Go gRPC Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- gRPC
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr CLI

## Sources Consulted
- Dapr Go SDK source code: `service/grpc/service.go` — verified `NewService(address string) (common.Service, error)` signature
- Dapr Go SDK source code: `service/common/service.go` — verified `AddServiceInvocationHandler` and `AddTopicEventHandler` interface methods
- Dapr Go SDK source code: `service/common/type.go` — verified `Subscription`, `InvocationEvent`, `TopicEvent`, and `Content` struct fields
- Dapr Go SDK source code: `client/invoke.go` — verified `InvokeMethod(ctx, appID, methodName, verb string) ([]byte, error)` signature
- Dapr Go SDK source code: `service/grpc/topic.go` and `service/http/topic.go` — confirmed both gRPC and HTTP use CloudEvents wrapping for pub/sub
- Dapr CLI documentation — verified `--app-protocol grpc`, `--app-port`, `--app-id`, `--components-path` flags

## Issues Found

### 1. Missing `"encoding/json"` import
- **What was wrong:** The main code block imported `"context"` and `"log"` but omitted `"encoding/json"`, even though the handler functions (shown in subsequent code blocks as part of the same file) use `json.Marshal` and `json.Unmarshal`.
- **What was changed:** Added `"encoding/json"` to the import block.
- **Why:** Without this import, the code would not compile.

### 2. Misleading serialization comparison in HTTP vs gRPC table
- **What was wrong:** The comparison table listed HTTP serialization as "JSON (CloudEvents)" and gRPC as "Protobuf", implying that only HTTP uses CloudEvents. In reality, both HTTP and gRPC services use CloudEvents wrapping for pub/sub events — the difference is the transport-level encoding (JSON over HTTP/1.1 vs Protobuf over HTTP/2).
- **What was changed:** Changed HTTP serialization cell from "JSON (CloudEvents)" to "JSON" so neither row mentions CloudEvents, avoiding the false implication that only one protocol uses it.
- **Why:** The original wording could mislead readers into thinking gRPC skips CloudEvents entirely.

## Review Notes
- The `--components-path` CLI flag is correct and functional, but newer Dapr CLI versions prefer `--resources-path` as the canonical name (`--components-path` remains as an alias). This is not an error but worth noting for future updates.
- The client code snippet (`client.InvokeMethod(ctx, "worker-service", "process", "POST")`) correctly captures both return values `([]byte, error)`. However, the snippet does not check the error from `dapr.NewClient()` before calling `defer client.Close()`, which could panic if the client is nil. This is acceptable for a simplified blog example but would not be production-ready.
- All Dapr Go SDK API signatures (struct fields, function parameters, return types) were verified against the actual source code and are correct.
