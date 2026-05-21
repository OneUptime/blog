# Validation Summary: How to Set Up gRPC Health Checking with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- gRPC health checking protocol
- Kubernetes liveness and readiness probes
- Kubernetes gRPC probes
- grpc-health-probe
- Dockerfile snippets

## Sources Consulted
- gRPC Health Checking Protocol: https://grpc.github.io/grpc/cpp/md_doc_health-checking.html
- gRPC Health Checking guide: https://grpc.io/docs/guides/health-checking/
- Kubernetes gRPC probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/#grpc-probes
- Kubernetes 1.24 gRPC probes beta announcement: https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- gRPC over HTTP/2 protocol documentation: https://grpc.github.io/grpc/core/md_doc__p_r_o_t_o_c_o_l-_h_t_t_p2.html

## Issues Found
- The gRPC health proto example omitted the `SERVICE_UNKNOWN = 3` enum value. Added it to match the official health checking protocol.
- The Kubernetes version statement said native gRPC probes were supported since Kubernetes 1.24. Clarified that they were beta and enabled by default in 1.24, then stable in 1.27.
- The Istio probe rewrite section pointed rewritten probes at port 15021. Corrected this to port 15020 for rewritten application probes; 15021 is used for Istio proxy health/status checks.
- The mesh verification command looked in mesh `defaultConfig` for probe rewriting. Updated it to check the sidecar injector `rewriteAppHTTPProbe` setting and clarified that `holdApplicationUntilProxyStarts` is separate.
- The Envoy section described outlier detection as Envoy health checking and described gRPC error mapping backwards. Reworded it as passive outlier detection and noted that Envoy evaluates gRPC outlier detection using HTTP status mapped from the `grpc-status` response header.

## Review Notes
- The Kubernetes YAML examples use valid `grpc.port` and `grpc.service` fields. The `service` field maps to `HealthCheckRequest.service`; leaving it empty checks the server-wide health status.
- The exec probe fallback remains technically valid for older Kubernetes clusters and bypasses Istio sidecar probe rewriting because exec probes run inside the application container.
- The DestinationRule example is valid as passive outlier detection, but it is not active health checking.
