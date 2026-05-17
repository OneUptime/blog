# Validation Summary: How to Use tc (Traffic Control) for Bandwidth Limiting on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Linux `tc` (iproute2) command
- Queueing disciplines: `tbf`, `htb`, `netem`, `fq_codel`
- Traffic classes and `u32` filters
- `ifb` (Intermediate Functional Block) for ingress shaping
- `iperf3` for bandwidth testing
- `modprobe`, `ip link`, `systemd`, `/etc/rc.local` for setup and persistence

## Sources Consulted
- `tc-tbf(8)` man page (iproute2)
- `tc-netem(8)` man page (iproute2)
- `tc(8)` man page (iproute2)
- Live `tc -s qdisc show` output to verify statistics terminology
- Linux Advanced Routing & Traffic Control HOWTO (lartc.org)
- Kernel docs on HTB and fq_codel

## Issues Found
1. **Incorrect statistics terminology** — The line "The `-s` flag adds packet and byte counters, dropped packet counts, and overlap statistics." referred to "overlap statistics", which is not a real tc statistic. The actual output shows `overlimits` and `requeues`. Updated to: "The `-s` flag adds packet and byte counters, dropped packet counts, and overlimits/requeues statistics."
2. **Incorrect netem reorder description** — The comment "10% of packets are delayed by 10ms extra (causing reordering)" was backwards. Per the `tc-netem(8)` man page, with `reorder 25% 50%` and `delay 10ms`, "25% of packets are sent immediately while the others are delayed by 10 ms". Updated the comment to: "10% of packets are sent immediately while the rest are delayed by 10ms (causing reordering)."

## Review Notes
- The `burst 32kbit` values used with TBF parse correctly (32 kilobits = 4000 bytes). For higher rates the kernel recommends a buffer of at least `rate / HZ`; on modern Ubuntu (HZ=250 or 1000) this is fine, though typical examples in other documentation use larger values like `burst 32kb`. Left as-is since the syntax is valid and the post is a tutorial.
- The `/etc/rc.local` approach still works on modern Ubuntu via `systemd-rc-local-generator` (it runs the file if it exists and is executable). The systemd service approach shown afterward is the more idiomatic modern option.
- The systemd service example references `/usr/local/bin/apply-tc-rules.sh`, which isn't created in the post. This is fine as illustrative scaffolding.
- HTB syntax, u32 filter syntax, ifb ingress redirection, and netem rate/delay/loss/corrupt/reorder options are all current and correct in mainline kernels.
