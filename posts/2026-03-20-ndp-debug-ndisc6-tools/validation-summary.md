# Validation Summary: How to Debug NDP Issues with ndisc6 Tools

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ndisc6 toolkit (ndisc6, rdisc6, tcpspray6, addr2name6)
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 (Neighbor Solicitation type 135, Neighbor Advertisement type 136)
- Solicited-node multicast addressing (ff02::1:ff00:0/104)
- tcpdump for capturing NDP traffic
- Python 3 (`socket` module, `subprocess`, `re`)
- Linux command-line (apt-get, dnf, ping6)

## Sources Consulted
- ndisc6 manpage (Debian): https://manpages.debian.org/bookworm/ndisc6/ndisc6.8.en.html
- ndisc6 project page: https://www.remlab.net/ndisc6/
- RFC 4861 - Neighbor Discovery for IP version 6 (IPv6)
- RFC 4291 - IP Version 6 Addressing Architecture (Section 2.7.1: Solicited-Node Multicast Address)
- Python 3 `socket` module documentation: https://docs.python.org/3/library/socket.html

## Issues Found

1. **Incorrect description of `-m` flag** — The post stated that `sudo ndisc6 -m 2001:db8::1 eth0` "Force[s] unicast NS (send directly to address, not to multicast)". This is incorrect. Per the ndisc6 manpage, the `-m` / `--multiple` option means "wait for possibly multiple responses, until timeout" rather than exiting after the first response. There is no flag in ndisc6 that forces unicast NS (NS is normally sent to the solicited-node multicast address by design).
   - **Fix**: Updated the comment to "Wait for multiple responses (don't exit on first NA)".

2. **Invalid `-H` flag** — The post showed `sudo ndisc6 -H 255 2001:db8::1 eth0` to "Set Hop Limit for the NS". The ndisc6 tool does not have a `-H` option. Valid short options are `-1`, `-h` (help), `-m`, `-n`, `-q`, `-r`, `-s`, `-V`, `-v`, `-w`. Additionally, RFC 4861 requires NS messages to be sent with hop limit 255, so this would not be a useful tunable even if it existed.
   - **Fix**: Replaced with the valid `-w 2000` example (set the wait timeout in milliseconds), which is a real, useful flag.

3. **Off-by-one byte error in solicited-node multicast Python snippet** — The line:
   ```
   snm = b'\xff\x02' + b'\x00'*9 + b'\xff' + ab[-3:]
   ```
   produces 2 + 9 + 1 + 3 = 15 bytes, while IPv6 addresses require 16 bytes. `socket.inet_ntop(AF_INET6, ...)` would raise `ValueError: invalid length of packed IP address string`. The correct prefix for `ff02::1:ff00:0/104` is 13 bytes (`ff 02 00 00 00 00 00 00 00 00 00 01 ff`), and the missing byte is `0x01` at position 11. Verifying against the example output in the post (`ff02::1:ff00:1` for target `2001:db8::1`) confirms this construction is the intended one.
   - **Fix**: Changed `b'\xff'` to `b'\x01\xff'` so the construction yields a correct 16-byte IPv6 address.

## Review Notes

- `ping6` is being deprecated on some modern Linux distributions in favor of unified `ping` (which auto-detects IPv6) or `ping -6`. The `ping6` command still exists on most distributions today, so leaving it is acceptable, but readers on newer systems may need to substitute `ping -6` or `ping`.
- `addr2name6` is listed among the package's tools. On current Debian/Ubuntu packaging, the binary is typically named `addr2name` (which handles both IPv4 and IPv6); however, naming has varied historically across distributions and project versions, so this was left as-is.
- The default for `-r` is already 3 attempts, so `ndisc6 -r 3` is equivalent to running with no `-r` flag. This is fine for demonstration purposes but worth noting.
- ICMPv6 type assertions (135 = NS, 136 = NA) and the solicited-node multicast prefix are correctly stated.
- The `tcpdump` filter `"icmp6 and (ip6[40] == 135 or ip6[40] == 136)"` correctly indexes the ICMPv6 Type field at offset 40 (i.e., immediately after the 40-byte fixed IPv6 header), assuming there are no extension headers — which is the normal case for NDP messages on a link.
