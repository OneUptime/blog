# Validation Summary: How to Understand the ECN Bits in the IPv4 Header

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- Explicit Congestion Notification (ECN)
- TCP
- UDP
- Linux networking (`sysctl`, `ip(7)`)
- Python `socket`
- Wireshark / TShark
- tcpdump

## Sources Consulted
- RFC 3168: https://www.rfc-editor.org/rfc/rfc3168
- Linux kernel `ip-sysctl` documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `ip(7)` man page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `tcpdump(8)` man page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Wireshark IPv4 display filter reference: https://www.wireshark.org/docs/dfref/i/ip.html
- RFC 9000 (QUIC): https://www.rfc-editor.org/rfc/rfc9000.html

## Issues Found
- The post described `ECT(1)` as an "alternative" and `ECT(0)` as "preferred". RFC 3168 defines both as ECN-capable transport codepoints; the post was corrected to reflect that and to note that `ECT(0)` is the one to use when only a single ECT codepoint is needed.
- The `Not-ECT` description was too strong. It now matches RFC 3168 more closely by describing the packet as not using ECN.
- The Linux `net.ipv4.tcp_ecn` value meanings were outdated. The post now reflects the current kernel documentation for values `1` and `2` and notes that newer kernels also define `3` through `5` for AccECN.
- The Python example incorrectly implied that reading `IP_TOS` on a connected TCP socket reveals negotiated TCP ECN state. It was replaced with a correct example that sets and reads ECN bits on a UDP socket's IPv4 DS field.
- The `tcpdump | grep ECN` example was not reliable because `tcpdump` does not emit a generic `ECN` token for this case. It was replaced with a valid `tcpdump` filter that matches TCP `ECE` / `CWR` flags.
- The post used "ToS byte" as if it were the current field name. It was updated to "IPv4 DS field (historically the ToS byte)" where needed for current terminology.

## Review Notes
- Current Linux kernels document additional `tcp_ecn` values `3` through `5` for Accurate ECN (AccECN), but the post's Linux section remains appropriately focused on the common `1` and `2` settings.
- `IP_RECVTOS` is a datagram-socket mechanism; Linux `ip(7)` documents it as unsupported on `SOCK_STREAM` sockets, which is why the corrected Python example no longer uses a TCP socket.
