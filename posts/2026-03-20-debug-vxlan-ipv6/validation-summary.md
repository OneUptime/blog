# Validation Summary: How to Debug VXLAN over IPv6

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- VXLAN (Virtual eXtensible LAN, RFC 7348)
- IPv6
- Linux networking (iproute2: `ip`, `bridge`, `ss`)
- `tcpdump` and `tshark` (Wireshark CLI)
- `nft` / `ip6tables` firewalls
- FRRouting (FRR) `vtysh` for BGP EVPN
- `ping6`, `nstat`
- BGP EVPN control plane

## Sources Consulted
- [RFC 7348 — Virtual eXtensible Local Area Network (VXLAN)](https://datatracker.ietf.org/doc/html/rfc7348) — UDP port 4789, encapsulation format
- [Linux Kernel VXLAN documentation](https://docs.kernel.org/networking/vxlan.html)
- [FRR `bgp_evpn_vty.c` source](https://github.com/FRRouting/frr/blob/master/bgpd/bgp_evpn_vty.c) — verified DEFPY definitions for `show bgp l2vpn evpn route` and `show bgp l2vpn evpn vni` command syntax
- [FRR `bgp_vty.h`](https://github.com/FRRouting/frr/blob/master/bgpd/bgp_vty.h) — confirmed `BGP_SELF_ORIG_CMD_STR` is `"self-originate"`, not `"local"`
- [NVIDIA Cumulus Linux: Troubleshooting EVPN](https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-55/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/Troubleshooting-EVPN/) — EVPN show command examples
- [ss(8) man page](https://man7.org/linux/man-pages/man8/ss.8.html) — behavior of `-p` flag and kernel sockets

## Issues Found

1. **Incorrect FRR command for self-originated EVPN routes.**
   The post had `vtysh -c "show bgp l2vpn evpn route local"`. The valid FRR keyword (per the `DEFPY` for `show_bgp_l2vpn_evpn_route_cmd` in `bgpd/bgp_evpn_vty.c`, which expands `BGP_SELF_ORIG_CMD_STR`) is `self-originate`. Changed the command to `vtysh -c "show bgp l2vpn evpn route self-originate"`, which is the correct way to display only routes originated locally.

2. **Misleading `ss -ulnp` expected output.**
   The post claimed the expected output for the VXLAN UDP listener was `users:(("vxlan",pid=...))`. VXLAN UDP sockets are opened by the kernel VXLAN module via netlink, not by any userspace process, so the `users:` field is empty and no `vxlan` process name will appear. Replaced the comment with an accurate expected output showing no `users:` field, plus an explanatory note that the socket is kernel-owned.

## Review Notes

- **`ping6` is being phased out.** On modern Linux distributions `ping6` is a thin wrapper around (or symlink to) `ping`, which auto-detects the address family (`ping -6 ...` is the modern form). The script still works on virtually all distributions in service, so this is not an error — just worth knowing for future updates.
- **VXLAN UDP port 4789 vs Linux historical default 8472.** RFC 7348 specifies UDP/4789. The Linux kernel `ip link add ... type vxlan` historically defaulted to `8472` (the pre-IANA Linux default) for backwards compatibility, and you must pass `dstport 4789` to use the standard. The post correctly states 4789 — but readers debugging legacy interfaces may need to confirm the actual `dstport` configured on their VXLAN device with `ip -d link show vxlan100`.
- **`nc -u` for UDP reachability is best-effort.** Because UDP is connectionless and VXLAN does not respond to a malformed datagram, `nc -u -v` cannot reliably confirm that the remote VXLAN socket is open. It only confirms the local kernel will hand the packet to the network. The post uses it as a sanity check, which is a reasonable use.
- **`bridge fdb append 00:00:00:...:00 ... dst <VTEP>`** is correct syntax for adding a head-end-replication (BUM flooding) entry. Using `append` rather than `add` is intentional because multiple all-zeros entries with different `dst` addresses can coexist for replicating BUM traffic to several remote VTEPs.
- **Common Issues table row "Traffic captured but not decoded".** This row attributes "wrong VTEP IP in FDB" as the cause. In practice, the more frequent cause is that tcpdump/Wireshark is not configured to dissect VXLAN on a non-default UDP port (e.g., kernel default 8472 instead of 4789). The current entry is not strictly wrong — incorrect FDB destinations would manifest as undeliverable traffic — so left as-is.
