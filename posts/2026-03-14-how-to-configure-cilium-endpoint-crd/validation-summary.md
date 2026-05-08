# Validation Summary: Configuring Cilium Endpoint Custom Resource Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEndpoint CRD
- Helm
- kubectl
- Cilium CLI and cilium-dbg
- Kubernetes Pod bandwidth annotations

## Sources Consulted
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg endpoint health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium Go API reference for CiliumEndpoint status fields: https://pkg.go.dev/github.com/cilium/cilium/pkg/k8s/apis/cilium.io/v2
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The description and introduction implied that users configure CiliumEndpoint custom resources directly to control endpoint behavior. Cilium creates and manages CiliumEndpoint objects automatically, so the wording was changed to emphasize inspecting CiliumEndpoint status and configuring Cilium settings that affect endpoints.
- Removed the `endpointStatus` Helm values block because it is not a current Cilium Helm value in the official Helm reference.
- Corrected the `labels` Helm example to use identity-relevant label patterns such as `app`, `env`, and `io\\.kubernetes\\.pod\\.namespace` instead of endpoint label strings with the `k8s:` source prefix.
- Moved `endpointGCInterval` under `operator.endpointGCInterval`, which is the current Helm values path for endpoint garbage collection.
- Removed the `kubernetes.io/ingress-bandwidth` annotation from the Cilium bandwidth manager example. Kubernetes documents the annotation, but Cilium's bandwidth manager Helm reference specifically describes rate limiting individual Pods through `kubernetes.io/egress-bandwidth`.
- Replaced `cilium endpoint list` and `cilium endpoint health` in the verification section with `cilium-dbg` commands executed inside the Cilium agent pod, because endpoint inspection is part of the local agent debug CLI command set.

## Review Notes
- The CiliumEndpoint status example is structurally consistent with the current CiliumEndpoint status API, including identity, networking, policy direction, and endpoint state fields.
- The `labels` Helm value appends identity-relevant label patterns to Cilium defaults; it does not completely replace the default label pattern set.
