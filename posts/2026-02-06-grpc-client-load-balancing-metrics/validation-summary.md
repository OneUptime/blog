# Validation Summary: How to Monitor gRPC Client-Side Load Balancing Decisions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC
- gRPC Go
- gRPC Python
- OpenTelemetry Go metrics
- OpenTelemetry Python metrics
- Prometheus/PromQL
- Client-side load balancing

## Sources Consulted
- gRPC custom load balancing policies: https://grpc.io/docs/guides/custom-load-balancing/
- gRPC load balancing overview: https://grpc.io/blog/grpc-load-balancing/
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- gRPC Go package reference: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go peer package reference: https://pkg.go.dev/google.golang.org/grpc/peer
- OpenTelemetry Go metric package reference: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html

## Issues Found
- The Go example imported unused packages and referenced `grpc.Peer` as a type. Removed the unused imports and changed the peer variable to `peer.Peer`, which is the type accepted by `grpc.Peer`.
- The Go interceptor labeled `cc.Target()` as `grpc.lb.policy`, but `Target()` returns the target string, not the load-balancing policy. Changed the attribute to `grpc.target`.
- The Python section described the implementation as equivalent to Go and implied peer information is available from trailing metadata. gRPC Python's synchronous client interceptor returns a Call/Future and does not expose the selected transport peer directly, so the text and code now describe relying on application-provided response metadata.
- The Python interceptor measured latency immediately after starting the RPC. Updated it to record metrics in a done callback so the elapsed time covers RPC completion.
- The backend state example called an undefined `getSubconnStates(cc)` helper in a way that implied `ClientConn` exposes per-SubConn states directly. Updated the snippet to accept a state provider function, while preserving the note that real implementations track this through custom balancer or resolver logic.

## Review Notes
The PromQL examples are plausible for Prometheus-exported OpenTelemetry metrics, but exact metric and attribute names can vary depending on the exporter and any OpenTelemetry Collector transformations.
