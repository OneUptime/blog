# Validation Summary: How to Configure VXLAN with an IPv6 Underlay

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (RFC 7348)
- IPv6
- Linux `ip link` / `iproute2`
- Linux bridge FDB (`bridge fdb`)
- systemd-networkd (`.netdev`, `.network`)
- tcpdump, tracepath6
- IPv6 multicast scopes

## Sources Consulted
- RFC 7348 (Virtual eXtensible Local Area Network)
- RFC 4291 (IPv6 Addressing Architecture, multicast scopes)
- Linux kernel source: `include/net/vxlan.h` (`vxlan_headroom()`) — https://raw.githubusercontent.com/torvalds/linux/master/include/net/vxlan.h
- Vincent Bernat's VXLAN guide — https://vincent.bernat.ch/en/blog/2017-vxlan-linux
- bridge(8) man page — https://man7.org/linux/man-pages/man8/bridge.8.html
- systemd.netdev(5) — https://manpages.debian.org/bookworm/systemd/systemd.netdev.5.en.html

## Issues Found

1. **Incorrect VXLAN-over-IPv6 overhead (56 bytes → 70 bytes).** The post claimed the tunnel overhead was 56 bytes (40 IPv6 + 8 UDP + 8 VXLAN). The Linux kernel's `vxlan_headroom()` helper (for non-GPE VXLAN) adds the inner Ethernet header (`ETH_HLEN` = 14 bytes) to the encapsulation overhead, giving 70 bytes total. Updated the body text to "70 bytes of tunnel overhead: 40 (IPv6) + 8 (UDP) + 8 (VXLAN) + 14 (inner Ethernet)" and the inline tcpdump-section comment to 70.
2. **Incorrect MTU examples (1444/8944 → 1430/8930).** Because overhead is 70 bytes (not 56), `ip link set vxlan10 mtu …` values derived from a 1500/9000 physical MTU should be 1430 and 8930, respectively. Also corrected the VM vNIC example (1444 → 1430) and the conclusion line (“minus 56 bytes” → “minus 70 bytes”).
3. **Bogus `via vxlan10` on bridge FDB entry.** `via DEVICE` in `bridge fdb` specifies the outgoing underlay interface for the VXLAN driver to reach the remote VTEP. Pointing `via` at the VXLAN device itself is nonsensical and not the standard pattern. Removed the redundant `via vxlan10` so the command is `bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 2001:db8:2::1`.

## Review Notes
- The systemd-networkd `[VXLAN]` options used (`VNI`, `Local`, `DestinationPort`, `MacLearning`) are all valid per `systemd.netdev(5)`, and `Local=` accepts IPv6 addresses.
- `ff05::/16` is correctly described as site-local multicast scope per RFC 4291; `ff05::100` is a reasonable choice for VXLAN BUM.
- `nolearning`, `dstport 4789`, and `local <IPv6>` on `ip link add … type vxlan` are all accepted by current iproute2 / kernel VXLAN driver.
- The post notes that BGP EVPN is the recommended production alternative to static FDB — good caveat, nothing further to correct.
- Minor stylistic observation (not fixed per reviewer scope): the MTU section mixes IP-layer MTU with L2 MTU semantics; for a Linux VXLAN netdev the MTU represents the IP payload size carried by the inner Ethernet frame, which is why the inner `ETH_HLEN` must be subtracted from the underlay MTU.
