# Validation Summary: How to Fix Pods That Cannot Ping Each Other with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico IPPool and IP-in-IP encapsulation
- Calico BGP routing and BIRD
- Host firewall rules for IPIP and VXLAN
- kubectl and calicoctl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico ICMP/ping policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The Kubernetes NetworkPolicy example included a `protocol: SCTP` port entry with a comment implying it helped with ICMP. Kubernetes NetworkPolicy only defines filtering for TCP, UDP, and optionally SCTP; behavior for ICMP is plugin-specific. Removed the SCTP entry and clarified that Kubernetes NetworkPolicy cannot match ICMP specifically.
- The post implied Kubernetes NetworkPolicy could be used as a targeted ICMP allow. Updated the explanation to say that Kubernetes NetworkPolicy can allow all traffic for selected pods, while Calico NetworkPolicy should be used for ICMP-only matching.
- The Calico node restart commands hard-coded `kube-system`. Current Calico operator-based documentation uses `calico-system`, while manifest-based installs use `kube-system`. Updated the command to use a `CALICO_NAMESPACE` variable with a note for manifest-based installs.

## Review Notes
- The IPPool `ipipMode: CrossSubnet` value, `calicoctl patch ippool` syntax, BGP route verification with `ip route`/`grep bird`, and firewall protocol/port details for IPIP protocol 4 and VXLAN UDP 4789 were consistent with Calico documentation.
- The host firewall commands are iptables-specific and may need equivalent rules for nftables, firewalld, cloud security groups, or Calico HostEndpoint policy in some environments.
