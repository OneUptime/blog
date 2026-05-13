# Validation Summary: How to Optimize IP-in-IP in Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico) CNI
- Kubernetes
- IP-in-IP (IPIP) encapsulation (IP protocol 4)
- VXLAN (for comparison)
- calicoctl
- kubectl
- Linux `ip` and `tcpdump` utilities

## Sources Consulted
- Calico documentation: Configure overlay networking / IPIP & VXLAN modes (https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip)
- Calico IPPool API reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico MTU configuration: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- RFC 2003 (IP Encapsulation within IP) — confirms 20-byte outer IPv4 header overhead
- IANA Protocol Numbers (IPIP = 4): https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 7348 (VXLAN) — confirms VXLAN header is 8 bytes; total encapsulation overhead for VXLAN-over-IPv4 = 14 (outer Ethernet) + 20 (outer IP) + 8 (UDP) + 8 (VXLAN) = 50 bytes
- tcpdump pcap-filter(7) — `proto 4` is valid for filtering IP protocol 4
- kubectl run / --overrides reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run

## Issues Found
- **`kubectl run` --overrides used empty `nodeName`**: The original code defined `POD1_NODE` and `POD2_NODE` variables but the two `kubectl run` commands passed `"nodeName":""` instead of referencing those variables. An empty `nodeName` fails Kubernetes API validation (the field, if specified, must be a valid node name), and the pods would not be placed on the intended cross-subnet nodes — defeating the purpose of the test. Fixed by substituting the variables: `"nodeName":"${POD1_NODE}"` and `"nodeName":"${POD2_NODE}"`.

## Review Notes
- The 20-byte IPIP overhead and 50-byte VXLAN overhead claims are accurate and match Calico's MTU guidance.
- The IPPool manifest is valid against the current `projectcalico.org/v3` `IPPool` schema (`ipipMode`, `vxlanMode`, `natOutgoing`, `cidr` are all current field names).
- `tunl0` is the correct interface name created by the kernel `ipip` module when Calico's IPIP mode is active.
- The mermaid diagram uses `\n` for line breaks inside node labels; current mermaid renderers support this, though `<br/>` is more portable across older versions.
- IP-in-IP is IPv4-only (RFC 2003); for IPv6 pod networks Calico uses VXLAN or native routing — worth noting in a future revision if IPv6 readers might assume IPIP applies to them.
