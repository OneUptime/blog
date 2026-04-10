# Validation Summary: How to Tune Linux Kernel Parameters for Redis Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (in-memory data store)
- Linux kernel parameters (sysctl)
- Transparent Huge Pages (THP)
- TCP backlog tuning (somaxconn, tcp_max_syn_backlog)
- vm.overcommit_memory
- Linux network buffer tuning (tcp_rmem, tcp_wmem, rmem_max, wmem_max)
- NUMA (Non-Uniform Memory Access) with numactl
- systemd service files

## Sources Consulted
- Redis official documentation on latency and administration: https://redis.io/docs/management/optimization/latency/
- Redis source code default configuration (redis.conf comments on tcp-backlog 511)
- Linux kernel documentation on vm.overcommit_memory: https://www.kernel.org/doc/Documentation/vm/overcommit-accounting
- Linux kernel documentation on Transparent Huge Pages: https://www.kernel.org/doc/Documentation/admin-guide/mm/transhuge.rst
- Linux sysctl documentation for net.core and net.ipv4 parameters
- numactl man page for --interleave flag
- systemd.service man page for oneshot service type

## Issues Found

1. **systemd service creation command missing sudo**: The command `cat > /etc/systemd/system/disable-thp.service` would fail with "Permission denied" for non-root users because `/etc/systemd/system/` is root-owned. Changed to `sudo tee /etc/systemd/system/disable-thp.service` which correctly elevates privileges for writing the file, consistent with the `sudo` usage elsewhere in the post.

2. **Persist section missing tcp_rmem and tcp_wmem**: The "Persist All Settings" section stated "Add all tuning parameters to `/etc/sysctl.conf`" but omitted `net.ipv4.tcp_rmem` and `net.ipv4.tcp_wmem` which were introduced in the "Tune Network Buffer Sizes" section. Added both parameters to make the persist section complete and consistent with the rest of the post.

## Review Notes
- The `tcp-backlog 511` shown in redis.conf is the Redis default value. The post presents it in the context of the kernel needing to support this backlog size (via somaxconn). For very high connection rate scenarios, users may want to increase tcp-backlog beyond 511 as well, but showing the default is not incorrect.
- The `vm.overcommit_memory=1` setting means "always overcommit." This is the standard Redis recommendation, though Redis 7.x documentation notes that value `2` with a sufficient `vm.overcommit_ratio` can also work. The advice in the post is correct and matches the most common recommendation.
- Redis 7.x changed its log output format, so the exact warning messages shown may look slightly different on newer versions, but the content and fixes remain accurate.
- The numactl approach is correct but only applies at Redis startup. An alternative is to set the NUMA policy system-wide or use systemd's `NumaPolicy=interleave` directive in the Redis service unit, which may be more maintainable.
