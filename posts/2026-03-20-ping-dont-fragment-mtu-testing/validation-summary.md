# Validation Summary: How to Use Ping with the Don't Fragment Flag for MTU Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `ping` (`iputils`)
- IPv4 MTU and Path MTU Discovery (PMTUD)
- ICMP fragmentation-needed behavior
- `iptables` `TCPMSS`
- `ip link` MTU configuration
- PPPoE, GRE, VXLAN, and WireGuard MTU sizing

## Sources Consulted
- `ping` on the review host: `ping -h`; `ping -c 1 -M do -s 1472 127.0.0.1`
- RFC 1191, *Path MTU Discovery*: https://www.rfc-editor.org/rfc/rfc1191
- RFC 2923, *TCP Problems with Path MTU Discovery*: https://www.rfc-editor.org/rfc/rfc2923
- RFC 791, *Internet Protocol*: https://www.rfc-editor.org/rfc/rfc791
- RFC 2784, *Generic Routing Encapsulation (GRE)*: https://www.rfc-editor.org/rfc/rfc2784
- RFC 2516, *A Method for Transmitting PPP Over Ethernet (PPPoE)*: https://www.rfc-editor.org/rfc/rfc2516
- RFC 7348, *Virtual eXtensible Local Area Network (VXLAN)*: https://www.rfc-editor.org/rfc/rfc7348
- Netfilter `TCPMSS` target documentation: https://git.netfilter.org/iptables/plain/extensions/libxt_TCPMSS.man
- `iptables -j TCPMSS -h` and `ip link help` on the review host

## Issues Found
- The post used ICMP "too big" wording in IPv4 sections. I changed that to ICMP "fragmentation needed" to match RFC 1191's IPv4 PMTUD behavior.
- The MTU black-hole explanation said this happens "as in TCP SYN". I corrected that because the RFC 2923 failure mode is about larger DF-marked packets sent after the handshake, not the SYN itself.
- The successful `ping -M do -s 1472` example showed `64 bytes from ...`, which is incorrect for that payload size. I corrected it to `1480 bytes from ...` based on current `iputils ping` behavior and the documented `-s` data-byte semantics.
- The PMTU binary-search script mixed payload sizes with total packet sizes. I corrected the search bounds to payload values, forced IPv4 in the test command so the 28-byte header math remains valid, and clarified that the search range is capped at 1500-byte IPv4 packets.
- The hostname-based `ping` examples did not force IPv4 even though the post is explicitly about IPv4 DF behavior and uses IPv4-specific size calculations. I added `-4` to those examples.
- The MSS workaround used a fixed `--set-mss 1300` while claiming to match the discovered MTU. I replaced it with the official `TCPMSS --clamp-mss-to-pmtu` example from the netfilter documentation.
- The `ip link set eth0 mtu 1400` example was described as setting path MTU discovery on the interface. I corrected the wording to what the command actually does: lower the interface MTU.
- The quick-reference table labeled 576 bytes as "Minimum MTU (RFC 791)", which is not what RFC 791 says. I corrected it to the IPv4 host receive requirement.
- The GRE quick-reference row was off by 4 bytes. I corrected it to `1476` total bytes and `1448` payload bytes for GRE over IPv4 using the RFC 2784 header size.

## Review Notes
- The remaining PPPoE, VXLAN, and WireGuard figures are common values for 1500-byte Ethernet underlays, but real tunnel MTUs can vary with IPv4 vs IPv6 transport, optional encapsulation fields, and additional link-layer overhead.
