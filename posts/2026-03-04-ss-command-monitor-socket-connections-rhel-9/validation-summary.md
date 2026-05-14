# Validation Summary: How to Use the ss Command to Monitor Socket Connections on RHEL

## Status
validated

## Post Type
Tutorial / command-line guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux socket inspection
- `ss` from iproute2
- TCP and UDP sockets
- Shell pipelines using `awk`, `sort`, `uniq`, `wc`, `grep`, and `watch`

## Sources Consulted
- Local `ss --help` output from iproute2
- Local `ss(8)` manual page
- Linux man-pages project: `ss(8)` - https://man7.org/linux/man-pages/man8/ss.8.html
- Red Hat Enterprise Linux 7 Performance Tuning Guide, `ss` section - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-performance_monitoring_tools-ss

## Issues Found
- The Basic Usage section described bare `ss` as showing all connections. The `ss(8)` manual says bare `ss` displays open non-listening sockets by default, so the comment was corrected.
- The Basic Usage examples used `ss -t` and `ss -u` for all TCP and UDP sockets. Because listening sockets are omitted by default, these were changed to `ss -ta` and `ss -ua`.
- The nginx example claimed to find all ports used by a process, but the command only lists listening TCP sockets. The comment was narrowed to "listening TCP ports."
- Several count pipelines included the header row in their totals or state counts. Added `-H` to suppress headers before `awk` or `wc -l`.
- The "connections per source IP" example used colon splitting, which is not IPv6-safe and is more accurately a peer-address count. The example now explicitly counts established IPv4 peer addresses.

## Review Notes
The remaining `ss` flags, TCP state filters, address and port filter syntax, timer output, extended information, memory information, and summary statistics examples are consistent with the `ss --help` output and `ss(8)` documentation.
