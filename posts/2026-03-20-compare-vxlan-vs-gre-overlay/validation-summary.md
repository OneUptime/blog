# Validation Summary: How to Compare VXLAN vs GRE for Overlay Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- VXLAN
- GRE
- GRETAP
- iproute2 (`ip`, `bridge`)
- Docker overlay networking
- Kubernetes CNI networking
- BGP EVPN

## Sources Consulted
- RFC 7348: VXLAN - https://www.rfc-editor.org/rfc/rfc7348.html
- RFC 2784: GRE - https://www.rfc-editor.org/rfc/rfc2784
- RFC 2890: GRE Key and Sequence extensions - https://www.rfc-editor.org/rfc/rfc2890
- Linux kernel VXLAN documentation - https://docs.kernel.org/networking/vxlan.html
- `ip-link(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-tunnel(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `bridge(8)` Linux manual page - https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux kernel Segmentation Offloads documentation - https://docs.kernel.org/networking/segmentation-offloads.html
- Docker overlay network driver documentation - https://docs.docker.com/engine/network/drivers/overlay/
- Calico overlay networking documentation - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU guidance - https://docs.tigera.io/calico/latest/networking/configuring/mtu

## Issues Found
- The overhead figures were written as unconditional values. I changed them to explicitly apply to the IPv4-underlay/minimum-header case, because VXLAN and GRE overhead changes with IPv6 and optional GRE fields.
- The GRE description was internally inconsistent: the table said GRE was only Layer 3, while later text suggested broader payload flexibility. I corrected this by distinguishing plain GRE from GRETAP on Linux.
- The VXLAN setup example never brought `vxlan0` administratively up. I added `ip link set vxlan0 up` so the example is operationally complete.
- The VXLAN flood-entry example used `permanent`, which `bridge(8)` documents as a synonym for `local`. I changed that entry to `static`, which matches a forwarding FDB entry rather than a locally terminated one.
- The container-use row overstated VXLAN as a generic "Kubernetes" choice. I narrowed it to Docker overlay and some Kubernetes CNIs, which is the technically accurate scope.
- The hardware-offload comparison overstated GRE as merely "less common". I changed it to note that GRE offload exists but depends on NIC/kernel support, which matches the Linux documentation more closely.

## Review Notes
- The post is now technically sound after the corrections above.
- The simple `ip link add` and `ip tunnel add` examples are minimal creation examples, not production-ready end-to-end configurations by themselves.
- VXLAN BUM handling can be implemented with multicast, static FDB replication, or an external control plane such as EVPN, depending on the deployment model.
