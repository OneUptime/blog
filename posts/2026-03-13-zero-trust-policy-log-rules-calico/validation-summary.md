# Validation Summary: Zero Trust with Calico Policy Log Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico `GlobalNetworkPolicy`
- Calico `NetworkPolicy`
- Calico log rules
- Kubernetes `kubectl exec`

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described Calico policy logging but the main policy example did not include any Calico `action: Log` rules. I added `Log` rules before the matching `Allow` rules for ingress and egress, consistent with Calico's documented rule behavior where processing continues after `Log` and `Allow` is final.
- The global default deny policy selected all namespaces, including system namespaces. Calico's default deny guidance warns that broad global default deny policies can affect control plane and Calico system pods. I added a `namespaceSelector` excluding common system namespaces.
- Several references to "Policy Log Rules in Calico" and "Policy Logging" were technically imprecise. I updated them to refer to Calico log rules while preserving the post's original structure and intent.

## Review Notes
The YAML examples use the current `projectcalico.org/v3` API and valid Calico rule fields. The verification command uses valid `kubectl exec` syntax, but it assumes `unauthorized-pod` exists in the `production` namespace and has `curl` installed.
