# Validation Summary: How to Fix 'Cannot Allocate Memory' Errors in Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux memory management
- procfs and sysctl VM settings
- OOM killer and `oom_score_adj`
- Swap management
- systemd resource controls
- cgroups v2
- Bash and Linux command-line tools
- Prometheus Node Exporter alerting
- Redis and MongoDB memory-related tuning

## Sources Consulted
- Linux kernel documentation for `/proc/sys/vm`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux man-pages for `/proc/pid/oom_score_adj`: https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html
- Linux man-pages for `/proc/sys/vm`: https://man7.org/linux/man-pages/man5/proc_sys_vm.5.html
- procps-ng `free(1)` manual: https://man7.org/linux/man-pages/man1/free.1.html
- systemd resource control documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd execution environment documentation for `OOMScoreAdjust`: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- Linux-PAM `limits.conf(5)` documentation: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Redis latency and administration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/ and https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- MongoDB Transparent Huge Pages documentation: https://www.mongodb.com/docs/manual/tutorial/disable-transparent-huge-pages/
- Prometheus Node Exporter documentation: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The post described `MemAvailable` as simply free plus reclaimable cache/buffers. Updated it to match `free(1)` and kernel semantics: it is an estimate for starting new applications without swapping, taking page cache and reclaimable slab behavior into account.
- The process inspection examples used `$(pgrep myapp)` directly inside `/proc/.../smaps`, which breaks when multiple PIDs match. Changed the examples to select one PID with `pgrep -n` and quote the PID variable.
- The OOM protection examples used `$(pgrep ...)` directly in `/proc/.../oom_score_adj`, which can also break with multiple matching PIDs. Changed them to use a single PID variable.
- The OOM killer section incorrectly used `vm.overcommit_memory=1` as system-wide OOM killer behavior tuning. Replaced it with `vm.oom_kill_allocating_task=1`, which is the documented sysctl for changing OOM victim selection behavior.
- The `ulimit -m` example did not note that RSS limits are ignored on modern Linux. Added the Linux 2.4.30+ caveat from `limits.conf(5)`.
- The cgroup example used cgroup v1 paths and `cgcreate`. Updated it to cgroup v2 with `memory.max`, `cgroup.procs`, and enabling the memory controller through `cgroup.subtree_control`.

## Review Notes
The remaining commands and configuration snippets are technically sound as general Linux administration examples. Some thresholds and tuning values, such as memory alert percentages, swappiness, `vfs_cache_pressure`, and compaction proactiveness, remain workload-dependent and should be validated in production environments before broad use.
