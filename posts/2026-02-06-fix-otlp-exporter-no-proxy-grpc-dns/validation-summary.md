# Validation Summary: How to Fix the OTLP Exporter Not Respecting NO_PROXY Config Due to gRPC DNS

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry OTLP exporters
- grpc-go
- Go `net/http` proxy environment handling
- Kubernetes Services and DNS
- Kubernetes Pod environment variables

## Sources Consulted
- grpc-go proxy documentation: https://github.com/grpc/grpc-go/blob/master/Documentation/proxy.md
- grpc-go `WithNoProxy` and `WithLocalDNSResolution` package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go delegating resolver source: https://github.com/grpc/grpc-go/blob/master/internal/resolver/delegatingresolver/delegatingresolver.go
- grpc-go v1.58.0 source tree, checked locally from the official GitHub repository
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Go exporter documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Go `otlptracehttp` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go `otlptracegrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Go `httpproxy` package documentation for `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`: https://pkg.go.dev/golang.org/x/net/http/httpproxy
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post claimed `GRPC_PROXY` and `GRPC_HTTP_PROXY` were grpc-go-specific proxy environment variables. grpc-go documents proxy support through `HTTPS_PROXY` and `NO_PROXY`, so I replaced that advice with `unset HTTPS_PROXY` / `unset https_proxy` for process-level disabling and kept `grpc.WithNoProxy()` as the code-level option.
- The post recommended grpc-go `v1.58.0` as the minimum version while showing `v1.62.0`. The checked `v1.58.0` source did not include the current proxy implementation or `WithNoProxy`, so I changed the guidance to use a current grpc-go release and updated the sample to `v1.81.1`.
- The root-cause explanation overstated the old behavior as a universal `NO_PROXY` check failure and tied the current issue too strongly to DNS-before-proxy checking. I narrowed the wording to current proxy support and the local DNS resolution edge case.
- The Go snippets used `context.Background()` without importing `context`. I added the missing imports.

## Review Notes
The HTTP/protobuf exporter guidance is technically correct: OTLP supports `http/protobuf`, the HTTP exporter uses port 4318 by default, and the OpenTelemetry Go HTTP exporter uses `http.ProxyFromEnvironment` unless overridden. The Kubernetes `NO_PROXY` example is plausible, but real pod and service CIDRs are cluster-specific, so readers should still confirm their cluster's configured ranges.
