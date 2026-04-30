# Validation Summary: How to Fix TCP Connection Reset by Peer Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux networking
- `tcpdump`
- Netfilter conntrack and `iptables`
- `systemctl` and `journalctl`
- Python sockets
- Java sockets
- `strace`
- `ss`

## Sources Consulted
- RFC 9293, Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- RFC 1122, Requirements for Internet Hosts - Communication Layers: https://datatracker.ietf.org/doc/rfc1122/
- Linux `socket(7)` manual: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `tcp(7)` manual: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux `tcpdump(8)` manual: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Linux `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel Netfilter conntrack sysctl documentation: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- Python socket documentation: https://docs.python.org/3.10/library/socket.html
- Python Socket Programming HOWTO: https://docs.python.org/3.15/howto/sockets.html
- Oracle Java networking note, "Orderly Versus Abortive Connection Release in Java": https://docs.oracle.com/javase/8/docs/technotes/guides/net/articles/connection_release.html
- Local `--help` output checked for `tcpdump`, `systemctl`, `journalctl`, `sysctl`, `strace`, `iptables`, and `ss`

## Issues Found
- The introduction incorrectly referred to `RSO_LINGER`. I corrected this to `SO_LINGER` and clarified that the abortive close case is specifically `linger=0`.
- The "Application Crashes or Exits Abruptly" section overstated the behavior by implying abrupt exit itself is the RST trigger. I changed it to describe abortive close or close with unread data, which matches RFC 1122, RFC 9293, and Oracle's Java networking guidance.
- The Python and Java shutdown advice was too broad. I replaced `SHUT_RDWR` guidance with half-close guidance that matches documented TCP close semantics: use `shutdown(...SHUT_WR)` or `shutdownOutput()` only when the protocol actually needs a half-close, then finish reading before closing.
- The proxy section said the proxy "kills idle connections and sends RST" as a blanket rule. I changed this to say proxies or load balancers may close idle connections and some do so with RST, which is the technically accurate statement.
- The nginx config check only searched `/etc/nginx/nginx.conf`. I expanded it to search `/etc/nginx` recursively so included configuration files are covered.
- The firewall section incorrectly said `REJECT` sends RST. I corrected this to reflect `iptables-extensions(8)`: `REJECT` returns ICMP by default, and TCP resets require `--reject-with tcp-reset`.
- The firewall inspection command was too generic for finding TCP resets. I changed it to `iptables -S | grep -- '--reject-with tcp-reset'` so it actually looks for rules that originate TCP RSTs.
- The "SEQ Number Out of Window" section was technically wrong. RFC 9293 says synchronized TCP endpoints respond to unacceptable out-of-window segments with an ACK, not a reset. I replaced that section with the correct case: packets arriving for a connection that no longer exists locally.
- The retry advice was too absolute. I constrained it to idempotent operations, since retrying non-idempotent work after `ECONNRESET` can cause duplicate effects.
- The conclusion repeated the earlier inaccuracies. I updated it to match the corrected explanations.

## Review Notes
- The post is Linux-specific, and the keepalive socket options shown in Python (`TCP_KEEPIDLE`, `TCP_KEEPINTVL`, `TCP_KEEPCNT`) are Linux-oriented rather than portable across operating systems.
- The firewall examples use the `iptables` frontend. On newer Linux systems the active ruleset may be managed through nftables even when `iptables` compatibility commands exist.
