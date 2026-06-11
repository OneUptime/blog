# Validation Summary: How to Create gRPC Deadlines Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC deadlines and timeout propagation
- gRPC-Go
- gRPC Python
- Go context deadlines
- Python gRPC synchronous and AsyncIO clients
- Prometheus metrics and alerting rules

## Sources Consulted
- gRPC Deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC Core Concepts: https://grpc.io/docs/what-is-grpc/core-concepts/
- gRPC Status Codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC HTTP/2 protocol documentation: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go status package documentation: https://pkg.go.dev/google.golang.org/grpc/status
- gRPC-Go codes package documentation: https://pkg.go.dev/google.golang.org/grpc/codes

## Issues Found
- The introduction and behavior table described deadline propagation as universal and automatic. Updated the wording to match official gRPC guidance: deadline propagation is language-specific, enabled by default in Go, and explicit timeout forwarding is required in other cases such as the Python examples shown.
- The explanation said downstream services receive the actual original deadline timestamp. Updated it to clarify that gRPC sends a relative timeout on the wire to account for clock skew, while services can determine remaining time and preserve the original budget.
- The Go client example used deprecated `grpc.Dial` and `grpc.WithInsecure()`. Updated it to `grpc.NewClient` with `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The Python server example compared `context.time_remaining()` directly with a float after earlier handling the no-deadline case. Updated it to guard against `None`.
- The Python downstream-call example claimed the timeout was automatically derived while the code calculated it manually. Updated the comment, clamped the small-buffer timeout to a positive value, and replaced `raise grpc.RpcError("No time remaining")` with `context.abort(...)`.
- The Python manual propagation example aborted the second downstream call when the inbound RPC had no deadline because `context.time_remaining()` returned `None`. Updated it to reapply the same default before the payment call.
- The Go different-deadlines example assigned `deadline, _ := ctx.Deadline()` without using the value. Removed the unused assignment.
- The Go instrumentation example shadowed the imported `status` package with a local `status` string, making `status.Code(err)` invalid. Renamed the local variable to `statusLabel`.
- The summary table said to "Propagate deadlines automatically." Updated it to "Propagate deadlines consistently" to avoid implying all language runtimes handle propagation automatically.

## Review Notes
The examples still use placeholder generated protobuf packages and service names, so they are illustrative rather than copy-paste complete programs. The gRPC-Go insecure credentials example is appropriate for local development but production clients should use TLS credentials.
