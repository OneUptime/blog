# Validation Summary: How to Fix 'Unimplemented' Method Errors in gRPC

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- gRPC status codes and service registration
- Protocol Buffers / proto3
- Go gRPC (`grpc-go`)
- gRPC reflection
- grpcurl
- Python gRPC

## Sources Consulted
- gRPC status codes: https://grpc.io/docs/guides/status-codes/
- grpc-go status code definitions: https://github.com/grpc/grpc-go/blob/master/codes/codes.go
- gRPC Go generated-code reference: https://grpc.io/docs/languages/go/generated-code/
- grpc-go reflection package documentation: https://pkg.go.dev/google.golang.org/grpc/reflection
- grpc-go health checking generated package documentation: https://pkg.go.dev/google.golang.org/grpc/health/grpc_health_v1
- grpcurl official README: https://github.com/fullstorydev/grpcurl
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html

## Issues Found
- The opening definition described UNIMPLEMENTED only as a method not implemented by the server. Updated it to match the official gRPC definition: an operation is not implemented or not supported/enabled in the service.
- The Go service registration example used `pb.RegisterHealthServer`, but the standard health service registration function is generated in `google.golang.org/grpc/health/grpc_health_v1`. Updated the snippet to use `healthpb.RegisterHealthServer`.
- The reflection output showed only the legacy v1alpha reflection service. Current `reflection.Register` registers both v1 and v1alpha reflection services, so the example output now includes `grpc.reflection.v1.ServerReflection`.
- The protobuf v2 request declared `include_metadata` as `optional string` even though later Go code used it as a boolean. Changed it to `optional bool`.
- The Go feature-detection example called `CloseSend` on a call shaped like a server-streaming RPC. Removed the invalid call and returned the generated client-call error directly.
- The v1/v2 backward-compatibility example attempted to implement two services with same-named RPCs but different request/response types on one Go struct. Split the legacy implementation into a thin adapter type and registered it separately.
- The v2 Go example accessed optional fields directly instead of using generated getters. Updated it to use `GetIncludeMetadata()` and `GetIncludeActivity()`.
- The interceptor section implied unary interceptors catch all unimplemented method calls. Added a note that unknown services or methods can fail before a registered handler and unary interceptor are invoked.

## Review Notes
The code blocks remain illustrative and use placeholder application functions and types such as `fetchUser`, `findUser`, `unimplementedCalls`, and service-specific protobuf messages. The grpcurl commands, reflection registration, gRPC status code handling, proto3 optional usage, and Python `context.abort` usage were checked against official documentation.
