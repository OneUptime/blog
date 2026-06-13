# Validation Summary: How to Build gRPC Services from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC
- Protocol Buffers
- Go
- protoc
- protoc-gen-go
- protoc-gen-go-grpc
- grpcurl
- gRPC server reflection
- gRPC health checks
- TLS credentials

## Sources Consulted
- gRPC Go Quick Start: https://grpc.io/docs/languages/go/quickstart/
- Protocol Buffers Go Generated Code Guide: https://protobuf.dev/reference/go/go-generated/
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC reflection package documentation: https://pkg.go.dev/google.golang.org/grpc/reflection
- gRPC health package documentation: https://pkg.go.dev/google.golang.org/grpc/health
- gRPC Status Codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC Interceptors guide: https://grpc.io/docs/guides/interceptors/
- grpcurl project documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The original `protoc` command used `--go_out=.` with `paths=source_relative` while the post's imports expected generated files under `generated/user`. According to the Protocol Buffers Go generator documentation, `paths=source_relative` writes generated files relative to the input file path, so the original command would generate files under `proto/`. Updated the command to use `--proto_path=proto`, output to `generated/user`, and pass `user.proto`.
- The server implementation imported `errors` but did not use it. This would cause a Go compile error. Removed the unused import.
- The client used `grpc.Dial`, which is deprecated in current gRPC-Go documentation in favor of `grpc.NewClient`. Updated the client snippet and adjusted the failure message to describe client connection creation.
- The grpcurl reflection sample output listed only `grpc.reflection.v1alpha.ServerReflection`. Current `reflection.Register` registers both v1 and v1alpha reflection services, so the sample output was updated to include `grpc.reflection.v1.ServerReflection`.

## Review Notes
The local environment did not have `go` or `protoc` available, so I could not compile and run the complete example in this workspace. The snippets were reviewed statically against current official gRPC-Go, Protocol Buffers, and grpcurl documentation.
