# Validation Summary: How to Monitor UDP Traffic with tcpdump

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- tcpdump (packet capture utility)
- pcap-filter (BPF filter expressions)
- UDP protocol (RFC 768)
- ICMP (RFC 792 - Destination Unreachable / Port Unreachable)
- DNS / DHCP / NTP / Syslog / RTP (UDP-based protocols)
- awk (gawk) text processing
- nload, iftop (auxiliary network monitoring tools)

## Sources Consulted
- tcpdump(8) man page (verified the `-A`, `-X`, `-v`, `-q`, `-n`, `-i`, `-w`, `-r`, `-l`, `-ttt` flags and the "UDP Packets" output description)
- pcap-filter(7) (verified `udp`, `port`, `portrange`, `host`, `greater`, `icmp[0]`, `icmp[1]` filter primitives)
- RFC 768 (User Datagram Protocol — confirmed 8-byte UDP header)
- RFC 792 (ICMP — confirmed Type 3 / Code 3 = Port Unreachable)
- IEEE 802.3 / Ethernet II (confirmed 1500-byte standard MTU; 1500 - 20 IP - 8 UDP = 1472-byte max UDP payload before fragmentation)
- gawk manual (`match()` with array argument and array-wide `delete` are gawk extensions; acceptable on Linux)

## Issues Found

1. **Confusing/incorrect annotation on the example tcpdump UDP output** (Analyzing UDP Packet Contents section). The original text read:
   ```
   # UDP length: 12 bytes (4 header + 8 payload... wait, length includes header)
   # Actual payload: length - 8 bytes
   ```
   This contained three errors:
   - The UDP header is 8 bytes, not 4 bytes.
   - tcpdump's `UDP, length N` field is the UDP **payload** length (per the tcpdump(8) man page, "The packet contained N bytes of user data"), not the total datagram length, so the parenthetical "length includes header" is wrong.
   - "Actual payload: length - 8" is therefore also wrong (length already IS the payload).

   Fixed to clearly state that tcpdump's reported length is the UDP data size and the on-the-wire datagram is payload + 8-byte UDP header.

2. **Broken grep regex** (Capturing Specific UDP Protocols section). The expression `grep -E "A\?|AAAA\|response"` was buggy: in ERE, `\|` is a literal pipe character, so the regex effectively matched only `A?` (and a literal `AAAA|response` substring that never appears in tcpdump output). I verified this empirically. Fixed by removing the spurious backslash so all three alternations work: `grep -E "A\?|AAAA|response"`.

## Review Notes
- The `match($0, /length ([0-9]+)/, m)` form and the bare `delete count` (clearing the whole array) are gawk-specific extensions. They will work on essentially any modern Linux distribution where gawk is the default `awk`, but would not work on systems using mawk or BSD awk. This is acceptable for a Linux-tagged post; a future revision could mention the gawk dependency for portability.
- The `greater 1400` filter matches packets whose total length (including IP header, etc.) is ≥ 1400 bytes — it does not strictly filter by UDP payload size. The accompanying note about ~1472 bytes being the fragmentation threshold on standard Ethernet is correct (1500 MTU - 20 IP - 8 UDP). The filter is still a reasonable proxy for "potentially fragmenting UDP packets" given the slight slack.
- The `+28` byte adjustment in the throughput awk pipeline (20 IP header + 8 UDP header) gives the IP packet size; it does not include the 14-byte Ethernet frame header or 4-byte FCS, so on-the-wire bandwidth is slightly under-reported. Acceptable for ballpark monitoring.
- The ICMP filter `icmp[0] = 3 and icmp[1] = 3` correctly identifies ICMP Destination Unreachable / Port Unreachable per RFC 792.
