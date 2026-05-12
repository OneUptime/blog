# Validation Summary: How to Secure IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (kubectl, calicoctl)
- IP-in-IP (IPIP) encapsulation, IP protocol 4
- VXLAN (for comparison)
- Linux networking utilities (ip, tcpdump)
- Mermaid (diagram)

## Sources Consulted
- Calico IPPool reference (apiVersion `projectcalico.org/v3`, fields `ipipMode`, `vxlanMode`, `natOutgoing`, `cidr`): https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking / IPIP documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU configuration (host MTU − 20 for IPIP): https://docs.tigera.io/calico/latest/networking/configuring/mtu
- IANA IP protocol numbers (IPIP = protocol 4): https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 2003 — IP Encapsulation within IP (IPIP)
- RFC 7348 — VXLAN (50-byte overhead: 20 IP + 8 UDP + 8 VXLAN + 14 inner Ethernet)
- Linux `tunl0` interface (created by `ipip` kernel module): kernel networking documentation
- tcpdump pcap-filter(7) man page for `proto`/`ip proto` filter syntax
- kubectl run / pod-overrides documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run

## Issues Found
No technical issues found.

All technical claims and code snippets were verified against the sources above:
- IP-in-IP uses IP protocol number 4 — correct (IANA, RFC 2003).
- 20 bytes of outer IP header overhead — correct.
- VXLAN total overhead of 50 bytes — correct (matches Calico docs and RFC 7348).
- Three IPIP modes (`Always`, `CrossSubnet`, `Never`) — correct per Calico IPPool reference.
- IPPool YAML structure (apiVersion, kind, spec fields) is valid for the v3 API.
- `tunl0` is the correct Linux IPIP tunnel interface name.
- MTU recommendation (host MTU − 20 bytes for IPIP) matches Calico's MTU guidance.

## Review Notes
- The post's description mentions WireGuard encryption and host endpoint policies for restricting protocol 4 traffic, but the body does not include corresponding sections. The existing content is technically correct, so no changes were made (per the instruction not to add new sections), but a future revision could expand on the security topics promised in the description.
- The `tcpdump -i eth0 -n 'proto 4' -c 10` filter is accepted by modern tcpdump (the `proto` qualifier with a numeric argument resolves to the IP protocol field). The more explicit `ip proto 4` form is also commonly used and would be slightly clearer, but the current form is not incorrect.
- In the "Test Cross-Subnet Connectivity" section, `POD1_NODE`/`POD2_NODE` shell variables are defined but not referenced in the subsequent `kubectl run` commands (the `--overrides` JSON uses an empty `nodeName`). This is illustrative example code rather than a technical error, but readers wanting to actually pin pods to specific nodes would need to substitute the variables into the overrides JSON.
- The Mermaid diagram uses `\n` for line breaks within node labels; current Mermaid renderers accept this, though `<br/>` is also supported and is sometimes preferred for portability.
