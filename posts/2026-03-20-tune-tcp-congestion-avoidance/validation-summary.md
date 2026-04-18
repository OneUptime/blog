# Validation Summary: How to Tune TCP Congestion Avoidance Parameters

## Status
validated

## Post Type
Tutorial / Guide (Linux kernel network tuning)

## Technologies Covered
- Linux kernel TCP stack (sysctl)
- TCP congestion control (CUBIC, BBR)
- SACK / DSACK loss recovery
- RACK/TLP loss recovery
- fq qdisc
- sysctl configuration via `/etc/sysctl.d/`

## Sources Consulted
- Linux kernel networking documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel source `net/ipv4/tcp_cubic.c` (module parameters, BICTCP_BETA_SCALE)
- Linux kernel source `include/net/tcp.h` (TCP_RETR2 constant)
- Linux 4.15 commit history (FACK removal) — https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git
- RFC 8312 (CUBIC for Fast and Long-Distance Networks)
- RFC 1122 (retransmission guidance)

## Issues Found
1. **`tcp_fack` references** — FACK was removed from the Linux kernel in 4.15 (January 2018) when RACK-based recovery superseded it. The current kernel docs describe it as "a legacy option, it has no effect anymore." Removed from the parameter listing and from the comprehensive sysctl config block.
2. **CUBIC parameter name wrong** — The Linux kernel `tcp_cubic` module exposes the beta parameter as `beta`, not `beta_cubic` (see `module_param(beta, int, 0644)` in `tcp_cubic.c`). Fixed all three references: the `cat` command, the inline description, and the `echo` write path.
3. **Incorrect scaling math** — The post stated "beta_cubic: ... default: 717 = 0.717". CUBIC's beta is scaled by `BICTCP_BETA_SCALE = 1024`, so 717/1024 ≈ 0.70, not 0.717. Corrected the comment to state the scaling factor and the correct ratio.
4. **"requires kernel module reload"** — The beta parameter is declared with mode 0644 (`module_param(beta, int, 0644)`), which makes `/sys/module/tcp_cubic/parameters/beta` writable at runtime without any reload. Corrected the comment.

## Review Notes
- `net.ipv4.tcp_rto_min_us` is a relatively new sysctl (added in a recent kernel release). Readers on older kernels (pre-6.11) will need to use per-route `rto_min` via `ip route change ... rto_min 50ms` instead. The post doesn't flag this, but it's a reasonable modern-kernel assumption for a 2026 article.
- `tcp_retries2` default is 15 per `TCP_RETR2` in `include/net/tcp.h` — post is correct. (Some secondary documentation references a value of 8, but the kernel source constant is 15; ~924.6 seconds.)
- `tcp_recovery` controls RACK/TLP behavior (bitmask), not just "fast recovery" in the classical sense — comment was lightly clarified.
- BBR + fq qdisc recommendation is sound and matches upstream guidance.
- For production changes, using `sysctl --system` after dropping a file in `/etc/sysctl.d/` is also common; the post's `sysctl -p <file>` form is correct.
