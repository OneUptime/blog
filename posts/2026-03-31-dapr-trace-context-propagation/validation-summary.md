# Validation Summary: How to Use Trace Context Propagation in Dapr SDKs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, service invocation, pub/sub)
- W3C TraceContext (traceparent, tracestate headers)
- OpenTelemetry (trace propagation in Python)
- Dapr Go SDK (github.com/dapr/go-sdk)
- Dapr Python SDK (dapr.clients)
- Zipkin (tracing backend)
- Kubernetes (kubectl apply, port-forward)

## Sources Consulted
- Dapr Configuration resource schema: `pkg/apis/configuration/v1alpha1/types.go` in the Dapr runtime source — confirms `apiVersion: dapr.io/v1alpha1`, `kind: Configuration`, `spec.tracing.samplingRate`, and `spec.tracing.zipkin.endpointAddress` field paths.
- Dapr Go SDK `client/invoke.go` and `client/client.go` — confirms `InvokeMethod(ctx context.Context, appID, methodName, verb string) (out []byte, err error)` signature, with verb uppercased internally via `strings.ToUpper`.
- Dapr Python SDK `dapr/clients/grpc/client.py` — confirms `invoke_method` accepts `app_id`, `method_name`, `data`, `http_verb`, and `metadata` keyword arguments.
- W3C Trace Context specification (https://www.w3.org/TR/trace-context/) — confirms `traceparent` format: `00-{32 hex trace-id}-{16 hex parent-id}-{2 hex trace-flags}`. The example value `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01` is the canonical example from the spec.
- Dapr HTTP API documentation — confirms service invocation URL format: `http://localhost:<daprPort>/v1.0/invoke/<appID>/method/<method-name>`.
- Dapr observability documentation — confirms Dapr uses W3C TraceContext and automatically propagates trace context for individual service-to-service hops.

## Issues Found

1. **Unused Go imports (compilation error):** The Go code example imported `"go.opentelemetry.io/otel"` and `"go.opentelemetry.io/otel/propagation"` but neither was used in the function body. Go treats unused imports as compilation errors. Removed both unused imports.

2. **Incorrect Zipkin UI description:** The post described the Zipkin UI as showing a "flame graph" of traces. Zipkin displays a timeline/waterfall view, not a flame graph. Changed "flame graph" to "trace timeline."

## Review Notes
- The Python SDK's `metadata` parameter on `invoke_method` is marked as deprecated in the Dapr Python SDK source code. The code still works, but future SDK versions may remove it. The Dapr sidecar handles trace propagation automatically for service invocation, so manual injection via `metadata` is only needed in advanced multi-hop scenarios where the application orchestrates multiple sequential outbound calls.
- The `invoke_method` on the Python gRPC client is itself deprecated in favor of gRPC proxying. This is a broader SDK evolution and does not affect the correctness of the tutorial for current usage.
- The post's claim that the sidecar handles propagation "transparently" is accurate for single-hop service invocations. For multi-hop scenarios (e.g., Service A calls B, then A calls C), the application must manually extract and forward trace headers. The Python example correctly demonstrates this manual approach.
