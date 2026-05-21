# Validation Summary: How to Fix Readiness Probe Failures with Istio Sidecar

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Kubernetes readiness, liveness, and startup probes
- Kubernetes readiness gates
- Istio sidecar injection
- Istio probe rewriting
- Istio mTLS
- Istio Sidecar resource
- istioctl

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Istio documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Global Mesh Options / ProxyConfig - https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio documentation: Sidecar resource - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio documentation: Using the istioctl Command-line Tool - https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: Application Requirements / ports used by Istio - https://istio.io/latest/docs/ops/deployment/application-requirements/

## Issues Found
- The post said rewritten readiness probes are redirected through pilot-agent on port 15021. Current Istio health-check documentation shows rewritten application probes using the agent status port, which defaults to 15020. Updated the explanation, verification text, and curl command to use 15020 for rewritten app-health probes.
- The Sidecar resource example used `apiVersion: networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for the Sidecar API, so the example was updated to the current API version.
- The readiness gate section implied Istio itself can add pod readiness gates. Kubernetes readiness gates are valid, but this was too broad as an Istio claim. Reworded it to refer to workload or platform readiness gates.
- The custom sidecar readiness example used `ISTIO_META_DNS_CAPTURE`, which configures DNS capture metadata and does not make the sidecar wait for specific readiness configuration. Replaced it with documented `readiness.status.sidecar.istio.io/*` annotations for application ports and sidecar readiness probe timing.
- The checklist suggested testing Istiod reachability with `curl istiod:15012`. Port 15012 is Istio XDS over mTLS, so a simple curl check is misleading. Replaced it with `istioctl proxy-status`, which is the documented way to inspect proxy sync status.

## Review Notes
The post is technically relevant and remains a valid troubleshooting guide. Probe rewriting is enabled by default in Istio built-in profiles, but the `sidecar.istio.io/rewriteAppHTTPProbers` annotation can still be used to control behavior per pod.
