# Validation Summary: How to Secure VXLAN in Calico

## Status
validated

## Post Type
Tutorial / Guide (Calico VXLAN configuration and verification)

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes (kubectl, calicoctl)
- VXLAN (Virtual Extensible LAN, RFC 7348)
- VTEP (VXLAN Tunnel Endpoints)
- Linux networking (bridge, ip, arp, tcpdump)
- Mermaid (architecture diagram)

## Sources Consulted
- [Calico IPPool reference](https://docs.tigera.io/calico/latest/reference/resources/ippool)
- [Calico VXLAN / IP-in-IP configuration](https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip)
- [Calico Node resource reference](https://docs.tigera.io/calico/latest/reference/resources/node)
- [projectcalico/calico source on GitHub](https://github.com/projectcalico/calico/blob/master/libcalico-go/lib/backend/k8s/resources/node.go) (for exact annotation key spelling)
- [RFC 7348 — VXLAN](https://datatracker.ietf.org/doc/html/rfc7348)
- [kubectl run reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)

## Issues Found

1. **Incorrect case in VTEP annotation grep pattern.** The post used `grep -A5 vxlanTunnelMACAddr`, but the actual annotation Calico sets on Kubernetes nodes is `projectcalico.org/VXLANTunnelMACAddr` (capital VXLAN, capital T/M/A/A), per the constant `nodeBgpVXLANTunnelMACAddrAnnotation` in `libcalico-go/lib/backend/k8s/resources/node.go`. Because `grep` is case-sensitive by default, the original command would silently match nothing. Changed the pattern to `VXLANTunnelMACAddr` so the example actually returns the VTEP MAC line.

## Review Notes

- The post title is "How to Secure VXLAN in Calico" and the front-matter description mentions WireGuard encryption and network policies for VTEP access, but the body of the post only covers basic VXLAN configuration and verification — it does not actually contain WireGuard or NetworkPolicy content. This is an editorial/scoping mismatch rather than a technical inaccuracy, so per the review rules ("do not add new sections, restructure the post, or make stylistic changes") no content was added. Worth flagging for the author to either expand the post to match the title/description or to retitle it.
- Standard VXLAN UDP port 4789 (IANA / RFC 7348), Calico VXLAN interface name `vxlan.calico`, and the 50-byte IPv4 VXLAN MTU overhead (14 Ethernet + 20 IPv4 + 8 UDP + 8 VXLAN) are all correct.
- The IPPool spec fields used (`cidr`, `vxlanMode: Always`, `ipipMode: Never`, `natOutgoing: true`) are all valid for `projectcalico.org/v3` IPPool. Note that `vxlanMode` and `ipipMode` are mutually exclusive — the example sets `ipipMode: Never`, which is correct usage.
- The example CIDR `10.244.0.0/16` is the Flannel default, not Calico's default of `192.168.0.0/16`; either is valid and configurable, so left as-is.
- `kubectl run` with `--overrides` and `-- sleep 3600` works on current kubectl versions (since the deprecated generators were removed in Kubernetes 1.18+, `kubectl run` always creates a Pod), so `--restart=Never` is not required.
- The Mermaid diagram uses `\n` inside node labels for a line break. Some Mermaid renderers require `<br/>` instead; behavior depends on the renderer in use on the blog. Not changed.
