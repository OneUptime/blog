# Validation Summary: How to Fix 'OOM Killer' Memory Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux OOM killer and procfs
- Linux kernel virtual memory sysctls
- Swap files and util-linux tools
- systemd service OOM and resource controls
- cgroups
- Docker container memory limits
- Java and Node.js runtime memory options
- MySQL/MariaDB and PostgreSQL memory configuration

## Sources Consulted
- Linux man-pages: proc_pid_oom_score(5), https://man7.org/linux/man-pages/man5/proc_pid_oom_score.5.html
- Linux man-pages: proc_pid_oom_score_adj(5), https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html
- Linux man-pages: proc_sys_vm(5), https://man7.org/linux/man-pages/man5/proc_sys_vm.5.html
- Linux kernel documentation: Overcommit Accounting, https://docs.kernel.org/mm/overcommit-accounting.html
- systemd.service(5), https://man7.org/linux/man-pages/man5/systemd.service.5.html
- systemd.exec(5), https://man7.org/linux/man-pages/man5/systemd.exec.5.html
- systemd.resource-control(5), https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html
- Docker documentation: Resource constraints, https://docs.docker.com/engine/containers/resource_constraints/
- util-linux man pages for swapon(8), mkswap(8), fallocate(1), and sysctl(8)
- Node.js CLI documentation, https://nodejs.org/api/cli.html
- Oracle Java command documentation, https://docs.oracle.com/en/java/javase/11/tools/java.html
- MySQL 8.4 Reference Manual: InnoDB startup configuration, https://dev.mysql.com/doc/refman/8.4/en/innodb-init-startup-configuration.html
- PostgreSQL documentation: Resource Consumption, https://www.postgresql.org/docs/current/runtime-config-resource.html

## Issues Found
- The OOM score factor list included process age and nice value as current selection factors. Linux man-pages document those as pre-Linux 2.6.36 factors, so the list was updated to describe current memory/swap use, constraint context, privileged process discount, and `oom_score_adj`.
- The systemd snippet described `OOMPolicy=continue` as disabling OOM killing for the service. systemd documents it as controlling how the unit behaves after an OOM kill, so the comment was corrected.
- The overcommit tuning section said strict overcommit "prevents OOM." Kernel documentation says it can reduce OOM risk by failing allocations earlier, but it is not an absolute guarantee, so the wording was corrected.
- The Node.js section stated a fixed default heap size of about 1.5 GB. Node/V8 defaults vary by version, platform, and available memory, so the comment was changed to avoid a stale fixed value.
- The cgroup example used cgroups v1 paths without identifying that version, and the redirected writes would fail under `sudo` unless the shell itself was privileged. The heading and comment now identify cgroups v1, and the writes use `sudo tee`.
- The systemd resource limit comment said `MemorySwapMax=0` kills the service if the memory limit is exceeded. systemd documents this setting as a swap limit, so the comment now says it disables swap for the service.
- The quick reference `pgrep` example could expand to multiple PIDs and form an invalid `/proc/.../oom_score` path. It now uses `pgrep -n` to select one matching process.

## Review Notes
The cgroups section intentionally remains a cgroups v1 example after correction. On modern distributions using cgroups v2, systemd resource controls such as `MemoryMax=` and `MemorySwapMax=` are usually the preferred interface.
