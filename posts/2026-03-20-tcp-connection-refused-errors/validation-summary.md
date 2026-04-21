# Validation Summary: How to Troubleshoot TCP Connection Refused Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- TCP connection establishment and reset behavior
- Linux socket inspection with `ss` and legacy `netstat`
- systemd service management with `systemctl` and `journalctl`
- Linux firewall rules with `iptables`
- Nginx `listen` configuration
- Linux privileged ports and file capabilities
- Packet capture with `tcpdump`
- Connectivity checks with `curl`, `telnet`, and `nc`

## Sources Consulted
- RFC 9293: Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `netstat(8)` manual page: https://man7.org/linux/man-pages/man8/netstat.8.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `iptables-extensions(8)` REJECT target documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `setcap(8)` manual page: https://man7.org/linux/man-pages/man8/setcap.8.html
- systemd `systemctl(1)` manual page: https://man7.org/linux/man-pages/man1/systemctl.1.html
- systemd `journalctl(1)` manual page: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Nginx `ngx_http_core_module` `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap filter expression manual page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- curl man page: https://curl.se/docs/manpage.html
- OpenBSD `nc(1)` manual page: https://man.openbsd.org/nc.1
- GNU Inetutils `telnet` manual: https://www.gnu.org/software/inetutils/manual/html_node/telnet-invocation.html

## Issues Found
- The introduction stated that the server sent the RST and that the destination host was necessarily reachable. Updated the wording to include the firewall/path case, since an `iptables` reject rule or another filtering device can generate the TCP reset.
- The `netstat` example was presented as a current peer to `ss`. Added a legacy caveat because the Linux `netstat(8)` manual marks `netstat` mostly obsolete and recommends `ss` as its replacement.
- The first `ss` check said that no output meant the service was not running. Updated it to say no process is listening on that port, which is the direct conclusion from the command.
- The `0.0.0.0:8080` explanation said "all interfaces" and "accessible remotely." Updated it to "all IPv4 interfaces" and added the routing/firewall caveat.
- The firewall section claimed a plain `iptables -j REJECT` rule sends a TCP RST. Corrected the example to use `--reject-with tcp-reset`, which is the documented RST-specific reject mode; the default IPv4 REJECT response is ICMP port unreachable.
- The low-port section described ports below 1024 as "not in valid range." Updated the heading and comments to explain that those ports are valid but privileged and require root or `CAP_NET_BIND_SERVICE` on Linux.
- The packet-capture and conclusion wording said the RST came only from the server and that a timeout produces no packets. Updated this to include firewall-generated RSTs and to describe timeouts as SYN retries with no response.

## Review Notes
Commands such as `iptables`, `setcap`, and `tcpdump` require root or equivalent Linux capabilities in typical environments. The examples are technically valid, but future revisions could add `sudo` or a short privilege note for copy-paste usability.
