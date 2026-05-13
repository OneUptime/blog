# Validation Summary: How to Configure Flagger with Gateway API GRPCRoute

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Gateway API
- HTTPRoute
- GRPCRoute
- Kubernetes Deployments and Services
- Kubernetes gRPC readiness probes
- Helm
- Prometheus
- gRPC

## Sources Consulted
- Flagger Gateway API Canary Deployments: https://docs.flagger.app/tutorials/gatewayapi-progressive-delivery
- Flagger Canary CRD in upstream source: https://github.com/fluxcd/flagger/blob/main/artifacts/flagger/crd.yaml
- Flagger Gateway API router implementation: https://github.com/fluxcd/flagger/blob/main/pkg/router/gateway_api.go
- Flagger metrics documentation: https://docs.flagger.app/usage/metrics
- Kubernetes Gateway API getting started / CRD installation: https://gateway-api.sigs.k8s.io/guides/getting-started/
- Kubernetes Gateway API GRPCRoute reference: https://gateway-api.sigs.k8s.io/api-types/grpcroute/
- Kubernetes gRPC probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The post claimed Flagger supports and manages Gateway API GRPCRoute resources. Flagger's current Gateway API integration requires HTTPRoute and the upstream router code only creates and updates HTTPRoute resources, so the post was corrected to describe Flagger managing HTTPRoute for gRPC traffic.
- The title, tags, description, introduction, route configuration section, canary example, traffic splitting example, and conclusion were updated from GRPCRoute-specific Flagger configuration to HTTPRoute-based Flagger configuration.
- The Gateway API CRD install command used the old v1.0.0 experimental bundle. It was updated to the current v1.5.0 standard install command from the official Gateway API docs.
- The Kubernetes prerequisite was updated from 1.24 to 1.27 because built-in gRPC probes are stable in Kubernetes v1.27.
- The Helm and Canary provider examples used `gatewayapi`, but Flagger's CRD and official docs use `gatewayapi:v1` or `gatewayapi:v1beta1`. The examples now use `gatewayapi:v1`.
- The Canary service configuration omitted HTTPRoute-specific `hosts`, `match`, and `portName` fields needed for the example to match the described gRPC routing behavior. These were added.
- The original Canary used built-in `request-success-rate` and `request-duration` metrics for a Gateway API gRPC example. The post now references custom gRPC Prometheus MetricTemplates, matching Flagger's documented custom metric mechanism for provider-specific metrics.
- The example managed route was changed from a GRPCRoute backendRefs example to an HTTPRoute backendRefs example with a path prefix match for the gRPC service path.

## Review Notes
- Gateway API GRPCRoute is GA and is the preferred Gateway API resource when users need gRPC-specific matching or policies. However, this post now correctly scopes Flagger usage to HTTPRoute because Flagger does not currently document or implement GRPCRoute management.
- The Prometheus metric names in the examples assume applications are instrumented with gRPC server metrics that expose `grpc_server_handled_total` and `grpc_server_handling_seconds_bucket`. Teams may need to adapt label names to their instrumentation and Prometheus setup.
