# Validation Summary: How to Optimize VXLAN in Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico v3 API)
- Kubernetes
- VXLAN (Virtual Extensible LAN) encapsulation
- Linux networking (bridge fdb, ip link, arp)
- kubectl / calicoctl
- tcpdump
- Mermaid diagrams

## Sources Consulted
- Calico VXLAN/IPIP configuration docs: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico MTU configuration docs: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico data path architecture: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Project Calico Felix source (felix/dataplane/linux/vxlan_mgr.go)
- RFC 7348 (VXLAN specification) and IANA port assignment (UDP 4789)

## Issues Found
No technical issues found.

Verified items:
- VXLAN encapsulates layer-2 Ethernet frames in UDP packets (RFC 7348) — correct.
- UDP port 4789 is the IANA-assigned VXLAN port and Calico's default — correct.
- `vxlanMode: Always`, `ipipMode: Never`, and `natOutgoing` are valid Calico v3 IPPool fields — confirmed against the IPPool reference.
- `vxlan.calico` is the standard interface name Calico creates when VXLAN is enabled — correct.
- MTU overhead of 50 bytes for IPv4 VXLAN — confirmed against Calico's MTU configuration docs (IPv4 VXLAN uses a 50-byte header).
- `bridge fdb show dev vxlan.calico` is a valid command for inspecting VXLAN FDB entries.
- `kubectl run` with `--overrides` is a supported flag for merging spec fragments such as `nodeName`.
- `tcpdump -i eth0 -n 'udp port 4789' -c 10` is a valid BPF filter for catching VXLAN encapsulated traffic.

## Review Notes
- The post's frontmatter description mentions "tuning MTU, hardware offload, and CrossSubnet mode" but the body focuses on configuration, verification, and connectivity testing using `vxlanMode: Always`. This is a scope/marketing-copy mismatch, not a technical error, so it was left untouched per the instructions to only fix technical errors.
- The Mermaid diagram uses `\n` inside node labels for line breaks. Mermaid renders this as a newline in most current versions, though `<br/>` is the more portable convention. Behavior is not strictly wrong.
- The `arp -n` command works but is part of the older net-tools package; modern systems typically prefer `ip neigh`. Both are acceptable for the purpose shown.
- For IPv6 VXLAN deployments, the MTU overhead is 70 bytes rather than 50 — worth keeping in mind for dual-stack clusters, though the post explicitly uses an IPv4 example.
