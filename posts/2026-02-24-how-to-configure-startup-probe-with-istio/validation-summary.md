# Validation Summary: How to Configure Startup Probe with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes startup, liveness, readiness, HTTP, TCP, exec, and gRPC probes
- Istio sidecar injection and probe rewriting
- Istio `proxy.istio.io/config` and `holdApplicationUntilProxyStarts`
- Kubernetes Deployment manifests
- `kubectl` inspection commands

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Feature Gates (removed) - https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Istio documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: ProxyConfig / Global Mesh Options - https://istio.io/latest/docs/reference/config/networking/proxy-config/ and https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- Startup probe version wording was imprecise. Kubernetes lists `StartupProbe` as alpha in 1.16-1.17, beta and enabled by default in 1.18-1.19, and GA in 1.20+. Changed the introduction to say startup probes became available by default in Kubernetes 1.18.
- The liveness `initialDelaySeconds` explanation incorrectly implied the initial delay is added to every post-startup failure detection window. Changed the explanation to focus on the startup-period detection delay and the problem of mixing startup grace into liveness configuration.
- The rewritten Istio application probe port was listed as `15021`. Istio's health-check rewrite documentation shows rewritten application probes on port `15020`; `15021` is used for the sidecar readiness endpoint. Updated the text and YAML snippet to use `15020`.
- The gRPC section said both native gRPC and exec-based probes work with Istio probe rewriting. Istio rewrites HTTP, TCP, and gRPC probes, while exec probes run inside the container and do not need rewriting. Updated the wording.
- The TCP section described false positives as if they always apply under Istio. Istio rewrites TCP probes by default to avoid traffic redirection. Updated the section to scope the false-positive warning to cases where probe rewriting is disabled and to recommend HTTP probes for application-level startup semantics.
- The gRPC probe version note only said Kubernetes 1.24+. Updated it to note that native gRPC probes are available by default in Kubernetes 1.24+ and stable in Kubernetes 1.27+.

## Review Notes
The examples use placeholder image names and health endpoints, which is appropriate for a guide. The YAML structure and `kubectl` commands are valid, but the deployment examples assume Istio sidecar injection is enabled for the namespace or pod.
