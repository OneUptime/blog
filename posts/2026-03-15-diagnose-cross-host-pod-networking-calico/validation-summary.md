# Validation Summary: How to Diagnose Cross-Host Pod Networking Failures with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP and BIRD
- IP-in-IP encapsulation
- VXLAN encapsulation
- Linux routing, iptables, MTU, and tcpdump
- Calico network policy and host endpoints

## Sources Consulted
- Calico `calicoctl node status` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico `calico/node` configuration and readiness documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348

## Issues Found
- The post originally implied that Calico always uses BGP to distribute pod routes. Calico can run VXLAN-only networking without BGP, so I scoped that claim to BGP-backed Calico deployments and noted that VXLAN-only installations should skip BGP-specific checks.
- The BGP status section originally said Calico relies on BGP without qualification. I updated it to clarify that this applies to BGP-backed deployments and that VXLAN-only deployments should focus on tunnel, route, firewall, and policy diagnostics.
- The BIRD log and health-check commands were presented as universally applicable. I updated the comments to clarify that BIRD checks apply when BGP is enabled, and added a namespace caveat because some manifest-based Calico installations use `kube-system` instead of `calico-system`.

## Review Notes
The commands and resource names are otherwise consistent with current Calico and Kubernetes documentation. `calicoctl get` supports `wide`, `yaml`, and `custom-columns=...` output; `calicoctl node status` is the documented command for BGP peering status; IPPool fields such as `ipipMode`, `vxlanMode`, and `natOutgoing` match the current resource schema; and the MTU overhead values for IPv4 IP-in-IP and IPv4 VXLAN match Calico MTU guidance.
