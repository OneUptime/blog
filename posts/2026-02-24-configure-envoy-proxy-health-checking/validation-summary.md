# Validation Summary: How to Configure Envoy Proxy Health Checking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar probe rewriting
- Envoy proxy readiness and upstream health checking
- Kubernetes liveness, readiness, and startup probes
- Istio DestinationRule outlier detection
- Istio EnvoyFilter
- Istio ingress gateway health checks
- AWS Load Balancer Controller annotations

## Sources Consulted
- Istio documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio documentation: DestinationRule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio documentation: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio documentation: Application Requirements / ports used by Istio - https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio documentation: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy documentation: Upstream health checking - https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking
- Envoy API reference: HealthCheck proto - https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- AWS Load Balancer Controller documentation: Ingress annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller documentation: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The post conflated Istio's application probe rewrite port with the proxy readiness port. Current Istio rewrites application probes to pilot-agent on port 15020, while `/healthz/ready` for proxy and gateway readiness is exposed on port 15021. Updated the explanation and request flow.
- The rewritten application probe paths were shown as `/app-health/<app-port>/...`; Istio uses a container-name-based path such as `/app-health/<container-name>/livez`. Updated the endpoint examples.
- The discussion of disabled probe rewriting implied gRPC and TCP probes are a reason because they are not HTTP. Istio rewrites HTTP, TCP, and gRPC probes by default. Updated the wording to describe disabling rewrite as an opt-out for workloads that need original probe handling.
- The global IstioOperator values path used `sidecar_injector.rewriteAppHTTPProbers`, which does not match current Istio documentation. Updated it to `sidecarInjectorWebhook.rewriteAppHTTPProbe`.

## Review Notes
EnvoyFilter-based active health checks are possible, but EnvoyFilter remains a low-level escape hatch whose exact generated cluster match may vary by service, port, subset, and Istio version. In production, validate the generated cluster with `istioctl proxy-config cluster` before relying on the example unchanged.
