# Validation Summary: How to Use netstat for IPv6 Connection Monitoring

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- `netstat` (Linux net-tools)
- `netstat` (macOS / BSD)
- `ss` (iproute2)
- `ip` (iproute2)
- IPv6 addressing and routing
- Bash scripting

## Sources Consulted
- Linux net-tools `netstat(8)` man page (https://man7.org/linux/man-pages/man8/netstat.8.html)
- macOS / BSD `netstat(1)` man page (https://man.openbsd.org/netstat.1, Apple developer docs)
- iproute2 `ss(8)` man page (https://man7.org/linux/man-pages/man8/ss.8.html)
- iproute2 `ip-route(8)` man page
- `/proc/net/snmp6` (Linux kernel IPv6 MIB counters)
- Live `netstat` output verification on Linux

## Issues Found

1. **Example netstat output header was inconsistent with its contents.**
   - The output block in the "Reading netstat IPv6 Output" section was labeled `Active Internet connections (only servers)`, which is the header `netstat` prints when listing only LISTEN sockets (i.e., with `-l`). However, the example included an `ESTABLISHED` row, which would only appear when both servers and established connections are shown.
   - Changed the header to `Active Internet connections (servers and established)` to match the rows shown (this is the actual header that `netstat -tan6` prints).

2. **`netstat -s` was used in the script where `netstat -s6` is required to produce `Ip6:` sections.**
   - The "IPv6 Connection Report" script ran `netstat -s 2>/dev/null | grep -A 20 "^Ip6:"`. On Linux, plain `netstat -s` (without `-6` / `--inet6`) outputs only the IPv4-family sections (`Ip:`, `Icmp:`, `Tcp:`, `Udp:`, `TcpExt:`, `IpExt:`); it does not emit `Ip6:`. To get the `Ip6:`/`Icmp6:`/`Udp6:` blocks (read from `/proc/net/snmp6`), the `-6` flag is required.
   - Changed the script line to `netstat -s6 2>/dev/null | grep -A 20 "^Ip6:"` so the grep actually has something to match.

## Review Notes
- All other commands verified valid: combining short flags such as `-tn6`, `-tln6`, `-tnlp6`, `-r6`, `-rn6`, `-i6`, `-in6`, and `-s6` is supported by net-tools because each letter is an independent short option, and `-6` is `--inet6`.
- The macOS commands (`-f inet6`, `-anf inet6 | grep LISTEN`, `-rn -f inet6`, `-I en0 -f inet6`, `-I en0 -s -f inet6`) all match the BSD `netstat(1)` synopsis.
- The IPv6 address-and-port notation (`:::22`, `::1:25`, `2001:db8::1:443`) is the colon-separated form `netstat` actually prints; this is unlike RFC 5952 bracketed notation, but it matches what users see in real output.
- Caveat worth noting in a future revision: `netstat -s6` still emits a single `Tcp:` block (not `Tcp6:`) because the Linux kernel does not separate TCP MIB counters by address family — TCP stats under `-s6` cover both v4 and v6.
- Caveat worth noting in a future revision: `netstat -tn6` shows non-listening sockets in any state (ESTABLISHED, TIME_WAIT, CLOSE_WAIT, etc.), not exclusively ESTABLISHED. The script's `grep ESTABLISHED` filter is correct, but readers may misread the section title.
- Minor presentation point (not corrected): the routing-table example output mixes BSD-style column headers (`Netif`, `Expire`) with a Linux-style interface name (`eth0`). Linux `netstat -rn6` actually uses `Next Hop`/`Flag`/`Met`/`Ref`/`Use`/`If` column headers. This is cosmetic, not a functional error, and the section explicitly covers both Linux and macOS.
