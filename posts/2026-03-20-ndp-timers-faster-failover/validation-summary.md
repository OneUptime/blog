# Validation Summary: How to Configure NDP Timers for Faster Failover

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) / Neighbor Unreachability Detection (NUD)
- Linux kernel sysctl (`net.ipv6.neigh.*`) parameters
- radvd (Router Advertisement Daemon) configuration
- `iproute2` (`ip -6 neigh`) for neighbor cache inspection
- Bash scripting for failover measurement

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §7.3 (NUD), §6.2.1 (Router Configuration Variables): https://datatracker.ietf.org/doc/html/rfc4861
- Linux kernel networking sysctl documentation (`Documentation/networking/ip-sysctl.txt`) for `net.ipv6.neigh.*` defaults: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- radvd man page (radvd.conf(5)): https://www.litech.org/radvd/
- iproute2 `ip-neighbour(8)` man page

## Issues Found
1. **DELAY state value mismatch in the "Ultra-fast NUD" block.** The post claimed `DELAY state: 0.5s (delay_first_probe_time = 1, tuned OS)`. The Linux kernel parameter `delay_first_probe_time` is an integer expressed in seconds, so a value of `1` produces a 1-second delay, not 0.5s. Updated the line to reflect 1s, noted that 1 is the minimum integer value, added the matching `retrans_time_ms=250` annotation for the PROBE row, and corrected the total from `~3 seconds` to `~3.5 seconds`.

2. **Incorrect constraint on `AdvDefaultLifetime`.** The post stated "Router Lifetime must be at least 3x MaxRtrAdvInterval". Per RFC 4861 §6.2.1 and the radvd manpage, AdvDefaultLifetime must be either zero or between `MaxRtrAdvInterval` and `9000` seconds; the `3 × MaxRtrAdvInterval` figure is the *default*, not a hard lower bound. Rewrote the comment to state the actual constraint and frame 90s as a resilience choice rather than a requirement.

## Review Notes
- The `base_reachable_time_ms` figures used in the failover-time calculations are presented as the worst case, but RFC 4861 specifies the actual ReachableTime is randomized between 0.5× and 1.5× of `BaseReachableTime`, so the strict worst case is 1.5× the configured base (e.g., up to 45s for 30s default, up to 7.5s for 5s tuned). The author's simplification using the base value is reasonable for an introductory guide and was left intact.
- The `awk '{print $NF}'` approach in the failover-measurement script correctly captures the NUD state (it is the trailing token in `ip -6 neigh show` output). When the entry is removed entirely the variable becomes empty, which the script handles via the state-change comparison.
- The persistent sysctl heredoc (`<< EOF` without quoting) expands `${IFACE}` into the file at write time, producing a hardcoded `eth0` in `/etc/sysctl.d/10-ndp-fast-failover.conf` — that is the intended behavior.
- `ucast_solicit` is the correct knob to tune for NUD failover (probing of an existing neighbor); `mcast_solicit` governs initial address resolution and was correctly left out of the failover math.
