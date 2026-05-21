# Validation Summary: How to Configure Proxy Readiness Probe in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar proxy readiness
- Kubernetes readiness probes
- Kubernetes Deployments
- Istio sidecar injection
- Istio application health probe rewriting
- kubectl debugging commands

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Global Mesh Options / ProxyConfig: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio pilot-agent readiness probe source: https://github.com/istio/istio/blob/master/pilot/cmd/pilot-agent/status/ready/probe.go
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The proxy readiness explanation overstated what `/healthz/ready` proves by listing route setup and TLS certificate provisioning. Updated it to match Istio's readiness probe behavior: initial control-plane config received, Envoy live state reached, and worker threads started.
- The `holdApplicationUntilProxyStarts` explanation described the implementation as a `postStart` lifecycle hook. Updated it to match Istio's documented behavior: the sidecar injector places the sidecar first and configures it to block other containers until the proxy is ready.
- The `applicationPorts` section said Istio verifies that application ports are being listened on and that traffic can reach the application. Updated it to match Istio's annotation reference: the readiness probe uses the port list to determine that Envoy is configured and ready to receive traffic for those application ports, and this does not replace application readiness.
- The application probe rewrite section used the wrong IstioOperator values path and field name. Changed `values.sidecar_injector.rewriteAppHTTPProbers` to `values.sidecarInjectorWebhook.rewriteAppHTTPProbe`.
- The rewritten application readiness probe example used port `15021`. Istio's current documentation shows rewritten app probes going to the sidecar agent on port `15020`, so the example was corrected.
- The probe rewrite explanation said health checks validate the entire data path. Updated it to say the sidecar agent forwards the probe to the original application path and port and returns the application response status, which is the behavior documented by Istio.
- The rolling update section overstated Kubernetes behavior by saying old pods are not terminated until new pods are ready. Updated it to explain that readiness informs availability and rollout progress, while the exact behavior also depends on rolling update settings such as `maxUnavailable`.
- The rolling update Deployment example omitted required `selector`, pod labels, and container spec fields for an `apps/v1` Deployment. Added the missing fields so the manifest is syntactically valid.

## Review Notes
The sidecar readiness annotations are documented by Istio as Alpha. The post does not pin a specific Istio version, so the review used current Istio documentation as of the validation date.
