# Validation Summary: How to Deploy Consul Connect with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- HashiCorp Consul (service mesh)
- Consul Connect
- Consul Helm chart (consul-k8s) v1.3.2
- Kubernetes (Helm provider, kubernetes_manifest provider, kubernetes_namespace)
- Envoy (sidecar proxy used by Consul Connect)
- Consul ServiceIntentions / ServiceDefaults CRDs
- Consul ACLs, gossip encryption, TLS, transparent proxy

## Sources Consulted
- consul-k8s Helm chart values.yaml at v1.3.2: https://raw.githubusercontent.com/hashicorp/consul-k8s/v1.3.2/charts/consul/values.yaml
- ServiceIntentions CRD: https://raw.githubusercontent.com/hashicorp/consul-k8s/v1.3.2/charts/consul/templates/crd-serviceintentions.yaml
- ServiceIntentions Go types: https://raw.githubusercontent.com/hashicorp/consul-k8s/v1.3.2/control-plane/api/v1alpha1/serviceintentions_types.go
- Inject webhook logic: https://raw.githubusercontent.com/hashicorp/consul-k8s/v1.3.2/control-plane/connect-inject/webhook/mesh_webhook.go
- Annotation constants: https://raw.githubusercontent.com/hashicorp/consul-k8s/v1.3.2/control-plane/connect-inject/constants/annotations_and_labels.go
- consul-k8s release tag: https://github.com/hashicorp/consul-k8s/releases/tag/v1.3.2

## Issues Found
- **Connect injection opt-in via namespace label was incomplete.** The original "Enable Service Injection" example labeled a namespace with `consul.hashicorp.com/connect-inject: "true"`, but with `connectInject.default = false` and no `namespaceSelector` configured, that label alone does nothing — the webhook reads the annotation from pods, not namespaces, and namespace-level filtering requires `connectInject.namespaceSelector` (see `MeshWebhook.shouldInject()` in mesh_webhook.go). Fix: changed `connectInject.default` to `true` and added a `namespaceSelector` matching the same `consul.hashicorp.com/connect-inject: "true"` label, so the namespace label in the second snippet is what actually scopes injection. Updated the inline comment to reflect the new behavior.

## Review Notes
- All Helm values used (`global.tls.*`, `global.acls.manageSystemACLs`, `global.gossipEncryption.autoGenerate`, `server.replicas`/`storage`/`storageClass`/`resources`, `client.enabled`/`grpc`, `connectInject.transparentProxy.defaultEnabled`, `ui.*`) were verified against the v1.3.2 values.yaml and exist at the expected paths.
- Helm chart 1.3.2 is real but somewhat dated (v1.3.x corresponds to Consul ~1.18). Newer chart versions (1.5+, 1.6+) exist; readers may want to bump to a current release.
- `global.tls.enableAutoEncrypt` is still valid in 1.3.2 but the auto-encrypt mechanism is being de-emphasized in newer Consul-K8s releases in favor of the control-plane TLS bootstrapping flow — worth a future update.
- `client.grpc` is valid in 1.3.2 (default `true`); in current Consul on Kubernetes deployments client agents are typically not enabled at all (Consul Dataplane / agentless mode is the modern default). The post's traditional client-DaemonSet architecture is still supported but no longer the recommended default.
- The `kubernetes_manifest` resource sends HCL-converted JSON to the Kubernetes API, so the HCL `name = "*"` wildcard syntax in the ServiceIntentions resources is correct (the API server receives proper JSON/YAML).
- The deny-all + explicit-allow ServiceIntentions pattern shown is the documented zero-trust posture for Consul.
- Best-practices section is accurate: ACL retrofitting, odd Raft quorum sizing, and gossip-encryption/TLS rotation pain points are all well-documented Consul caveats.
