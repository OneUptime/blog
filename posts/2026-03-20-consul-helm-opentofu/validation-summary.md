# Validation Summary: How to Deploy HashiCorp Consul on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul (service mesh, service discovery, mTLS)
- HashiCorp Consul Helm chart (consul-k8s) v1.3.0
- OpenTofu / Terraform (helm_release, kubernetes_namespace, kubernetes_manifest, kubernetes_deployment)
- Kubernetes
- Consul CRDs: ServiceIntentions, IngressGateway

## Sources Consulted
- HashiCorp Consul on Kubernetes documentation: https://developer.hashicorp.com/consul/docs/k8s
- Consul Connect injection docs: https://developer.hashicorp.com/consul/docs/k8s/connect
- consul-k8s GitHub repository and chart values: https://github.com/hashicorp/consul-k8s
- Consul Helm chart v1.3.0 `values.yaml` (released 2023-11-08)
- HashiCorp Helm releases repository: https://helm.releases.hashicorp.com

## Issues Found
1. **Step 2 — Incorrect namespace-level opt-in mechanism (fixed).**
   The original example added a label `consul.hashicorp.com/connect-inject = "true"` on a `kubernetes_namespace` resource and described it as enabling Consul Connect injection for the namespace. This is not a real opt-in mechanism. Per the official Consul docs, when `connectInject.default = false` (as configured in Step 1), pods opt in via the **pod annotation** `consul.hashicorp.com/connect-inject: "true"` on the pod template. Namespace scoping is controlled by the Helm values `connectInject.k8sAllowNamespaces` / `k8sDenyNamespaces`, not by a label on the Namespace object. Replaced the example with a `kubernetes_deployment` that sets the correct pod-template annotation, and adjusted the surrounding sentence to reflect that pods (not namespaces) opt in.

## Review Notes
- The Helm chart version `1.3.0` is real (released 2023-11-08) but is now ~18 months old; the latest stable on 2026-05-04 is `v1.9.7`. The post is still functional with 1.3.0; pinning to a specific known version is reasonable for a tutorial, so the version was left as-is.
- `client.enabled = true` (Step 1) is still supported in chart 1.3.0 but selects the legacy client-agent architecture. The modern default is **Consul Dataplane**, where per-node client agents are not deployed (chart default for `client.enabled` is `false`). The configuration as written is valid and intentional, so it was left as-is, but readers should be aware that production deployments today typically omit client agents in favor of Dataplane.
- All Helm value keys used (`global.tls.enabled`, `global.gossipEncryption.autoGenerate`, `global.acls.manageSystemACLs`, `global.metrics.*`, `server.*`, `connectInject.*`, `ui.*`, `ingressGateways.*`) are valid in chart 1.3.0.
- The `ServiceIntentions` CRD (`apiVersion: consul.hashicorp.com/v1alpha1`) and its spec (`destination.name`, `sources[].name`, `sources[].action`) are correct, including the wildcard `name: "*"` with `action: deny` as the idiomatic default-deny pattern.
- The `IngressGateway` CRD (`apiVersion: consul.hashicorp.com/v1alpha1`) and its spec (`listeners[].port`, `listeners[].protocol`, `listeners[].services[].name`, `listeners[].services[].hosts`) are correct.
- The `kubernetes_manifest` resource correctly uses `depends_on = [helm_release.consul]` in Step 3 to ensure CRDs are installed before the manifest is applied; the same dependency would be advisable for the `IngressGateway` in Step 4 as well, though its absence is not a strict error since OpenTofu can usually resolve it via implicit ordering when the namespace exists.
