# Validation Summary: How to Handle Large Payload Transfers Through Istio Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- Service mesh sidecars
- HTTP/2
- gRPC
- Go grpc-go
- Prometheus/Istio telemetry

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio request timeout task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy HTTP/2 protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto.html
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy flow control FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/flow_control
- Envoy buffer filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/buffer_filter
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc

## Issues Found
- The post said Envoy's HTTP/2 initial stream and connection windows default to 64 KB and 1 MB. Current Envoy documentation lists defaults of 16 MiB and 24 MiB, so the defaults and tuning example were updated.
- Header limits were clarified from a broad "60 KB request/response" statement to Envoy's documented request and response header defaults, including the HTTP/1 response-header exception.
- The post implied Envoy buffers the entire request body by default. Envoy can proxy arbitrarily large bodies when filters are streaming; buffering issues arise from filters that require full-body buffering. The request body section was corrected.
- The timeout explanation implied a VirtualService timeout directly prevents an upload body from being killed mid-upload. The wording was adjusted to describe it as an overall long-running request/response timeout and point idle pauses to stream idle timeout.
- The post described gRPC's 4 MB limit too broadly. It was narrowed to received message limits that commonly default to 4 MB, with a note to check both client and server send/receive settings.
- The Go gRPC example used deprecated `grpc.Dial`. It was updated to `grpc.NewClient`, and the server-side `grpc.MaxRecvMsgSize` / `grpc.MaxSendMsgSize` options were mentioned.

## Review Notes
EnvoyFilter examples are version-sensitive and should be tested against the specific Istio/Envoy version used in production, because Envoy's xDS schema and Istio-generated config can change between releases.
