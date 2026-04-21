# Validation Summary: How to Display TCP Socket States Using ss

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `ss` command from iproute2
- TCP connection states
- Linux networking sysctls (`net.ipv4.tcp_tw_reuse`, `net.ipv4.ip_local_port_range`)
- Shell pipelines with `awk`, `sort`, `uniq`, `wc`, and `watch`

## Sources Consulted
- `ss(8)` Linux manual page for options and state filters: https://www.man7.org/linux/man-pages/man8/ss.8.html
- Local `ss --help` and `ss -V` output from iproute2 6.1.0
- RFC 9293, Transmission Control Protocol, Section 3.3.2 state definitions: https://datatracker.ietf.org/doc/html/rfc9293#section-3.3.2
- Linux kernel IP sysctl documentation for `tcp_tw_reuse` and `ip_local_port_range`: https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
1. **State names mixed underscore style with `ss`/TCP names**: The post used forms such as `TIME_WAIT`, `CLOSE_WAIT`, `SYN_RECV`, `FIN_WAIT1`, and `FIN_WAIT2`. `ss` displays these with hyphens, and its state filters use lowercase hyphenated identifiers. Updated the visible state names and related comments to hyphenated `ss` output forms such as `TIME-WAIT`, `CLOSE-WAIT`, `SYN-RECV`, `FIN-WAIT-1`, and `FIN-WAIT-2`.
2. **TIME-WAIT and CLOSE-WAIT counts included the header line**: Commands like `ss -tn state time-wait | wc -l` count the `ss` header as one socket. Updated the counting examples to use `ss -Htn ...`, matching the documented `--no-header` option.
3. **TIME-WAIT port extraction was fragile for IPv6 addresses**: `cut -d: -f2` can return the wrong value for bracketed IPv6 addresses because those addresses contain multiple colons. Replaced it with an `awk` split that prints the final colon-separated field from the peer address column.
4. **CLOSE-WAIT and unusual-state wording was too absolute**: A transient `CLOSE-WAIT` socket is not necessarily an application bug, and high counts of unusual states do not always reliably mean bugs or attacks. Updated the wording to describe persistent or growing `CLOSE-WAIT` as usually indicating a bug, and unusual state counts as possible signs of bugs, overload, or attacks.
5. **TIME-WAIT reuse guidance needed the kernel caveat**: The `tcp_tw_reuse` command is valid, but Linux kernel documentation says it should not be changed without expert guidance. Added that caution inline without changing the command.

## Review Notes
- The `ss state` filter examples are valid for current iproute2; the documented filter identifiers include `established`, `syn-sent`, `syn-recv`, `fin-wait-1`, `fin-wait-2`, `time-wait`, `closed`, `close-wait`, `last-ack`, `listening`, and `closing`.
- The `ip_local_port_range` example uses the documented two-integer sysctl format. In production, operators should also account for reserved ports and local policy before expanding the ephemeral range.
