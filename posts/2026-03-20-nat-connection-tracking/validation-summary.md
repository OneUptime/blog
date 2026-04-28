# Validation Summary: How to Troubleshoot NAT with Connection Tracking

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux kernel netfilter / nf_conntrack
- conntrack-tools (`conntrack` CLI)
- iptables (NAT and FORWARD chains)
- sysctl tunables under `net.netfilter.*`
- `/proc/sys/net/netfilter/` interface

## Sources Consulted
- conntrack(8) man page — https://manpages.debian.org/bookworm/conntrack/conntrack.8.en.html
- Linux kernel `nf_conntrack-sysctl.txt` — https://www.kernel.org/doc/Documentation/networking/nf_conntrack-sysctl.txt
- Linux kernel source `net/netfilter/nf_conntrack_standalone.c` (per-CPU stats fields)
- libnetfilter_conntrack `snprintf_default.c` (default `-L` output format)
- netfilter project docs — https://www.netfilter.org/projects/conntrack-tools/

## Issues Found

1. **`conntrack -L | grep SNAT` / `grep DNAT` would not match anything.** The default `conntrack -L` output does not contain literal `SNAT`/`DNAT` strings; those are netfilter rule targets, not conntrack table fields. Fixed to use the proper filter flags `conntrack -L --src-nat` and `conntrack -L --dst-nat`, which are the documented way to filter NAT'd entries.

2. **`conntrack -E -p tcp --state NEW` is invalid.** The `--state` option filters by TCP state and accepts values like `SYN_SENT`, `ESTABLISHED`, `TIME_WAIT`, etc. — `NEW` is not a TCP state. For event filtering, conntrack-tools uses `-e`/`--event-mask` with values `NEW`, `UPDATES`, `DESTROY`. Fixed to `conntrack -E -e NEW -p tcp`.

3. **Sample output timeout value of `86400` was misleading.** `86400` is the default for `nf_conntrack_generic_timeout`; an `ESTABLISHED` TCP entry uses `nf_conntrack_tcp_timeout_established` whose default is `432000` (5 days). Updated the sample output to `432000` so it is consistent with the unmodified kernel default referenced later in the post.

4. **Comment "Delete all SNAT connections" was misleading.** The command `conntrack -D -s 192.168.1.0/24` deletes all entries whose original-direction source falls in the subnet — it does not filter by whether the entry was SNAT'd. Reworded the comment to "Delete all connections from a source subnet (e.g., LAN clients)".

## Review Notes

- The list of `conntrack -S` fields ("found, invalid, ignore, insert, insert_failed, drop, early_drop, error") is a correct subset, but recent kernels expose additional per-CPU columns such as `clash_resolve`, `search_restart`, `chainlength`, `delete`, `expect_new`, `expect_create`, and `expect_delete`. The post's enumeration is not wrong, just non-exhaustive — left as-is since it covers the most commonly used troubleshooting fields.
- `/etc/sysctl.conf` still works on systemd distros, but on modern Debian/Ubuntu/RHEL the canonical place for persistent tuning is a drop-in under `/etc/sysctl.d/` (e.g. `/etc/sysctl.d/90-conntrack.conf`). Either is functional; left as-is.
- `apt install conntrack` will work but may need `apt-get update` first on a fresh image. Considered minor; not changed.
- The "Forward / Reverse" tuple explanation is accurate for an SNAT scenario where the internal IP `192.168.1.10` is translated to the public `203.0.113.1` on egress.
