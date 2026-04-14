# Validation Summary: How to Use Dapr SDK for Go to Build Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- gRPC
- Redis (state store and pub/sub)
- HashiCorp Vault (secrets)
- Apache Kafka (pub/sub, mentioned in architecture diagram)

## Sources Consulted
- Dapr Go SDK source code on GitHub: https://github.com/dapr/go-sdk
- Dapr Go SDK client package API (`client/client.go`, `client/state.go`, `client/pubsub.go`, `client/secret.go`, `client/invoke.go`)
- Dapr Go SDK service package API (`service/common/service.go`, `service/common/binding.go`, `service/grpc/grpc.go`)
- Dapr component specs documentation: https://docs.dapr.io/reference/components-reference/

## Issues Found
1. **`SaveStateWithETag` called with incorrect arguments (line 81)**: The blog used `client.SaveStateWithETag(ctx, "statestore", "order-1", data, nil, nil)`. The `etag` parameter in `SaveStateWithETag` is typed as `string`, not a pointer — passing `nil` would cause a compile error. Since no ETag concurrency control was needed in this example, replaced with the simpler `client.SaveState(ctx, "statestore", "order-1", data, nil)` which omits the ETag parameter entirely.

## Review Notes
- The `PublishEvent` method accepts `data interface{}` (not strictly `[]byte`), so the code works but readers should know they can also pass structs directly.
- The `go get github.com/dapr/go-sdk@latest` command installs the top-level module; users may also need `go get github.com/dapr/go-sdk/service/grpc` for the service package depending on Go module resolution.
- The Dapr component YAML files use `redisHost` which is the correct metadata key for the Redis state store and pub/sub components.
- All other API signatures (`GetState`, `PublishEvent`, `InvokeMethodWithContent`, `GetSecret`, `ExecuteStateTransaction`, `SaveBulkState`, `GetBulkState`, `NewService`, `AddServiceInvocationHandler`, `AddTopicEventHandler`) and types (`DataContent`, `StateOperation`, `SetStateItem`, `Subscription`, `InvocationEvent`, `TopicEvent`, `Content`) were verified as correct.
