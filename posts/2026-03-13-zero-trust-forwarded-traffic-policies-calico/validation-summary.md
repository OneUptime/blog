# Validation Summary: Zero Trust Forwarded Traffic with Calico Host Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- Linux iptables dataplane

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico applyOnForward documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico host endpoint overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico forwarded host traffic guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration and health check documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The policy example matched destination ports without explicitly setting `protocol: TCP`. Calico policy examples and port-based rules are protocol-specific, so the ingress rule now declares TCP for SSH, HTTPS, and Kubernetes API traffic.
- The example egress rule allowed all egress traffic, which conflicted with the post's zero-trust framing. It now allows only TCP egress to the example internal CIDR on HTTPS and Kubernetes API ports.
- The post described the YAML as production-ready. Because the snippet uses placeholder node names, interface names, and CIDRs that must be adapted to each environment, this was changed to "example YAML configurations."
- The iptables inspection command only listed the default filter table and could miss Calico chains in other iptables tables. It now uses `iptables-save | grep CALICO` and labels the command as specific to the iptables dataplane.
- The Felix health check command now uses the documented `/bin/calico-node` path inside the calico-node container.

## Review Notes
The HostEndpoint and GlobalNetworkPolicy API versions and fields are current for Calico v3.x. `applyOnForward` is correctly used for forwarded traffic, and the post correctly warns that host endpoint policy can lock out management access if SSH or other administrative paths are not allowed. Operators using eBPF or nftables dataplanes should use dataplane-appropriate inspection tools instead of iptables.
