# Validation Summary: How to Monitor NAT Session Counts and Limits

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Linux netfilter / nf_conntrack subsystem
- `conntrack` CLI tool (conntrack-tools)
- `/proc/sys/net/netfilter/` kernel interface
- Bash shell scripting
- cron / `/etc/crontab`
- Prometheus + node_exporter
- `sysctl` kernel parameter tuning

## Sources Consulted
- [Linux Kernel netfilter sysctl docs](https://docs.kernel.org/networking/nf_conntrack-sysctl.html)
- [conntrack-tools manual (netfilter.org)](https://conntrack-tools.netfilter.org/manual.html)
- [conntrack(8) man page](https://www.netfilter.org/projects/conntrack-tools/conntrack-manpage.html)
- [Prometheus node_exporter conntrack collector](https://github.com/prometheus/node_exporter/blob/master/collector/conntrack_linux.go)
- [Red Hat: conntrack memory per entry](https://access.redhat.com/solutions/728653)
- John Leach: Netfilter conntrack memory usage analysis

## Issues Found
1. **Incorrect awk field for TCP state extraction.** In the "Breaking Down Sessions by State" section, the command used `awk '{print $NF}'` to extract the TCP state. However, in the default `conntrack -L -p tcp` output format, the last field (`$NF`) is `use=N`, not the connection state. The TCP state appears at field `$4` (after protocol name, protocol number, and timeout). Changed `$NF` to `$4` so the breakdown produces the expected `ESTABLISHED`/`TIME_WAIT`/`SYN_SENT` counts shown in the example output.

## Review Notes
- The `awk 'match($0, /src=([0-9.]+)/, a)'` syntax in "Session Count by Source IP" uses GNU awk's three-argument `match()` extension. This works on most Linux distributions where gawk is the default, but would fail on minimal systems using mawk or BSD awk. Acceptable for the target audience (Linux NAT operators).
- The `~300 bytes per conntrack entry` figure is a reasonable rule of thumb; actual size varies between roughly 300–328 bytes depending on kernel version, architecture, and enabled features (accounting, timestamping, etc.). The 143 MB calculation for 500K entries is correct given the 300-byte assumption.
- node_exporter metric names (`node_nf_conntrack_entries`, `node_nf_conntrack_entries_limit`) verified against current upstream source.
- Kernel paths (`/proc/sys/net/netfilter/nf_conntrack_count`, `nf_conntrack_max`) verified against kernel documentation.
- The Prometheus alert rule syntax and cron `/etc/crontab` format (with user field) are correct.
