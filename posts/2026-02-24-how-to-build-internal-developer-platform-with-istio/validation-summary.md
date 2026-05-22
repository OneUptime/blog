# Validation Summary: How to Build Internal Developer Platform with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes operators and controller-runtime
- Kubernetes namespaces and RBAC
- Istio VirtualService and DestinationRule
- Istio AuthorizationPolicy
- Istio Telemetry and standard Prometheus metrics
- Kiali, Grafana, and Jaeger
- kubectl and istioctl

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Jaeger integration documentation: https://istio.io/latest/docs/ops/integrations/jaeger/
- Istio Kiali task documentation: https://istio.io/latest/docs/tasks/observability/kiali/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- controller-runtime controllerutil package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil

## Issues Found
- The operator example used `r.Create` for generated Istio resources. That would fail with an already-exists error on subsequent reconciles instead of converging state. Changed the example to use `controllerutil.CreateOrUpdate`.
- The Go snippet imported unused Istio and Kubernetes packages, and did not import the custom platform API type used by `platformv1.ServiceConfig`. Removed unused imports and added a representative platform API import.
- The default `DestinationRule` used `host: "*.team-backend.svc.cluster.local"`. Istio `DestinationRule` hosts must resolve to a service registry or ServiceEntry host; that wildcard Kubernetes service host would not apply as a namespace-wide default. Changed the example to a concrete service host and adjusted the surrounding sentence to describe per-service traffic policy defaults.
- Updated Istio networking examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API used in the Istio reference documentation.

## Review Notes
- The `AuthorizationPolicy` examples are technically valid for sidecar-mode workloads. In ambient mode with waypoint proxies, Istio policy targeting has additional considerations, but the post is framed around sidecar injection.
- The Prometheus metric names and labels used in the Grafana dashboard are standard Istio metrics, assuming default Prometheus telemetry dimensions have not been removed through Telemetry overrides.
