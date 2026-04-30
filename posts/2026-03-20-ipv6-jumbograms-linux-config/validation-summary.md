# Validation Summary: How to Configure IPv6 Jumbograms on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv6
- RFC 2675 jumbograms
- `iproute2` (`ip`)
- `sysctl`
- Python `subprocess`
- `iperf3`
- `systemd-networkd`
- NetworkManager

## Sources Consulted
- RFC 2675, "IPv6 Jumbograms" - https://www.rfc-editor.org/rfc/rfc2675.html
- Linux kernel IP sysctl documentation - https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Python `socket` module documentation - https://docs.python.org/3/library/socket.html
- iperf3 documentation - https://software.es.net/iperf/invoking.html
- systemd-networkd `systemd.network` documentation - https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- NetworkManager `nm-settings-nmcli` documentation - https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local Linux manual pages consulted: `ipv6(7)`, `ip-link(8)`, `ethtool(8)`

## Issues Found
- The post conflated 9,000-byte Ethernet jumbo frames with RFC 2675 IPv6 jumbograms. I corrected the introduction, MTU guidance, and conclusion to distinguish ordinary jumbo frames from true jumbograms, which require the Jumbo Payload option and a link MTU above 65,575 bytes.
- The `ethtool` commands shown for checking MTU and maximum MTU were misleading; `ethtool` does not expose MTU that way. I replaced them with `ip link show` and `ip -d link show`, which reflect the interface MTU and can show min/max MTU on supporting kernels.
- The example `sudo ip link set ib0 mtu 65520` was below the RFC 2675 threshold, so it could not demonstrate jumbogram readiness. I replaced it with a generic large-MTU example and the correct threshold explanation.
- The "kernel support" section suggested Kconfig and sysctl checks that do not correspond to a dedicated Linux jumbogram toggle. I replaced that with verifiable MTU and buffer checks that Linux actually exposes.
- The Python example did not verify jumbogram sending and relied on `socket.IPV6_HDRINCL`, which is not available in the current Python runtime on this Linux host. I replaced it with a working MTU-readiness check and corrected the minimum MTU logic from `65536` to `65576`.
- The `iperf3` example used an invalid IPv6 literal (`2001:db8::server`) and used `-l 8192` as if it mapped to jumbo-frame size. I corrected the address example and removed the misleading buffer-length flag.
- The performance section claimed a typical `10-30%` improvement without authoritative backing. I replaced that with a workload-dependent statement that remains technically accurate.

## Review Notes
- The persistent MTU configuration examples for `systemd-networkd`, NetworkManager, and `/etc/network/interfaces` were technically sound after the MTU/jumbogram distinction was clarified.
- The post now accurately reflects that large-MTU tuning alone does not prove RFC 2675 jumbogram use end to end.
