# Validation Summary: How to Configure Sidecar Injection at Namespace Level

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection
- Istio control plane revisions and revision tags
- Kubernetes namespaces and labels
- Kubernetes mutating admission webhooks
- Istio `Sidecar` and `ProxyConfig` resources
- `kubectl` and `istioctl`

## Sources Consulted
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Canary Upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Istio command reference: `istioctl tag set` - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio reference: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio reference: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio reference: ProxyConfig - https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio reference: Sidecar - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio diagnostic tools: `istioctl experimental check-inject` - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Kubernetes documentation: Admission Webhook Good Practices - https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes documentation: Admission Controllers - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- The post described namespace-level proxy configuration as being done through annotations, Telemetry, or EnvoyFilter. Istio's current API provides namespace-level proxy settings through a selector-less `ProxyConfig` resource in the namespace. Replaced that paragraph with an accurate `ProxyConfig` example and noted that workload restarts are required.
- The `Sidecar` example used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for `Sidecar`, so the snippet was updated.
- The post said Kubernetes processes mutating webhooks in order of webhook configuration names. Kubernetes documentation explicitly says mutating admission webhooks do not run in a consistent order. Reworded this section to avoid relying on ordering.
- The troubleshooting command assumed the injector webhook is always named `istio-sidecar-injector`. That is not reliable with revisions and revision tags. Replaced it with `istioctl experimental check-inject` plus commands to list Istio webhook configurations and inspect the matching webhook.

## Review Notes
The core namespace injection labels, revision labels, revision tags, restart requirement, and `Sidecar` scoping concepts matched Istio's current documentation. The `kubectl` and `istioctl` binaries were not available in the local environment, so command validation was performed against official Kubernetes and Istio documentation rather than local `--help` output.
