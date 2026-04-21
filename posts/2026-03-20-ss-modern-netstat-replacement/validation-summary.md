# Validation Summary: How to Use the ss Command as a Modern Netstat Replacement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking
- `ss` from iproute2
- `netstat` from net-tools
- TCP and UDP sockets
- TCP connection states and internal statistics

## Sources Consulted
- `ss(8)` manual page from iproute2: https://man7.org/linux/man-pages/man8/ss.8.html
- `netstat(8)` manual page from net-tools: https://man7.org/linux/man-pages/man8/netstat.8.html
- iproute2 upstream README and source mirror: https://github.com/iproute2/iproute2
- RFC 9293, Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293.html
- Local CLI verification with `ss --help`, `ss --version` (iproute2 6.1.0), `man ss`, and representative `ss` filter commands.

## Issues Found
- The post claimed `ss` provides all `netstat` functionality. `netstat` also covers routing tables, interface statistics, multicast groups, masquerade connections, and protocol statistics, with documented replacements such as `ip route`, `ip -s link`, and `ip maddr`. Changed the wording to scope `ss` to common socket-inspection functionality.
- The comparison table said `netstat` is not maintained and `ss` is pre-installed. The netstat manual describes it as mostly obsolete, and both tools are package-dependent. Updated the table to reference `net-tools` and `iproute2` packages and use "Mostly obsolete" for netstat.
- The basic examples described `ss -a`, `ss -t`, and `ss -u` as "all connections", "all TCP", and "all UDP". The `ss` manual distinguishes all sockets via `-a`, while `-t` and `-u` select protocol families without implying all states. Updated the comments to "sockets" and removed inaccurate "all" wording.
- The port-filter examples omitted a TCP/UDP selector, which can cause `RTNETLINK answers: Invalid argument` when `ss` tries to apply port predicates across socket families where ports are not valid. Updated the commands to use `-tun` or `-tuna`.
- The TIME_WAIT note suggested a "connection leak". TIME_WAIT is a normal TCP close state and high counts more directly suggest high connection churn. Updated the comment accordingly.
- The `bytes_retrans` note equated retransmissions strictly with packet loss. Retransmissions can also result from reordering or other network behavior, so the note now says they may indicate packet loss or reordering.

## Review Notes
The corrected commands were checked against the local `ss` binary and the iproute2 manual. Some broad operational claims, such as `ss` being faster on large socket tables, are supported by the netstat manual's recommendation to use the netlink-based `ss` command for large socket listings.
