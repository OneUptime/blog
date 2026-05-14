# Validation Summary: Common Mistakes to Avoid with Advanced Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- calicoctl
- kubectl
- YAML
- Mermaid

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico NetworkPolicy tutorial: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview

## Issues Found
- The introduction implied that the example policy uses the Calico `projectcalico.org/v3` API, but the core manifest is a standard Kubernetes `networking.k8s.io/v1` NetworkPolicy. Updated the text to state that Calico enforces the standard Kubernetes NetworkPolicy API and that `projectcalico.org/v3` is available for additional Calico-specific controls.

## Review Notes
- The Kubernetes NetworkPolicy YAML uses the current `networking.k8s.io/v1` API and valid selector structure. A single peer entry containing both `namespaceSelector` and `podSelector` correctly selects pods with matching labels inside namespaces with matching labels.
- The egress rule that specifies only `ports` and no `to` selector allows egress to any destination on those ports, which is valid Kubernetes NetworkPolicy behavior.
- The local environment did not have `kubectl` or `calicoctl` installed, so CLI syntax was checked against official documentation rather than local `--help` output.
