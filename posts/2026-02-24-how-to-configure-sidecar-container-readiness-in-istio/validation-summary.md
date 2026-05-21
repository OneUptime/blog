# Validation Summary: How to Configure Sidecar Container Readiness in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar proxy readiness
- Kubernetes readiness, startup, TCP, HTTP, and gRPC probes
- Kubernetes readiness gates
- Kubernetes Deployments and rolling updates
- Istio probe rewriting and mTLS

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio 1.20 Upgrade Notes: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/upgrade-notes/
- Kubernetes Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Pod Conditions: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The IstioOperator value for global probe rewriting was shown as `rewriteAppHTTPProbers`. Changed it to the documented `rewriteAppHTTPProbe` value.
- The post said only HTTP probes are rewritten and that the rewrite validates the full traffic path through the sidecar. Updated this to state that Istio rewrites HTTP, TCP, and gRPC probes to the sidecar agent, and clarified the TCP benefit.
- The sidecar readiness customization example used `proxy.istio.io/config` with a nested Kubernetes `readinessProbe`, which is not the documented way to tune the injected Envoy readiness probe. Replaced it with the documented `readiness.status.sidecar.istio.io/*` pod annotations.
- The TCP readiness section said TCP probes are not rewritten by Istio. Corrected it to explain that Istio rewrites TCP probes by default and has the sidecar agent perform the port check to avoid redirect-related false positives.

## Review Notes
The remaining examples and explanations align with current Istio and Kubernetes documentation. The exact injected sidecar probe defaults can vary with mesh install values, but the defaults shown match Istio's documented recommended default readiness settings.
