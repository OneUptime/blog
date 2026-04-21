# Validation Summary: How to Test IPv6 Socket Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 socket programming
- netcat / nc
- socat
- Linux socket inspection with ss, netstat, and lsof
- Python socket, ipaddress, threading, and unittest modules
- curl IPv6 HTTP/HTTPS checks
- tcpdump and pcap filter expressions

## Sources Consulted
- OpenBSD nc(1) manual: https://man.openbsd.org/nc.1
- socat(1) Linux manual page: https://www.man7.org/linux/man-pages/man1/socat.1.html
- iproute2 ss(8) manual page: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
- lsof manual page: https://lsof.readthedocs.io/en/stable/manpage/
- curl command-line manual: https://curl.se/docs/manpage.html
- Python socket documentation: https://docs.python.org/3/library/socket.html
- Python ipaddress documentation: https://docs.python.org/3/library/ipaddress.html
- Linux ipv6(7) manual page: https://www.man7.org/linux/man-pages/man7/ipv6.7.html
- pcap-filter(7) manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local command help/output for nc, ss, netstat, lsof, curl, and tcpdump.

## Issues Found
- The netcat listen command used `nc -6 -l -p 8080`. OpenBSD netcat documents `-p` as a source-port option that cannot be combined with `-l`, so the example was changed to `nc -6 -l 8080`.
- The introduction said the guide covered unit testing with mock sockets, but the Python examples use real IPv6 sockets and address parsing. The wording was corrected to "unit testing address handling and socket binding."
- The `ss` sample output used netstat-style `:::8080` formatting. Current `ss` output commonly shows IPv6-only wildcard listeners as `[::]:8080` and Linux dual-stack wildcard listeners as `*:8080`, so the comments were updated.
- The `lsof -i 6 -i TCP:8080` example broadens results instead of selecting only IPv6 TCP on the target port. It was changed to `lsof -i6TCP:8080`.
- The Python TCP example used `send()`, which can write fewer bytes than requested. It was changed to `sendall()` for both client and server replies.
- The conclusion described only `:::port` as the IPv6 wildcard representation. It now mentions `[::]:port` or `:::port` to match both `ss` and netstat-style displays.

## Review Notes
The corrected Python code block was executed locally and all four tests passed. The corrected `lsof` and `ss` examples were also checked against a temporary IPv6 listener. Some process-name output from `ss -p`, `netstat -p`, and `lsof` can require elevated privileges depending on the system, and Linux dual-stack behavior can be changed by `IPV6_V6ONLY` or `/proc/sys/net/ipv6/bindv6only`.
