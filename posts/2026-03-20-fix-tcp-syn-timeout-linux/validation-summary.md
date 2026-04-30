# Validation Summary: How to Fix TCP SYN Timeout Issues on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux TCP/IP stack
- Linux kernel networking sysctls
- TCP connection establishment
- `sysctl`
- `ss`
- `nstat`
- `tcpdump`
- Python `socket`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `tcp(7)` manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux `listen(2)` manual page: https://man7.org/linux/man-pages/man2/listen.2.html
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `nstat(8)` manual page: https://man7.org/linux/man-pages/man8/nstat.8.html
- libpcap `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- RFC 6298, Computing TCP's Retransmission Timer: https://datatracker.ietf.org/doc/html/rfc6298

## Issues Found
- The post stated that Linux's default active SYN timeout is about 63 seconds with pure exponential backoff. I corrected this to note that current Linux timing also depends on `net.ipv4.tcp_syn_linear_timeouts`, and that current defaults produce an active connect timeout of about 131 seconds.
- The post implied that the `listen()` backlog and `tcp_max_syn_backlog` tune the same queue. I corrected this to distinguish the SYN backlog from the accept queue, and noted that `listen()` backlog is capped by `net.core.somaxconn`.
- The post described `tcp_max_syn_backlog` as having a fixed default of 128. I corrected this to reflect that the default varies by kernel and available memory.
- The SYN cookies section described `tcp_syncookies=2` as "more secure". I corrected this because current Linux documents `2` as unconditional SYN cookies for testing, not as a stronger production setting.
- The conclusion recommended always relying on SYN cookies. I corrected this to match Linux kernel guidance: keep `tcp_syncookies=1` as overflow protection, but do not treat syncookies as a scaling mechanism for overloaded servers.
- The diagnostic command using `netstat -s | grep "SYNs to LISTEN sockets dropped"` was brittle and based on an obsolete tool. I replaced it with `nstat` counters that directly expose listen drops, queue overflow handling, and syncookie activity.
- The `ss` watch command counted the header line. I corrected it to use `ss -H`.
- The `tcpdump` filter matched both SYN and SYN-ACK packets. I corrected it to match client SYN packets without ACK set.
- The Python example stated too absolutely that a 5-second timeout meant "no SYN-ACK received within 5 seconds". I corrected the comments and message to match Python's documentation, which says `connect()` is subject to the socket timeout but the OS network stack may also return its own timeout error.

## Review Notes
- Current Linux kernel documentation and the `tcp(7)` manual page are not perfectly aligned on active-open timeout wording. The latest kernel documentation includes `tcp_syn_linear_timeouts`, which is why this review used the kernel documentation for the timeout description.
