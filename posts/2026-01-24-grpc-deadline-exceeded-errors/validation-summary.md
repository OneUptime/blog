# Validation Summary: How to Fix 'Deadline Exceeded' Errors in gRPC

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- gRPC
- gRPC Go
- Go context deadlines and timeouts
- Go unary client and server interceptors
- Prometheus metrics
- OpenTelemetry tracing

## Sources Consulted
- gRPC Deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC Cancellation guide: https://grpc.io/docs/guides/cancellation/
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go status package documentation: https://pkg.go.dev/google.golang.org/grpc/status
- gRPC Go codes package documentation: https://pkg.go.dev/google.golang.org/grpc/codes
- Go context package documentation: https://pkg.go.dev/context
- gRPC Go helloworld client example: https://github.com/grpc/grpc-go/blob/master/examples/helloworld/greeter_client/main.go

## Issues Found
- The introductory explanation said deadlines propagate across service boundaries "unlike timeouts." gRPC documentation explains that APIs may expose either deadlines or timeouts, and gRPC can convert timeouts to deadlines; propagation support varies by implementation, with Go propagating deadlines by default when the incoming context is reused. Updated the sentence to reflect this.
- The basic client deadline Go example imported `google.golang.org/grpc` without using it. Removed the unused import so the sample is syntactically correct.
- The per-method timeout client example used deprecated `grpc.Dial` and `grpc.WithInsecure()`. Updated it to `grpc.NewClient` with `grpc.WithTransportCredentials(insecure.NewCredentials())`, matching current gRPC Go examples and API documentation.
- The `CalculateTimeout` sample accepted an unused `p50` parameter, which would not compile in Go. Updated the function to accept only `p99`, which is the value used by the implementation.
- The adaptive timeout sample called `sort.Slice` without importing `sort`. Added the missing standard-library import.
- The OpenTelemetry tracing sample had an unused `operationName` parameter in `traceDeadlineInfo`, which would not compile in Go. Removed the unused parameter and updated the call site.

## Review Notes
The remaining timeout values are reasonable illustrative examples, but production values should be based on measured service latency, load testing, retry policy, and service-level objectives. The snippets use placeholder generated protobuf packages such as `myservice/pb`, so they are examples rather than standalone runnable programs.
