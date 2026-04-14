# Validation Summary: How to Understand Dapr gRPC Interface for SDK Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime, sidecar architecture)
- gRPC (client/server, metadata)
- Protocol Buffers (proto3 service definitions)
- Go (grpc-go SDK, protoc code generation)
- Microservices (service invocation, pub/sub, state management)

## Sources Consulted
- Dapr proto definitions: https://github.com/dapr/dapr/tree/master/dapr/proto/runtime/v1
- Dapr `dapr.proto` service definition: https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto
- Dapr `appcallback.proto` service definition: https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/appcallback.proto
- Dapr CLI reference (default ports): https://docs.dapr.io/reference/cli/dapr-run/
- grpc-go `NewClient` migration: https://github.com/grpc/grpc-go/issues/7049
- grpc-go package docs (Dial deprecation): https://pkg.go.dev/google.golang.org/grpc

## Issues Found
1. **Misleading repository reference**: The text said the gRPC interface is defined in the "dapr/proto repository", implying a separate repo. The protos are actually in the main `dapr/dapr` GitHub repository under the `dapr/proto/` directory. Fixed to say "dapr/dapr repository under dapr/proto/".

2. **Deprecated `grpc.Dial` usage**: The Go code used `grpc.Dial()` which has been deprecated since grpc-go v1.63.0. Updated to `grpc.NewClient()` which is the current recommended API.

3. **Deprecated workflow Alpha1 methods**: `StartWorkflowAlpha1` and `GetWorkflowAlpha1` are deprecated in the Dapr proto in favor of `StartWorkflowBeta1` and `GetWorkflowBeta1`. Updated the method names to the Beta1 versions.

4. **Deprecated `BulkPublishEventAlpha1`**: This method is marked as deprecated in the proto definition. Added a `// deprecated` comment to flag this for readers.

## Review Notes
- The `BulkPublishEventAlpha1` RPC is deprecated in the Dapr proto (marked with `option deprecated = true`). A stable `BulkPublishEvent` replacement may exist or be forthcoming. The post retains it with a deprecation comment since it still exists in the proto.
- The AppCallback server example uses port 6000 which is fine as any port works, but readers should know they must pass the matching port via `--app-port` when launching the Dapr sidecar.
- All Go code is syntactically correct and uses proper proto-generated type names (`pb.SaveStateRequest`, `commonpb.StateItem`, `commonpb.InvokeRequest`, etc.).
- The proto service definitions (both `Dapr` and `AppCallback`) accurately represent a subset of the actual Dapr proto; the post does not claim to be exhaustive.
- The `TopicEventResponse_SUCCESS` enum value is verified correct.
