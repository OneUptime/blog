# Validation Summary: How to Run Dapr Alongside Consul Connect

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- HashiCorp Consul Connect (service mesh)
- Kubernetes
- Helm
- mTLS (mutual TLS)

## Sources Consulted
- [Install Consul on Kubernetes with Helm | HashiCorp Developer](https://developer.hashicorp.com/consul/docs/deploy/server/k8s/helm)
- [Helm Chart Reference | HashiCorp Developer](https://developer.hashicorp.com/consul/docs/reference/k8s/helm)
- [Consul on Kubernetes annotations and labels reference | HashiCorp Developer](https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label)
- [Connect Kubernetes services with Consul | HashiCorp Developer](https://developer.hashicorp.com/consul/docs/connect/k8s/inject)
- [Commands: Intention Create | HashiCorp Developer](https://developer.hashicorp.com/consul/commands/intention/create)
- [Create and manage service intentions | HashiCorp Developer](https://developer.hashicorp.com/consul/docs/secure-mesh/intention/create)
- [consul-k8s v1.0.x Release Notes | HashiCorp Developer](https://developer.hashicorp.com/consul/docs/release-notes/consul-k8s/v1_0_x)
- [HashiCorp Consul name resolution | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/)
- [Deploy Dapr on a Kubernetes cluster | Dapr Docs](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/)
- [Configuration spec | Dapr Docs](https://docs.dapr.io/reference/resource-specs/configuration-schema/)
- [Setup & configure mTLS certificates | Dapr Docs](https://docs.dapr.io/operations/security/mtls/)
- [Service invocation API reference | Dapr Docs](https://docs.dapr.io/reference/api/service_invocation_api/)
- [Dapr and service meshes | Dapr Docs](https://docs.dapr.io/concepts/faq/service-mesh/)

## Issues Found

1. **Consul Helm `controller.enabled=true` removed in modern versions**: The `controller` Helm stanza was removed in consul-k8s v1.0.0 (Consul 1.14+). The CRD controller functionality was folded into the `connectInject` deployment, so `connectInject.enabled=true` alone is sufficient. Removed `--set controller.enabled=true` from the Helm install command.

2. **Dapr Consul name resolution used wrong CRD kind and structure**: The post configured Consul name resolution using `kind: Component` with `spec.type: nameresolution.consul` and flat `spec.metadata` key-value pairs. The correct approach is to use `kind: Configuration` with nested `spec.nameResolution.component` and `spec.nameResolution.configuration` fields. Replaced the entire YAML block with the correct Configuration format.

## Review Notes
- The `consul intention create` CLI command is deprecated since Consul 1.9.0 in favor of ServiceIntentions CRDs or `consul config write`. The post already shows the CRD alternative, so this is acceptable as-is, but readers should prefer the CRD approach.
- The Dapr mTLS configuration (`spec.mtls.enabled: false`) is correct, but in production this should be applied to the control-plane Configuration resource (typically named `daprsystem`). The blog uses the name `appconfig` which works but may cause confusion.
- Using `selfRegister` alongside `advancedRegistration` is redundant since `advancedRegistration` overrides `selfRegister`, `checks`, `tags`, and `meta`. Both are included for clarity but in practice only `advancedRegistration` takes effect.
- The Dapr service invocation URL format (`localhost:3500/v1.0/invoke/{app-id}/method/{method}`) is correct and current.
- All Consul Kubernetes annotations (`consul.hashicorp.com/connect-inject`, `consul.hashicorp.com/connect-service`) and Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are valid and current.
