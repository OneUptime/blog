# Validation Summary: How to Prioritize Network Traffic on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux traffic control (`tc`) / iproute2
- `prio` qdisc
- HTB (Hierarchical Token Bucket) qdisc
- `fq_codel` qdisc (AQM)
- `u32` and `fw` tc filters
- iptables `mangle` table and `MARK` target
- cgroups v2 (and contrast with v1 `net_prio`/`net_cls`)
- `SO_PRIORITY` socket option and `TC_PRIO_*` constants
- IP TOS / DSCP bits
- `ss`, `tcpdump` for verification
- Ubuntu 22.04

## Sources Consulted
- `tc-prio(8)` manpage (iproute2 6.1.0) — band semantics, classification methods, priomap structure
- `tc-htb(8)` manpage — `prio` parameter ("lowest priority field are tried for packets first")
- `cgroups(7)` manpage — controllers available in v1 vs v2; specifically the note that `net_prio` and `net_cls` have no direct equivalent in v2
- `iptables-extensions(8)` — `cgroup --path` match for cgroup2 membership
- `/usr/include/linux/pkt_sched.h` — `TC_PRIO_*` constants (`TC_PRIO_INTERACTIVE = 6`)
- `/etc/services` via `getent` — rsync 873, ftp 21, ftp-data 20
- RFC 791 — IP TOS field bit semantics

## Issues Found

1. **prio qdisc band numbering** — Original text said bands were "numbered 0-3", which implies four bands for the default three-band setup. Per the `tc-prio(8)` manpage, the default is 3 bands indexed 0 through bands-1 (exposed as classes 1:1, 1:2, 1:3). Corrected wording and added the class-mapping note.

2. **FTP port comment** — Port 21 was labeled "FTP data". Port 21 is the FTP **control** channel; port 20 is the active-mode data channel (per `/etc/services`). Changed the comment to "FTP control".

3. **cgroups v2 section was technically misleading** — Three problems:
   - The section claimed Ubuntu 22.04 with cgroups v2 "allows per-process network priority", but per `cgroups(7)` the `net_prio` and `net_cls` controllers are v1-only and have no v2 equivalent.
   - The example created an empty cgroup directory with `mkdir` but never used it for prioritization.
   - It then said tc can classify "based on socket priority (SO_PRIORITY)" while showing a `u32 match ip tos` filter. `SO_PRIORITY` (skb->priority) and `IP_TOS` (IP header byte) are independent mechanisms; matching `ip tos` does not classify by `SO_PRIORITY`.

   Rewrote the section to (a) explicitly note that `net_prio`/`net_cls` are v1 only, (b) demonstrate the v2-correct path-based classification with `iptables -m cgroup --path` (verified against `iptables-extensions(8)`), (c) keep the `SO_PRIORITY` Python example but correctly tie it to the prio qdisc's priomap rather than to TOS, and (d) reframe the `match ip tos` filter as a separate technique for applications that set `IP_TOS`. The TOS bit comment was also corrected from "interactive bit" to "minimize delay" per RFC 791 terminology.

## Review Notes

- HTB syntax (`rate`, `ceil`, `burst`, `prio 0`-`prio 7` with lower = higher priority) verified against `tc-htb(8)` and is correct as written.
- The default `prio` priomap `1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1` shown in the verification comment matches the kernel default.
- `TC_PRIO_INTERACTIVE = 6` confirmed against `linux/pkt_sched.h`.
- The `tc filter ... fw flowid` syntax is valid; some examples in the wild include `protocol ip prio N`, but it is optional for the `fw` classifier.
- `fq_codel` default `target 5ms` / `interval 100ms` values are correct.
- ICMP IP protocol number (1) and matching syntax (`match ip protocol 1 0xff`) are correct.
- The `mkdir -p /sys/fs/cgroup/myapp` style of creating cgroups still works under systemd-managed cgroup v2, but in practice readers will more often manage cgroups via systemd unit slices — the rewritten section now points at `system.slice/...` paths to reflect this.
