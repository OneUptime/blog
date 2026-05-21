# Validation Summary: How to Configure Proxy Liveness Probe in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection and health probe rewriting
- Kubernetes liveness, readiness, startup, TCP, HTTP, gRPC, and exec probes
- Envoy / Istio sidecar proxy health endpoints
- IstioOperator configuration
- kubectl debugging commands
- Prometheus restart metrics

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Installing the Sidecar / Custom templates: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Application Requirements / Ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post recommended adding a proxy liveness probe for all production workloads. Changed this to a more conservative recommendation because Kubernetes warns that liveness probes should be used carefully, and Istio does not add one by default.
- The custom injection template example used an incomplete direct ConfigMap structure. Replaced it with the documented IstioOperator `values.sidecarInjectorWebhook.templates` custom template pattern and the `inject.istio.io/templates` pod annotation.
- The post suggested `ProxyConfig` with custom bootstrap as a practical way to configure a Kubernetes liveness probe. Replaced this with an `istio-proxy` pod-spec override, which matches Istio's documented injection override behavior.
- The rewritten application liveness probe used port `15021`. Updated it to port `15020`, matching Istio's documented `/app-health/.../livez` rewrite example.
- The global probe rewrite setting used `sidecar_injector.rewriteAppHTTPProbers`. Updated it to `sidecarInjectorWebhook.rewriteAppHTTPProbe`, matching current Istio install values.
- The description of disabled probe rewriting implied the proxy passes the original request through cleanly. Reworded it to explain that the kubelet uses the original application port/path and that Istio inbound capture can still affect the request.
- The mTLS explanation said the proxy handles mTLS for rewritten probes. Reworded it to the more precise behavior: the probe goes to the sidecar agent status port, which performs the local application check.
- The TCP probe section said TCP probes are not rewritten and work before the proxy layer. Corrected it because Istio rewrites TCP probes by default; without rewriting, inbound redirection can make TCP probes always appear successful while the sidecar is running.
- The gRPC section said Kubernetes 1.24+ supports native gRPC probes. Updated it to note that gRPC probes are stable as of Kubernetes 1.27.
- The debugging command for the rewritten app-health endpoint used port `15021`. Updated it to `15020`.

## Review Notes
The remaining examples are illustrative snippets and assume a cluster with Istio sidecar injection enabled, kube-state-metrics for the Prometheus metrics, and container images that include the debugging tools used in the `kubectl exec` commands.
