# Validation Summary: How to Monitor VXLAN in Calico

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (projectcalico.org/v3)
- Kubernetes
- VXLAN (Virtual Extensible LAN) encapsulation
- Linux networking (iproute2, `bridge` utility, `arp`, `tcpdump`)
- kubectl / calicoctl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Overlay / VXLAN configuration: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Felix VXLAN source (interface naming): https://github.com/projectcalico/calico/blob/master/felix/dataplane/linux/vxlan_mgr.go
- Linux kernel VXLAN docs: https://www.kernel.org/doc/Documentation/networking/vxlan.txt
- bridge(8) man page: https://man7.org/linux/man-pages/man8/bridge.8.html
- IANA Service Name Registry (UDP 4789 = vxlan)

## Issues Found
- **`grep` case mismatch on `vxlanTunnelMACAddr` annotation**: The "Check VTEP Table" section ran `kubectl get nodes -o yaml | grep -A5 vxlanTunnelMACAddr`. The actual annotation Felix writes onto Kubernetes Node objects is `projectcalico.org/VXLANTunnelMACAddr` (uppercase `VXLAN`). A case-sensitive grep for `vxlanTunnelMACAddr` would not match, producing no output. Fixed by changing the grep pattern to `VXLANTunnelMACAddr` so it matches the annotation key as it appears in `kubectl get nodes -o yaml`.

## Review Notes
- VXLAN port 4789 is correctly documented; this is the IANA-assigned port and Calico's default. The port is configurable via Felix `vxlanPort` if a custom value is needed.
- The 50-byte MTU overhead figure is correct for IPv4 VXLAN (14B outer Ethernet + 20B outer IPv4 + 8B outer UDP + 8B VXLAN header). For IPv6 underlay, the overhead is closer to 70 bytes — not mentioned, but the post focuses on IPv4 so this is acceptable.
- The interface name `vxlan.calico` is correct for IPv4. For IPv6, Calico creates `vxlan-v6.calico` — not relevant here.
- All IPPool spec fields used (`cidr`, `vxlanMode`, `ipipMode`, `natOutgoing`) are valid for `projectcalico.org/v3`.
- The Description in the frontmatter mentions Prometheus metrics, but the body does not actually cover Prometheus metrics. This is a content/scope mismatch rather than a technical inaccuracy and was not modified.
- `kubectl run --overrides='{"spec":{...}}'` syntax is still valid in current kubectl; `--generator` was the deprecated flag, not `--overrides`.
