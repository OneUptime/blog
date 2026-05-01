# Validation Summary: How to Diagnose Packet Loss on an IPv4 Network

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPv4 networking
- ICMP and `ping`
- `mtr`
- Linux `ip`, `ss`, `nstat`, and `sysctl`
- `ethtool`
- `tcpdump`
- TShark / Wireshark display filters

## Sources Consulted
- `ping(8)` iputils man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `mtr(8)` Debian man page: https://manpages.debian.org/bookworm/mtr/mtr.8.en.html
- Linux kernel interface statistics documentation: https://docs.kernel.org/networking/statistics.html
- `ethtool(8)` man page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- Cisco duplex/autonegotiation compatibility guidance: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/17053-46.html
- `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html
- `nstat(8)` man page: https://manpages.ubuntu.com/manpages/questing/man8/nstat.8.html
- `pcap-filter(7)` man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tshark(1)` man page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- Linode MTR interpretation guidance: https://www.linode.com/docs/guides/diagnosing-network-issues-with-mtr/
- Local command help and output checks: `ping -h`, `mtr --help`, `tcpdump --help`, `ss --help`, `sysctl --help`, `nstat --help`, `ip -s -s link show`

## Issues Found
- The original `tcpdump` example filtered SYN and RST packets, not retransmissions. I replaced it with a packet capture command and a `tshark` retransmission analysis command that actually matches `tcp.analysis.retransmission`.
- The original `ss -s | grep "buf"` example did not correspond to the buffer-drop counters it claimed to show. I replaced it with `nstat -az UdpInErrors UdpRcvbufErrors` for kernel counters and `ss -ulm` for per-socket memory/drop inspection.
- The `ip -s link show` sample output and interpretations were too generic and partly mismatched current Linux output. I updated the command to `ip -s -s link show`, corrected the sample fields, and narrowed the counter interpretations to documented meanings.
- The ping and MTR interpretation text overstated causality. I corrected it so isolated loss to a gateway or intermediate hop is treated as possible ICMP rate-limiting/deprioritization rather than definite forwarding loss.
- The duplex troubleshooting section only grepped for duplex, and the fixed-speed example omitted `autoneg off`. I updated the inspection command to include speed and autonegotiation state and corrected the forced-setting syntax.
- The diagnosis table treated gateway-only loss as a broken default route and single-target loss as necessarily a remote-host problem. I changed both to more accurate path/ICMP-aware interpretations.

## Review Notes
- `ethtool -S` statistics are driver-specific, so exact counter names vary by NIC and driver.
- `tshark` is commonly packaged separately from `tcpdump` on minimal Linux installations.
- `ping` and default `mtr` probes test ICMP reachability; application-specific packet loss may still require protocol-specific captures or TCP/UDP probe modes.
