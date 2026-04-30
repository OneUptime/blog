# Validation Summary: How to Fix TCP Checksum Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux networking
- Checksum offload
- `ethtool`
- `tcpdump`
- Wireshark
- GRE tunnels
- Virtual NIC offload

## Sources Consulted
- Linux kernel documentation, "Checksum Offloads": https://www.kernel.org/doc/html/v6.4/networking/checksum-offloads.html
- Linux kernel documentation, "Interface statistics": https://docs.kernel.org/5.10/networking/statistics.html
- Wireshark User's Guide, "Checksums": https://www.wireshark.org/docs/wsug_html_chunked/ChAdvChecksums.html
- Wireshark Display Filter Reference, TCP fields: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark 2.2.0 release notes on checksum filter changes: https://www.wireshark.org/docs/relnotes/wireshark-2.2.0
- `ethtool(8)` manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- RFC 793, Transmission Control Protocol: https://datatracker.ietf.org/doc/html/rfc793

## Issues Found
- The post stated that TX checksum offload leaves the checksum as `0`. I changed this to "empty or partially computed" because current Linux/Wireshark documentation notes that offloaded packets may contain zero, garbage, or a partial pseudo-header checksum before the NIC completes transmission.
- The post described the capture artifact without limiting it to locally generated outbound traffic. I corrected that scope in the introduction and the checksum-offload diagram because received packets should already have passed through network hardware.
- The Wireshark filter used the legacy `tcp.checksum_bad` field. I updated it to `tcp.checksum.status == 0`, which matches current Wireshark releases after the checksum field migration.
- The RX offload explanation implied a simple NIC-only behavior. I adjusted it to "NIC/driver can validate incoming checksums" to better match how Linux exposes the feature.
- The "real checksum errors" section listed cable faults as a direct cause and used a GRE example while mentioning VXLAN. I narrowed the hardware wording to NIC/DMA path/memory, changed the GRE example to GRE only, and updated the command to `ip -d link show type gre` so the checksum flag is visible in detailed tunnel output.

## Review Notes
- The Linux commands shown in the post are current and valid for modern `ethtool`, `iproute2`, and `tcpdump` userspace tools.
- `memtester` is an optional memory-test utility and may need to be installed separately on the target system.
- Recent Wireshark releases often disable checksum validation by default and can identify partial TCP/UDP checksums from offload more accurately than older versions.
