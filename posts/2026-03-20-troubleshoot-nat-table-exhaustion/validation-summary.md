# Validation Summary: How to Troubleshoot NAT Translation Table Exhaustion

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux kernel netfilter / nf_conntrack
- conntrack-tools (`conntrack` CLI)
- sysctl / /proc/sys/net/netfilter
- Bash scripting, cron, logger
- NAT / connection tracking concepts

## Sources Consulted
- Linux kernel documentation: [nf_conntrack-sysctl.txt](https://www.kernel.org/doc/Documentation/networking/nf_conntrack-sysctl.txt) and [Kernel docs: Netfilter Conntrack Sysfs variables](https://docs.kernel.org/networking/nf_conntrack-sysctl.html)
- conntrack-tools manpage: https://www.netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- Ubuntu `conntrack(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/conntrack.8.html
- Red Hat KB on conntrack table-full errors: https://access.redhat.com/solutions/8721

## Issues Found

1. **Step 2 — "Count by destination IP" pipeline was broken.** The original pipeline did `awk '{print $5}' | grep -o 'dst=[0-9.]*'`, but field `$5` in a TCP `conntrack -L` line is `src=...`, not `dst=...`. The `grep -o 'dst=...'` therefore matched nothing and the command would always return empty output. Fixed by changing to `awk '{print $6}'` (field 6 is the original-direction `dst=...`) and removing the now-redundant `grep -o`.

2. **Step 5 — TIME_WAIT flush loop was broken.** The original loop passed `conntrack -D $src $dst $sport $dport` where the variables expanded to `src=X dst=Y sport=A dport=B`. The conntrack CLI only accepts the `key=value` form as *output*; as input it requires explicit flags (`-s`, `-d`, `-p`, `--sport`, `--dport`). The command would fail with usage errors. Replaced with the supported, simpler equivalent `sudo conntrack -D -p tcp --state TIME_WAIT`, which uses conntrack-tools' built-in state filter to delete all TCP TIME_WAIT entries.

## Review Notes
- Default kernel timeouts quoted in the post are accurate: `tcp_timeout_established` = 432000s (5 days), `tcp_timeout_time_wait` = 120s, `tcp_timeout_close_wait` = 60s, `udp_timeout` = 30s.
- `nf_conntrack_buckets` is writable via sysctl only in the initial network namespace; in older kernels (pre-4.9) the only way to resize the hash was `/sys/module/nf_conntrack/parameters/hashsize`. Modern distros should be fine.
- The `buckets = max/4` guidance matches the kernel's internal default ratio (`max = buckets * 4`). Some tuning guides recommend a 1:1 or 1:2 ratio for better hash-chain performance under heavy load, but the ratio in the post is not wrong.
- The final cron install line `echo "..." | sudo crontab -` **replaces** the existing root crontab rather than appending. Not a technical error (it does what it literally says), but readers with existing cron jobs should be aware and use `(sudo crontab -l; echo "...") | sudo crontab -` if they want to preserve existing entries.
- The kernel error string `nf_conntrack: table full, dropping packet` matches the canonical Netfilter log message.
