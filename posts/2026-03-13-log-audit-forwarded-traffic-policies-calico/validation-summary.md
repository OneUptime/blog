# Validation Summary: How to Log and Audit Forwarded Traffic Policies for Calico Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- iptables

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico applyOnForward host endpoint documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico forwarded host traffic guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Kubernetes installation/customization documentation for calico-node liveness probes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options

## Issues Found
- The GlobalNetworkPolicy was described as logging/auditing forwarded traffic but contained only `Allow` rules. Added explicit `action: Log` ingress and egress rules because Calico logs traffic through `Log` actions, and processing continues to the following `Allow` rule after a log match.
- The ingress rule matched destination ports without specifying a protocol. Added `protocol: TCP` to the log and allow ingress rules because Calico port matches are valid for port-capable protocols and official examples specify TCP when matching ports such as SSH, HTTPS, and the Kubernetes API server.

## Review Notes
- The `applyOnForward: true` usage is correct for applying host endpoint policy to forwarded traffic. Forwarded traffic is allowed by default if no `applyOnForward` policy selects the host endpoint and direction, while local host traffic has different default-deny semantics once host endpoints exist.
- The `preDNAT: false` setting is valid and means rules are evaluated after DNAT. If this guide is expanded for NodePort or pre-DNAT auditing, the policy should use `preDNAT: true`, `applyOnForward: true`, and ingress-only rules.
- The iptables inspection command applies to the Linux iptables data plane. Calico clusters using eBPF or nftables may need different dataplane-specific inspection commands.
