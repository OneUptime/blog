# Validation Summary: How to Fix 'Failed Precondition' Errors in gRPC

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC
- gRPC-Go
- Protocol Buffers
- Go error handling
- gRPC rich error details
- Optimistic locking with ETags

## Sources Consulted
- gRPC Status Codes: https://grpc.io/docs/guides/status-codes/
- google.rpc.Code canonical definitions: https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
- gRPC-Go status package documentation: https://pkg.go.dev/google.golang.org/grpc/status
- gRPC-Go codes package documentation: https://pkg.go.dev/google.golang.org/grpc/codes
- Go errdetails package documentation: https://pkg.go.dev/google.golang.org/genproto/googleapis/rpc/errdetails
- Go protobuf timestamppb package documentation: https://pkg.go.dev/google.golang.org/protobuf/types/known/timestamppb
- Google API error model guidance: https://google.aip.dev/193

## Issues Found
- The document-service Go example used `timestamppb.New(doc.UpdatedAt)` without importing `google.golang.org/protobuf/types/known/timestamppb`. Added the missing import.
- The client precondition handler imported `fmt` but did not use it, which would make the snippet fail to compile. Removed the unused import.
- The optimistic retry example inspected `errdetails.PreconditionFailure` but did not import `google.golang.org/genproto/googleapis/rpc/errdetails`. Added the missing import.
- The resource dependency example called `removeFromSlice` without defining it. Added a small helper function so the example is complete.

## Review Notes
- The gRPC status-code descriptions match the official gRPC guidance: `FAILED_PRECONDITION` is code 9 and applies when the system state must be explicitly fixed before retrying; `ABORTED` is code 10 and is often the better fit for retryable read-modify-write conflicts.
- The optimistic-locking examples are technically plausible, but API designers should choose between `FAILED_PRECONDITION` and `ABORTED` based on their retry contract. The post already notes both options for optimistic locking.
- The Go snippets assume application-specific generated protobuf types and helper methods from `myapp/proto`; those are outside the scope of the post.
