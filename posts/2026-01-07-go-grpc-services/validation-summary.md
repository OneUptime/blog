# Validation Summary: How to Build gRPC Services in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- gRPC-Go
- Protocol Buffers
- protoc
- protoc-gen-go
- protoc-gen-go-grpc
- gRPC status codes and error details
- gRPC interceptors
- gRPC server reflection
- bufconn testing
- grpcurl

## Sources Consulted
- gRPC Go Quick Start: https://grpc.io/docs/languages/go/quickstart/
- gRPC Go Basics Tutorial: https://grpc.io/docs/languages/go/basics/
- gRPC-Go API documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- Protocol Buffers Go Generated Code Guide: https://protobuf.dev/reference/go/go-generated/
- gRPC bufconn package documentation: https://pkg.go.dev/google.golang.org/grpc/test/bufconn
- gRPC status package documentation: https://pkg.go.dev/google.golang.org/grpc/status

## Issues Found
- The protobuf generation command used `--go_out=.` and `--go-grpc_out=.` with `paths=source_relative` while the post's project structure and imports expected generated files under `pb/user`. With `proto/user/user.proto` as the input, that command would generate files under `proto/user`, causing the later imports from `github.com/yourname/grpc-go-demo/pb/user` to fail. Updated the `protoc` command and Makefile target to use `--proto_path=proto`, `--go_out=pb`, `--go-grpc_out=pb`, and `user/user.proto`, which matches the documented `pb/user` layout.
- The server-streaming demo created users before registering `WatchUsers`, then waited for events that would never be emitted by the sample service. Updated `WatchUsers` to send existing watched users as initial events when the watcher is registered, so the client example can actually receive streamed messages.
- The client code described `grpc.NewClient` as establishing a connection and logged "Failed to connect". Current gRPC-Go documentation states that `NewClient` creates a channel and performs no I/O until RPCs are invoked. Updated the comment and error message to reflect the lazy connection behavior.

## Review Notes
The examples use current, non-deprecated gRPC-Go client APIs such as `grpc.NewClient`; `grpc.Dial` and `grpc.DialContext` are deprecated in current gRPC-Go documentation. I could not compile the snippets locally because this review environment does not have `go` or `protoc` installed, so validation was performed by static review against official documentation.
