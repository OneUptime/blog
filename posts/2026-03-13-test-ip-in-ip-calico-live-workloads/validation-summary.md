# Validation Summary: How to Test IP-in-IP in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Calico (IP-in-IP / IPIP encapsulation)
- Kubernetes (kubectl, pod scheduling)
- calicoctl CLI
- Linux networking (`tunl0` tunnel interface, `ip` command, `tcpdump`)
- VXLAN (referenced for comparison)
- IP protocol 4 (IANA-assigned for IP-in-IP, RFC 2003)

## Sources Consulted
- Calico IP Pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPIP and VXLAN overlay docs: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- RFC 2003 (IP Encapsulation within IP): https://datatracker.ietf.org/doc/html/rfc2003
- IANA Protocol Numbers (protocol 4 = IPv4 / IP-in-IP)
- Linux kernel `ipip` module documentation (tunl0 interface naming)
- tcpdump pcap-filter(7) manpage (`proto` / `ip proto` filter)
- kubectl reference: `kubectl run --overrides` (still supported in current kubectl)
- VXLAN RFC 7348 (header sizing: 50-byte total L2 overhead)

## Issues Found
- **kubectl run commands ignored the node variables.** The "Test Cross-Subnet Connectivity" section defined `POD1_NODE` and `POD2_NODE` but the subsequent `kubectl run ... --overrides=...` commands set `nodeName` to an empty string, which does not pin the pod to a specific node (and so would not actually exercise cross-subnet traffic, defeating the section's stated purpose). Fixed by substituting `${POD1_NODE}` and `${POD2_NODE}` into the `nodeName` field of the overrides JSON.

## Review Notes
- The 20-byte IP-in-IP overhead and 50-byte VXLAN overhead figures are correct (VXLAN: 14 outer Ethernet + 20 outer IP + 8 UDP + 8 VXLAN = 50 bytes).
- IPPool `apiVersion: projectcalico.org/v3` with `ipipMode`, `vxlanMode`, `cidr`, and `natOutgoing` fields are accurate for current Calico (v3.x) CRDs. The mode values `Always`, `CrossSubnet`, `Never` are correct.
- `tunl0` is the correct default Linux IPIP tunnel interface name and is what Calico uses for IP-in-IP traffic.
- `tcpdump -i eth0 -n 'proto 4'` works in practice; the more explicit form `'ip proto 4'` is documented in pcap-filter(7), but the bare form is widely accepted, so it was left as-is.
- The MTU guidance (subtract 20 bytes from host MTU for IPIP overhead) is correct.
- `kubectl run --overrides` is still supported in current kubectl, though future readers may prefer manifest-based pod creation for clarity.
