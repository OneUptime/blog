# Validation Summary: How to Filter IPv4 Sockets with ss -4

## Status
validated

## Post Type
Technical tutorial / CLI guide

## Technologies Covered
- Linux `ss` from iproute2
- IPv4 and IPv6 sockets
- TCP and UDP socket filtering
- Bash, awk, cut, sort, uniq, and wc

## Sources Consulted
- `ss(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- `ipv6(7)` Linux manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux kernel IP sysctl documentation for `bindv6only`: https://www.kernel.org/doc/html/v5.8/networking/ip-sysctl.html
- Local `ss --help` and `ss --version` output from iproute2 6.1.0
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The basic examples labeled `ss -4`, `ss -4t`, and `ss -4u` as showing all IPv4 sockets, TCP sockets, and UDP sockets. The `ss(8)` manual says default output omits listening sockets, so these were changed to `ss -4a`, `ss -4ta`, and `ss -4ua`.
- The active TCP connection count used `wc -l` on output that included the header line. The command was changed to `ss -4Htn state established | wc -l`, and the related awk examples were updated to use headerless `ss` output.
- The destination-port count extracted `$4`, which is the local address/port column in `ss` output. It was changed to extract `$5`, the peer address/port column, so it matches the destination-port wording.
- The IPv6 `[::]` listener note implied IPv4-mapped handling unconditionally. It was updated to state that IPv4 handling depends on `IPV6_V6ONLY` and service configuration.

## Review Notes
- The `dst`, `src`, `sport`, `dport`, `state established`, `-4`, `-6`, `-t`, `-u`, `-l`, `-n`, and `-p` usage matches `ss(8)`.
- Output examples are abbreviated for readability; exact columns and process details can vary by iproute2/kernel version and privileges.
- On this review host, `ss -4a` returned IPv4 socket output while also printing an `RTNETLINK answers: Invalid argument` warning for the broad query. TCP- and UDP-specific forms ran cleanly.
