# Validation Summary: How to Troubleshoot Multicast in Virtualized Environments

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- VMware vSphere / vSwitch / dvSwitch
- KVM / libvirt / Linux bridges (virbr0, br0)
- Docker default bridge (docker0)
- Linux bridge multicast snooping / querier
- iptables FORWARD chain rules
- tcpdump
- VXLAN / Flannel / Calico overlay networks
- IP multicast (IPv4 class D: 224.0.0.0/4, administratively scoped 239.0.0.0/8)

## Sources Consulted
- Linux kernel bridge documentation (networking/bridge.rst), specifically `multicast_snooping` and `multicast_querier` under `/sys/class/net/<bridge>/bridge/` — https://www.kernel.org/doc/Documentation/networking/bridge.txt
- VMware vSphere Networking Guide — Security policies (Promiscuous Mode, MAC Address Changes, Forged Transmits) and multicast filtering modes ("Basic" vs "IGMP/MLD snooping")
- IANA IPv4 Multicast Address Space Registry (224.0.0.0/4) and RFC 2365 (administratively scoped 239.0.0.0/8)
- iptables man page (`-I`, `-L`, `-d`, `-j`)
- tcpdump man page / pcap-filter(7) — `dst net` primitive
- iproute2 `ip-link(8)` — `-d` flag for VXLAN interface details
- Flannel documentation — default VXLAN interface name `flannel.1`
- Docker networking documentation — default bridge (docker0) behavior and iptables integration

## Issues Found
- **Inaccurate claim about VM NIC multicast reception under the VMware section.** The original text stated: "Without promiscuous mode, a VM NIC only receives unicast frames addressed to it, missing multicast entirely." This is technically wrong — a VM NIC without promiscuous mode still receives broadcast frames and multicast frames for groups the guest has joined (when the vNIC's multicast MAC filters are programmed via IGMP). Rewrote the sentence to clarify that MAC-based filtering does forward subscribed multicast, and that promiscuous mode specifically helps for applications that don't use IGMP correctly or where MAC-based filtering breaks down.

## Review Notes
- The VMware section's opening statement ("VMware's standard vSwitch and distributed vSwitch block multicast by default unless the port group allows it") is a simplification. vSwitches do forward multicast that VMs join via IGMP (via Basic or IGMP/MLD snooping filtering modes). However, enabling promiscuous mode is a widely recommended workaround for multicast-heavy clustering workloads, so the practical advice is valid; left unchanged.
- The iptables rules `-d 224.0.0.0/4` and `-d 239.0.0.0/8` are technically redundant (239.0.0.0/8 is a subset of 224.0.0.0/4), but not incorrect. Left unchanged as the author may be emphasizing administratively scoped multicast explicitly.
- `/sys/class/net/<bridge>/bridge/multicast_snooping` defaults to 1 on Linux bridges, and without a querier, IGMP membership times out leading to dropped multicast — the guide's advice aligns with kernel behavior.
- `flannel.1` is the correct default VXLAN interface name for Flannel's VXLAN backend.
- The multicast filter syntax `dst net 224.0.0.0/4` in tcpdump is valid pcap-filter syntax.
- No deprecation concerns; all commands and sysfs paths remain current as of the reviewed date.
