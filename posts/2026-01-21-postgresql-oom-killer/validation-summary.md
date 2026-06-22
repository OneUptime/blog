# Validation Summary: How to Fix PostgreSQL OOM Killer Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL
- Linux OOM killer
- systemd service configuration
- Linux virtual memory overcommit settings
- Linux swap configuration
- PostgreSQL memory monitoring

## Sources Consulted
- PostgreSQL official documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL official documentation: pg_backend_memory_contexts - https://www.postgresql.org/docs/current/view-pg-backend-memory-contexts.html
- PostgreSQL official documentation: System Administration Functions - https://www.postgresql.org/docs/current/functions-admin.html
- systemd.exec official manual: OOMScoreAdjust - https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Linux kernel documentation: Overcommit Accounting - https://www.kernel.org/doc/Documentation/vm/overcommit-accounting
- Linux man-pages: proc_sys_vm(5) - https://man7.org/linux/man-pages/man5/proc_sys_vm.5.html
- Local Linux man pages and command help for pgrep(1), proc_pid_oom_score_adj(5), sysctl(8), free(1), vmstat(8), fallocate(1), mkswap(8), and swapon(8)

## Issues Found
- The original `/proc/$(pgrep -f "postgres:.*main")/oom_score_adj` command was fragile: it could fail if `pgrep` returned zero or multiple PIDs, and shell redirection would not be elevated by `sudo` if users added it only before `echo`. Changed it to loop over PostgreSQL process IDs with `pgrep -u postgres -x postgres` and write through `sudo tee`.
- The systemd OOM adjustment example did not mention reloading systemd or restarting PostgreSQL, so the permanent drop-in would not take effect immediately. Added `systemctl daemon-reload` and `systemctl restart postgresql`.
- The memory formula was presented as total PostgreSQL memory, but PostgreSQL memory use is workload-dependent: `work_mem` is per operation and can be used multiple times per query, and autovacuum uses `autovacuum_work_mem` when configured or `maintenance_work_mem` otherwise. Reworded it as a worst-case estimate and adjusted the formula accordingly.
- The overcommit commands wrote directly to `/proc` and `/etc/sysctl.conf` without root-safe redirection. Changed them to use `sudo tee`, a dedicated `/etc/sysctl.d/99-postgresql-memory.conf` file, and `sudo sysctl --system`.
- The SQL query labeled "PostgreSQL memory usage" measured database and relation storage size, not memory usage. Replaced it with queries using `pg_backend_memory_contexts` and `pg_log_backend_memory_contexts`, which are PostgreSQL-supported memory inspection tools.

## Review Notes
The guide is now technically valid as a general Linux/PostgreSQL troubleshooting guide. `OOMScoreAdjust=-1000` can prevent PostgreSQL from being selected by the OOM killer, but operators should use it carefully because the kernel must still reclaim memory from some process when the system is exhausted. The exact systemd unit name for PostgreSQL varies by distribution and packaging.
