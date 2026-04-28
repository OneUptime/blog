# Validation Summary: How to Use Netstat to List All Active IPv4 Connections

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- netstat (net-tools package)
- Linux networking
- TCP / UDP protocols
- Socket states (ESTABLISHED, TIME_WAIT, CLOSE_WAIT, LISTEN, etc.)
- Network interface statistics

## Sources Consulted
- `man netstat` (net-tools NETSTAT(8) manual page)
- Linux net-tools documentation: https://sourceforge.net/projects/net-tools/
- TCP state definitions per RFC 793

## Issues Found
1. **Incorrect flags for showing both active and listening connections.**
   The example `netstat -4t` was labeled as showing "all IPv4 TCP connections (active + listening)", but per `man netstat`, listening sockets are omitted by default unless `-a` or `-l` is supplied. Changed the command to `netstat -4ta` so it actually includes listening sockets, matching its description.

2. **State-count example was inconsistent with its command.**
   The "Count TCP connections by state" snippet used `netstat -4tn` (which omits LISTEN) yet the expected output included a `LISTEN` row. Changed the command to `netstat -4tna` so LISTEN sockets are included, matching the example output.

## Review Notes
- The note at the end correctly flags that `ss` (from iproute2) is the modern replacement for `netstat`. The man page explicitly states `netstat` is "mostly obsolete." Posts that build on this could direct readers to `ss -tn4`, `ss -tnl4`, etc., but the current scope (netstat-only) is fine.
- The simplified description of `Recv-Q`/`Send-Q` ("should be 0") is acceptable as a rule-of-thumb. The man page is more precise: for established sockets these are bytes not yet copied to user space (Recv-Q) or not yet acknowledged by the peer (Send-Q); for listening sockets, they hold the current/maximum SYN backlog. Not changed since the post focuses on established-connection diagnostics.
- Output formatting in the man page suggests using `-W`/`--wide` to avoid IP address truncation; not strictly required for IPv4 but worth knowing.
- All other commands and flags (`-a`, `-4`, `-t`, `-u`, `-l`, `-n`, `-p`, `-i`, `-e`, `-s`) are accurate per the netstat manual.
