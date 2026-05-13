# Validation Summary: How to Migrate to Advanced Kubernetes NetworkPolicy with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl installation and API group guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The introduction implied that the main example used the `projectcalico.org/v3` API, but the YAML snippet is a standard Kubernetes `networking.k8s.io/v1` NetworkPolicy. Updated the wording to clarify that Calico enforces Kubernetes NetworkPolicy and that `projectcalico.org/v3` is used for additional Calico-specific policy capabilities.
- The NetworkPolicy uses `namespaceSelector` values, but the prerequisites did not say that namespaces must carry the labels used by those selectors. Added a prerequisite noting the required namespace labels.
- The allowed access test was described as cross-namespace traffic, but the command executed from the `production` namespace to a service in the `production` namespace. Updated the example to execute from a separate `frontend` namespace labeled `environment=production`.

## Review Notes
The Kubernetes NetworkPolicy YAML is syntactically valid and uses the current `networking.k8s.io/v1` API. The `kubectl exec` and `calicoctl apply -f` command forms are current. The second egress rule intentionally has no `to` selector, which means it allows the listed ports to any destination for selected pods.
