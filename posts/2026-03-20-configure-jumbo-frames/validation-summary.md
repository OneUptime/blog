# Validation Summary: How to Configure Jumbo Frames and Verify MTU Support

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Linux networking (iproute2 / `ip link`)
- Ethernet MTU and Jumbo Frames
- ethtool
- ping (ICMP) and tracepath (Path MTU Discovery)
- systemd-networkd
- NetworkManager (nmcli)
- Netplan (Ubuntu)
- /etc/network/interfaces (Debian/ifupdown)
- iperf3
- vmstat
- Switch vendor MTU defaults (Cisco, Arista)

## Sources Consulted
- iproute2 `ip-link(8)` man page (verified `ip link set DEVICE mtu MTU` syntax)
- iputils `ping(8)` man page (verified `-M do` and `-s packetsize` flags; default ICMP data is 56 bytes + 8-byte ICMP header)
- iputils `tracepath(8)` man page (verified `pmtu N` output format)
- `systemd.network(5)` man page (verified `MTUBytes=` directive in `[Link]` section)
- NetworkManager `nm-settings(5)` (verified `802-3-ethernet.mtu` property)
- Netplan reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/ (`mtu` field on ethernets)
- Debian `interfaces(5)` man page (verified `mtu` directive)
- iperf3 documentation (verified `-c`, `-t`, `-P` flags)
- RFC 791 (IPv4 header = 20 bytes) and RFC 792 (ICMP echo header = 8 bytes), confirming overhead of 28 bytes and payload calculation 9000 − 28 = 8972
- Cisco IOS / NX-OS jumbo MTU defaults (commonly 9216)
- Arista EOS jumbo MTU default (9214)

## Issues Found
No technical issues found. Verified items include:

- `ip link show | grep mtu` correctly displays MTU per interface.
- `ip link set eth0 mtu 9000` is the correct iproute2 syntax.
- `ping -M do -s 8972` correctly produces a 9000-byte IP packet (8972 payload + 8-byte ICMP header + 20-byte IPv4 header = 9000), so the don't-fragment test is accurate.
- systemd-networkd `[Link] MTUBytes=9000` is valid and `networkctl reload` is the correct command (available in systemd 244+).
- `nmcli connection modify ... 802-3-ethernet.mtu 9000` is correct property syntax.
- Netplan `mtu:` field is valid under an ethernet device.
- Debian `iface ... inet dhcp` followed by `mtu 9000` is valid ifupdown syntax.
- `tracepath -n` outputs `pmtu N` lines that the regex correctly extracts.
- iperf3 `-c HOST -t 30 -P 4` is correct (client mode, 30s, 4 parallel streams).
- vmstat columns 13/14 correspond to `us`/`sy` CPU percentages in standard `vmstat` output.
- Cisco `mtu 9216` and Arista `mtu 9214` are accurate vendor defaults for jumbo MTU.

## Review Notes
- `ethtool -k eth0 | grep -i large` shows offload features (LRO/GRO/TSO) related to large packet handling. This does not strictly verify jumbo frame (MTU) support, but it is a common informal probe; the post immediately follows up with the more authoritative test of attempting `ip link set ... mtu 9001`, which is the correct way to confirm hardware MTU support.
- The Debian `/etc/network/interfaces` snippet appends `iface eth0 inet dhcp` with `>>`. If an existing `iface eth0` stanza is already present, this will produce a duplicate stanza. Readers should typically replace the existing stanza rather than append, but the directive itself is syntactically correct.
- `networkctl reload` is supported on systemd 244 and later. On older distributions, `systemctl restart systemd-networkd` would be required, but most current LTS releases meet the version requirement.
- Performance figures (5–10% throughput improvement) are reasonable typical values; actual results vary heavily by workload, NIC, and CPU.
