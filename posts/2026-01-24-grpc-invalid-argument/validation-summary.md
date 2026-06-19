# Validation Summary: How to Fix Invalid Argument Errors in gRPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC status codes and error handling
- gRPC Python server APIs and interceptors
- gRPC Go status errors and rich error details
- Protocol Buffers proto3 field presence
- Google RPC rich error details (`google.rpc.Status`, `BadRequest`)
- Protobuf validation with protoc-gen-validate

## Sources Consulted
- gRPC status codes documentation: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
- gRPC error handling guide: https://grpc.io/docs/guides/error/
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html
- gRPC Go `status` package documentation: https://pkg.go.dev/google.golang.org/grpc/status
- gRPC Go `codes` package documentation: https://pkg.go.dev/google.golang.org/grpc/codes
- Google RPC `errdetails.BadRequest` Go documentation: https://pkg.go.dev/google.golang.org/genproto/googleapis/rpc/errdetails
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers Python generated code guide: https://protobuf.dev/reference/python/python-generated/
- protoc-gen-validate documentation: https://github.com/bufbuild/protoc-gen-validate
- protoc-gen-validate Go package documentation: https://pkg.go.dev/github.com/envoyproxy/protoc-gen-validate/validate
- Protovalidate Go package documentation: https://pkg.go.dev/github.com/bufbuild/protovalidate/go/v2

## Issues Found
- The Python basic validation example used `request.HasField('age')` for a proto3 scalar. Proto3 scalar fields with implicit presence do not support `HasField()`, so this could raise a runtime error. Changed the example to validate `request.age` directly.
- The first Go example imported `strings` but did not use it. Go rejects unused imports, so the snippet would not compile. Removed the unused import.
- The proto-level Go interceptor example used `grpc.UnaryServerInfo`, `grpc.UnaryHandler`, and `errdetails.BadRequest` without importing the `grpc` and `errdetails` packages. Added the missing imports.
- The proto-level Go interceptor attempted to type assert protoc-gen-validate errors to `validate.ValidationErrors`, which is not a documented exported type in the current `github.com/envoyproxy/protoc-gen-validate/validate` package. Replaced that conversion with a documented `BadRequest` detail containing the validation error text.
- The Python debug interceptor called `continuation(handler_call_details)` inside the per-request handler and treated the returned `RpcMethodHandler` as callable. gRPC Python interceptors must get the handler first and wrap the handler's callable. Updated the example to wrap `handler.unary_unary` and preserve request/response serializers.
- The gRPC debug logging environment variables were shown after `grpc` was imported. Moved them before the import in the snippet so they are set before gRPC initializes.
- The article listed a reference to a non-existent entity as an `INVALID_ARGUMENT` case while later correctly distinguishing `NOT_FOUND`. Changed that example to an invalid field combination and changed the order example to validate customer ID format instead of existence.
- The proto validation snippet described `age` as optional while declaring it as a non-optional proto3 scalar. Updated the comment to match the field declaration.

## Review Notes
- `protoc-gen-validate` is in maintenance mode and its maintainers recommend migrating to Protovalidate for new work. The existing example is still technically valid, but a future refresh could use `buf/validate/validate.proto` and `protovalidate-go`.
- The Python and Go examples remain illustrative snippets and assume generated service/message packages and helper methods exist.
