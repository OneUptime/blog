# Validation Summary: How to Configure External IP Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `NetworkPolicy` and `GlobalNetworkPolicy`
- `calicoctl`
- `kubectl`
- YAML

## Sources Consulted
- Calico documentation: Use external IPs or networks rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The original policy example did not actually match external IPs or CIDRs. I changed the example to use `source.nets` for ingress and `destination.nets` for egress, which matches Calico's documented external IP/network policy pattern.
- The original egress rule constrained destination ports without an explicit protocol. I added `protocol: TCP` to the port-constrained ingress and egress rules to match Calico's documented examples for TCP port rules.
- The original test command targeted an in-cluster service, not an external destination. I changed it to use an external hostname example so the test aligns with the external egress policy being demonstrated.
- The introductory description implied a distinct "External IP" policy feature. I clarified that Calico supports external IP and CIDR matching through `NetworkPolicy` and `GlobalNetworkPolicy` rules.

## Review Notes
The example uses documentation/test CIDR ranges from RFC 5737 style examples. In a real cluster, readers must replace those CIDRs and the example hostname with the actual external IP ranges and endpoints they intend to allow.
