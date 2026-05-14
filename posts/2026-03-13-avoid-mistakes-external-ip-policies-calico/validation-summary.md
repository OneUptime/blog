# Validation Summary: Common Mistakes to Avoid with External IP Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico network sets
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Calico Open Source external IPs or networks policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico Open Source NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Open Source calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes label selector task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/

## Issues Found
- The introduction described "External IP Policies" as if they were a distinct Calico resource. Updated the wording to describe Calico network policy rules that match external IPs/CIDRs through `NetworkPolicy`, `GlobalNetworkPolicy`, and network set resources.
- The DNS egress allow example permitted all UDP/TCP traffic to port 53 regardless of destination. Added `namespaceSelector` and `selector` matches for kube-dns/CoreDNS in `kube-system` so the example follows the documented default-deny exception pattern more closely.
- The policy order check used `calicoctl get networkpolicies -o wide | sort -k4 -n`, which assumes an output column layout that the official `calicoctl get` reference does not guarantee. Replaced it with YAML output so reviewers can inspect `spec.order` directly.
- The bidirectional-rules section overstated the requirement. Updated it to say both source egress and destination ingress must be permitted when both endpoints are isolated by policy.
- The architecture diagram showed a destination pod even though the post is about external IP/network matching. Updated the destination node to "External IP / Network."

## Review Notes
The remaining YAML blocks are illustrative snippets rather than complete policy manifests. A future improvement would be to add full `apiVersion`, `kind`, `metadata`, `spec.selector`, and `types` context around each snippet, but the fields shown are valid for Calico `projectcalico.org/v3` policy rules.
