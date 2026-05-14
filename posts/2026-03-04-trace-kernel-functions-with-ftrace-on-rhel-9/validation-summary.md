# Validation Summary: How to Trace Kernel Functions with ftrace on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel ftrace
- debugfs and tracefs tracing files
- Linux shell commands

## Sources Consulted
- Linux kernel documentation: ftrace - Function Tracer: https://docs.kernel.org/trace/ftrace.html
- Red Hat documentation: Tracing latencies using ftrace, Optimizing RHEL 9 for Real Time: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/assembly_using-the-ftrace-utility-to-trace-latencies_optimizing-rhel9-for-real-time-for-low-latency-operation
- Local util-linux `mount` man page for `mount -t` syntax and debugfs mounting behavior.
- Local `systemctl` and `journalctl` help output to verify the placeholder service commands were syntactically valid but not applicable to ftrace.

## Issues Found
- The post described ftrace setup as a service configuration workflow. ftrace is controlled through tracing files under `/sys/kernel/debug/tracing` on RHEL documentation and through tracefs/debugfs in the upstream kernel documentation, not through a named systemd service. I changed the service-oriented section to review the active tracer, function filter, and captured trace output.
- The verification section checked `systemctl status` and `journalctl` for a placeholder service. That would not verify or clean up an ftrace session. I replaced it with commands to confirm tracing is stopped, return to the `nop` tracer, clear the function filter, and clear the trace buffer.
- The troubleshooting section referenced service logs and package checks with placeholders. I replaced those with ftrace-specific checks for a missing tracing directory, unmatched function names, and shell expansion of wildcard filters.
- The conclusion referred to monitoring a service and logs. I updated it to remind readers to disable tracing and reset filters after use, which matches ftrace behavior and avoids unnecessary overhead.

## Review Notes
The primary tracing commands are technically valid for RHEL's documented `/sys/kernel/debug/tracing` path. Upstream Linux documentation now describes `/sys/kernel/tracing` as the tracefs mount point and notes `/sys/kernel/debug/tracing` is maintained for backward compatibility when debugfs is mounted; the RHEL 9 documentation still uses `/sys/kernel/debug/tracing`, so the post's path is acceptable for the stated platform.
