# Validation Summary: Common Mistakes to Avoid with Calico Default Deny Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes network policy behavior
- Calico policy ordering and selectors
- calicoctl
- Kubernetes DNS/CoreDNS

## Sources Consulted
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Global network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The default deny examples used `selector: all()` without excluding system namespaces. Official Calico guidance warns that a global default deny policy can affect all workloads, hosts, Kubernetes control plane, and Calico control plane pods. I changed the examples to use a `namespaceSelector` that excludes common system namespaces.
- The DNS allow policy permitted TCP/UDP port 53 to any destination. That would restore DNS resolution but is broader than the Calico-recommended pattern. I scoped the DNS rules to endpoints with `k8s-app == "kube-dns"` while keeping TCP and UDP port 53.
- The policy ordering explanation omitted the tier caveat. I changed it to say policies are evaluated in ascending order within a tier.
- The `calicoctl get globalnetworkpolicies -o wide | sort -k3 -n` command sorted by the selector column in the documented output. I changed it to `sort -k2 -n` to sort by the `ORDER` column.
- The Calico system pods example used a broad allow-all exception policy. I replaced it with the documented safer approach of scoping default deny to non-system namespaces.

## Review Notes
The remaining examples are syntactically consistent with Calico `projectcalico.org/v3` policy resources and current `calicoctl get` options. The DNS selector assumes the common Kubernetes DNS label `k8s-app == "kube-dns"`; clusters with customized DNS labels should adjust that selector before applying the policy.
