# Validation Summary: How to Set Up Kubernetes Gateway API GRPCRoute for gRPC Traffic Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- GRPCRoute
- ReferenceGrant
- gRPC
- grpc-go
- grpcurl
- ghz
- Prometheus metrics for gRPC services

## Sources Consulted
- Kubernetes Gateway API GRPCRoute documentation: https://gateway-api.sigs.k8s.io/api-types/grpcroute/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API v1.1 release notes for GRPCRoute GA: https://kubernetes.io/blog/2024/05/09/gateway-api-v1-1/
- Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/http-header-modifier/
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go insecure credentials documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- grpcurl README: https://github.com/fullstorydev/grpcurl
- ghz usage and options documentation: https://ghz.sh/docs/usage and https://ghz.sh/docs/options
- go-grpc-middleware Prometheus provider documentation: https://pkg.go.dev/github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus

## Issues Found
- GRPCRoute examples used `gateway.networking.k8s.io/v1alpha2`. GRPCRoute graduated to the Standard channel and is available as `gateway.networking.k8s.io/v1`; all GRPCRoute snippets were updated to `v1`.
- The cross-namespace ReferenceGrant example used `gateway.networking.k8s.io/v1beta1`. ReferenceGrant is available in the current Gateway API `v1`; the snippet was updated to `v1`.
- The Go client examples used deprecated `grpc.Dial` and `grpc.WithInsecure`. They were updated to `grpc.NewClient` and, for plaintext, `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The request header modification example used a `${request_id}` placeholder that is not a portable Gateway API header value. It was replaced with a static header value.
- The Prometheus server example used deprecated `github.com/grpc-ecosystem/go-grpc-prometheus`. It was updated to the maintained `github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus` package.
- The closing statement said HTTPRoute cannot match gRPC traffic, which was too absolute because HTTPRoute can match gRPC paths. It was revised to emphasize that GRPCRoute avoids path-based matching and provides gRPC-aware routing.

## Review Notes
The examples still assume the selected Gateway implementation supports GRPCRoute, HTTP/2 for the configured listeners, and the shown filter behavior. The grpcurl `list` and `describe` commands require server reflection or local descriptor inputs, as documented by grpcurl.
