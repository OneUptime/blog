# Validation Summary: How to Test Network Policies with Calico on On-Prem Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Services and kubectl
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- calicoctl
- BusyBox wget

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- BusyBox wget documentation: https://busybox.net/BusyBox.html

## Issues Found
- The BusyBox `wget` commands used `--timeout=5`, which is not documented by BusyBox wget. Updated the commands to use `-T 5`, the documented network read timeout option, and split `-q -O-` for clarity.
- The introduction described Calico's richer policies as supporting "egress rules, CIDR-based selectors, and ordering." Kubernetes NetworkPolicy already supports egress and IP block CIDR rules, while Calico adds capabilities such as global scope, explicit deny actions, CIDR-based matches, and ordered policy evaluation. Updated the wording to avoid overstating the difference.
- The GlobalNetworkPolicy example used `selector: all()`, which Calico documents as matching endpoints across namespaces and host endpoints. For a safe test workflow, scoped the selector to `projectcalico.org/namespace == "policy-demo"` and renamed the policy consistently in the delete command.
- The Calico GlobalNetworkPolicy example used an empty `egress: []` list. Calico's default-deny examples rely on selecting endpoints with `types: Egress` and no allow rules. Removed the empty egress list while keeping `types: Egress`.

## Review Notes
The post is technically valid after the corrections. The examples assume that Calico is enforcing Kubernetes NetworkPolicy, that `calicoctl` is configured for the cluster datastore, and that DNS and external network access are available before the egress-deny test is applied.
