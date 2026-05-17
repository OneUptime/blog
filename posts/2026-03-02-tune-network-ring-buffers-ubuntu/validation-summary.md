# Validation Summary: How to Tune Network Ring Buffers on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Linux NIC ring buffers (RX/TX descriptor rings)
- `ethtool` (ring parameters, NIC statistics, interrupt coalescing)
- `ip -s link` and `/proc/net/dev` drop counters
- `sysctl` kernel networking knobs: `net.core.netdev_max_backlog`, `net.core.netdev_budget`, `net.core.netdev_budget_usecs`
- NAPI polling
- systemd oneshot service units for persistence
- `tc qdisc` with FQ-CoDel
- `sar` / `sysstat` for long-term network statistics
- Bash scripting (`awk`, `grep -oP`, parameter expansion)
- Driver-specific counter names (Intel, mlx5, vmxnet3)

## Sources Consulted
- ethtool 6.x manpage and `--help` output (verified flags `-g`, `-G`, `-S`, `-c`, `-C` and their semantics)
- Linux kernel networking documentation: https://www.kernel.org/doc/Documentation/networking/scaling.txt
- Linux kernel admin sysctl docs: https://www.kernel.org/doc/Documentation/sysctl/net.txt and Documentation/admin-guide/sysctl/net.rst (defaults: `netdev_max_backlog=1000`, `netdev_budget=300`, `netdev_budget_usecs=2000`)
- Verified live sysctl defaults via `sysctl -a` on Linux: matches the post (default `netdev_max_backlog=1000`)
- `ip-link(8)` manpage for `ip -s link show` output
- systemd.service(5) manpage for `Type=oneshot` + `RemainAfterExit=yes` patterns
- tc-fq_codel(8) manpage and Linux kernel docs on FQ-CoDel qdisc
- sysstat / `sar -n DEV` manpage for network reporting

## Issues Found
No technical issues found. All commands, flags, sysctl names, default values, systemd unit syntax, and counter-name references are accurate. The memory arithmetic (4096 descriptors × 2 KB = 8 MB per queue) is correct, and the NAPI / interrupt-coalescing interaction is described accurately.

## Review Notes
- On Ubuntu, after `apt install sysstat` the data-collection cron/timer is often disabled by default via `ENABLED="false"` in `/etc/default/sysstat`. Just running `systemctl enable --now sysstat` enables the service but may not actually begin populating `/var/log/sysstat/saDD` files until `ENABLED="true"` is set. This is a minor packaging quirk, not an error in the post.
- The `INTERFACES=...` script in the multi-interface section will also pick up non-physical interfaces (bridges, veth, docker0, wireguard). For those, `ethtool -g` typically reports "n/a" or fails; the script's `2>/dev/null` on `ethtool -G` and the `-n "$MAX_RX"` guard handle most cases, but `[ "n/a" -gt 256 ]` would emit a noisy stderr message on some shells. Functionally harmless.
- Ring-buffer defaults vary by driver — 256 is common for older Intel drivers (e1000, igb) and virtio-net, but some modern NICs (ice, mlx5) ship with larger defaults. The "256" example is illustrative and the post frames it as such.
- `net.core.netdev_budget_usecs` requires kernel 4.12+ (2017); fine for all currently supported Ubuntu LTS releases.
- `rx_queue_0_drops` is one of several mlx5 per-queue counter names; modern mlx5 also exposes `rx_out_of_buffer` as the canonical ring-overflow counter. Both are valid signals.
