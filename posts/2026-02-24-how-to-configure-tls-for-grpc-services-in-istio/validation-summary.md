# Validation Summary: How to Configure TLS for gRPC Services in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- gRPC and gRPC-Web
- TLS and mTLS
- Kubernetes Services, Gateways, VirtualServices, PeerAuthentication, and probes
- gRPC-Go

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go insecure credentials documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- Envoy gRPC architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc.html
- Envoy gRPC-Web filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter

## Issues Found
- The post said the client sends a gRPC request to localhost. In normal sidecar mode, applications send to the service address and the sidecar transparently intercepts the traffic. Updated the wording.
- The port naming section said the port must start with `grpc`. Istio can automatically detect HTTP/2, but explicit protocol selection is the reliable configuration and is important for gateway forwarding. Updated the wording.
- The gateway section said the gateway automatically detects HTTP/2 and gRPC inside HTTPS. Istio documentation says gateways need explicit protocol selection to forward HTTP/2/gRPC to backends. Updated the note to require backend Service protocol declaration.
- The Go client example used deprecated `grpc.Dial` and `grpc.WithInsecure()`. Updated it to `grpc.NewClient` with `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The gRPC-Web section implied that a Gateway manifest alone enables gRPC-Web conversion. Envoy supports gRPC-Web through the `grpc_web` HTTP filter, but the filter must be configured. Updated the text to make that requirement explicit.

## Review Notes
The PeerAuthentication, VirtualService `http` routing, Kubernetes gRPC probe, and Istio probe rewrite examples align with current official documentation. Future revisions could include a complete EnvoyFilter example for gRPC-Web, but adding a new section was outside the requested minimal correction scope.
