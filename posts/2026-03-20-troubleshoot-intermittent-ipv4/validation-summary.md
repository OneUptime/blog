# Validation Summary: How to Troubleshoot Intermittent IPv4 Connectivity Issues on Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux networking
- IPv4 connectivity troubleshooting
- ICMP ping and MTR diagnostics
- iproute2 (`ip`, `ss`, `nstat`)
- ARP / IPv4 neighbor tables
- DNS diagnostics with `dig` and `/etc/resolv.conf`
- systemd journal and kernel logs
- ethtool network interface diagnostics

## Sources Consulted
- iputils `ping(8)` manual: https://www.man7.org/linux/man-pages/man8/ping.8.html
- iputils `arping(8)` manual: https://man7.org/linux/man-pages/man8/arping.8.html
- `mtr(8)` manual: https://manpages.debian.org/testing/mtr/mtr.8.en.html
- iproute2 `ip(8)` manual: https://man7.org/linux/man-pages/man8/ip.8.html
- iproute2 `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 `ip-neighbour(8)` manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- iproute2 `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- iproute2 `nstat(8)` / `rtacct(8)` manual: https://manpages.debian.org/unstable/iproute2/rtacct.8.en.html
- net-tools `netstat(8)` manual: https://man7.org/linux/man-pages/man8/netstat.8.html
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/latest/manpages.html
- `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- `journalctl(1)` manual: https://man7.org/linux/man-pages/man1/journalctl.1.html
- util-linux `dmesg(1)` manual: https://man7.org/linux/man-pages/man1/dmesg.1.html
- procps-ng `watch(1)` manual: https://manpages.debian.org/unstable/procps/watch.1.en.html
- `ethtool(8)` manual: https://man7.org/linux/man-pages/man8/ethtool.8.html
- RFC 5227, IPv4 Address Conflict Detection: https://datatracker.ietf.org/doc/rfc5227/
- Local command help output for `ping`, `ip`, `mtr`, `ss`, `nstat`, `dig`, `dmesg`, `journalctl`, `watch`, and `ethtool`

## Issues Found
1. **Legacy interface statistics command**: The post included `netstat -i` after `ip -s link show eth0`. The `netstat(8)` manual marks `netstat` as mostly obsolete and lists `ip -s link` as the replacement for `netstat -i`. Removed `netstat -i`.
2. **Legacy and overly broad ARP inspection**: The post used `arp -n` and `ip neigh show`. Since the guide is IPv4-specific and `ip neigh` is the modern neighbor-table interface, changed the snippet to `ip -4 neigh show dev eth0` and made the flush command IPv4-specific with `sudo ip -4 neigh flush dev eth0`.
3. **Incorrect ARP state wording**: The post said stale or incomplete ARP entries cause intermittent failures. `STALE` neighbor entries can be valid, while `INCOMPLETE` and `FAILED` entries are stronger indicators of neighbor-resolution trouble. Updated the wording to say `FAILED` or `INCOMPLETE` entries can indicate ARP resolution problems.
4. **MTR path-loss interpretation was too absolute**: The post said MTR identifies where loss occurs. Updated the wording to clarify that persistent loss starting at one hop and continuing through later hops is the useful signal.
5. **Duplicate-IP check did not terminate and overspecified exit status**: `arping -D -I eth0 ...` can run until interrupted without a count or deadline. Added `sudo` for the raw-socket capability requirement, added `-c 3`, and corrected the comment to state that exit `0` means no replies/no duplicate while nonzero means a duplicate was detected or the command failed.
6. **TCP retransmission command used obsolete `netstat` and described counters as rates**: Replaced `netstat -s | grep ...` with current tools: `ss -ti` for per-socket TCP information and `nstat -az TcpRetransSegs TcpExtTCPLostRetransmit TcpAttemptFails` for kernel TCP counters. Updated the text from retransmission rates to retransmission counters.

## Review Notes
- The remaining commands and flags are valid for current Linux tooling based on official/manual documentation and local help output.
- The examples use `eth0` as a placeholder interface name; many current distributions use predictable names such as `enp0s3` or `ens160`.
- Public targets such as `8.8.8.8` are useful for a baseline, but future revisions could also suggest testing the default gateway to distinguish local LAN failures from upstream path failures.
