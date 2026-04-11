# Validation Summary: How to Use Redis CLI --intrinsic-latency for System Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (redis-cli)
- Linux kernel tuning (THP, NUMA, CPU governor, swap)
- taskset (CPU pinning)

## Sources Consulted
- Redis official documentation on latency: https://redis.io/docs/management/optimization/latency/
- Redis CLI documentation: https://redis.io/docs/connect/cli/
- Linux kernel documentation for Transparent Huge Pages: https://www.kernel.org/doc/Documentation/vm/transhuge.txt
- Linux kernel documentation for NUMA balancing: https://www.kernel.org/doc/Documentation/sysctl/kernel.txt
- Linux cpufreq governor documentation: https://www.kernel.org/doc/Documentation/cpu-freq/governors.txt
- taskset man page

## Issues Found
No technical issues found.

## Review Notes
- The `--intrinsic-latency` command syntax, argument semantics (seconds), and sample output format are all accurate.
- The post correctly emphasizes running the test on the Redis server host, not a client machine, since `--intrinsic-latency` does not connect to Redis — it measures local OS jitter only.
- All Linux tuning commands (THP disable, NUMA balancing disable, CPU governor set, swapoff, taskset) use correct paths and values.
- The interpretive latency thresholds table is not from official Redis docs but represents reasonable operational guidelines.
- The suggestion to persist THP settings via `/etc/rc.local` is functional but slightly dated for modern systemd-based distributions. A systemd unit or tuned profile would be the modern approach. This is not technically wrong, just worth noting for future updates.
- The section heading "Increase CPU Governor to Performance Mode" could more precisely read "Set CPU Governor to Performance Mode," but this is a minor wording preference, not a technical error.
