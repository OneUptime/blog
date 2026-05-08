# Validation Summary: How to Use the Calico GlobalNetworkPolicy Resource in Real Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes NetworkPolicy
- calicoctl
- Kubernetes kubectl
- Calico policy selectors, rule actions, and ordering

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The introduction stated that GlobalNetworkPolicy resources evaluate before Kubernetes NetworkPolicy resources unless the order field is set. Calico documentation says Calico policy can be ordered relative to Kubernetes NetworkPolicy using ordering, so the wording was corrected to avoid implying a fixed default precedence.
- The DNS egress section said DNS would fail after applying the earlier default-deny policy, but the earlier example was ingress-only. The text was corrected to refer specifically to applying a default-deny egress posture.
- The troubleshooting section suggested checking Felix logs for denied packets. Calico deny rules do not log packet matches by default; Calico requires a `Log` action or related logging configuration. The advice was updated to add a temporary `Log` rule and check kernel logs for Calico policy log entries.

## Review Notes
- The YAML examples use the current `projectcalico.org/v3` GlobalNetworkPolicy API and valid fields including `order`, `selector`, `types`, `ingress`, `egress`, `action`, `protocol`, `source`, `destination`, `ports`, and `nets`.
- The `calicoctl apply -f` and `calicoctl get globalnetworkpolicy -o wide/yaml` commands match the current calicoctl reference.
- The DNS allow policy intentionally permits TCP and UDP port 53 to any destination. This can work for restoring DNS, but a tighter production policy would usually restrict the destination to kube-dns/CoreDNS or approved DNS endpoints.
