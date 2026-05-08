# Validation Summary: Auditing a Demo Application Secured with Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumEndpoint
- Kubernetes
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 Policy examples: https://docs.cilium.io/en/stable/security/policy/language/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Cilium v1.19.3 API source for CiliumEndpoint status fields: https://github.com/cilium/cilium/blob/v1.19.3/pkg/k8s/apis/cilium.io/v2/types.go
- Cilium v1.19.3 API source for policy rule fields: https://github.com/cilium/cilium/blob/v1.19.3/pkg/policy/api/rule.go
- jq 1.7 local CLI availability check

## Issues Found
- The post used `jq` in multiple command examples but did not list it as a prerequisite. Added `jq installed` to the prerequisites.
- The missing egress restriction check only matched policies where `.spec.egress` was absent or null. Cilium policy rules with an omitted or empty egress section do not apply at egress, so the filter now treats null as an empty list and checks the resulting length.
- The audit report inferred default deny from policy names containing `deny`, which is not technically reliable. Replaced that name-based check with endpoint policy enforcement counts from `CiliumEndpoint` status for ingress and egress.

## Review Notes
The remaining commands and field references are consistent with current Cilium and kubectl documentation. The examples are intentionally lightweight and audit only namespaced `CiliumNetworkPolicy` resources in the `demo` namespace; a broader production audit would also inspect Kubernetes `NetworkPolicy`, `CiliumClusterwideNetworkPolicy`, policy exceptions, and multi-rule `specs` entries where used.
