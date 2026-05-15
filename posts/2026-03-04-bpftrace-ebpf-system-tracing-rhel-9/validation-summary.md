# Validation Summary: How to Use bpftrace and eBPF for System Tracing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- bpftrace
- eBPF
- Linux tracepoints
- kprobes and uprobes
- Linux performance tracing

## Sources Consulted
- Red Hat Enterprise Linux documentation, "Using the bpftrace package": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_monitoring_and_updating_the_kernel/index#analyzing-system-performance-with-ebpf
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- bpftrace 0.22 reference documentation: https://bpftrace.org/docs/0.22
- bpftrace one-liner tutorial: https://bpftrace.org/tutorial-one-liners
- bpftrace official one-liners: https://bpftrace.org/one-liners
- bpftrace v0.20.2 official `biolatency.bt` tool source: https://raw.githubusercontent.com/bpftrace/bpftrace/v0.20.2/tools/biolatency.bt
- Linux kernel tracing event documentation: https://www.kernel.org/doc/html/v6.6/trace/events.html

## Issues Found
- The disk I/O latency examples used `kprobe:blk_account_io_start` and `kprobe:blk_account_io_done` directly. Those are kernel-internal function probes and are less stable across kernel versions than tracepoints. I changed the examples to use the tracepoint-based form from the official bpftrace `biolatency.bt` tool: `tracepoint:block:block_bio_queue`, `tracepoint:block:block_rq_complete`, and `tracepoint:block:block_bio_complete`.
- The conclusion said minimal overhead makes bpftrace safe for production use. That was too absolute for high-frequency probes. I changed it to state that bpftrace typically has low overhead, but high-frequency probes should be tested before sustained production use.

## Review Notes
The basic installation command, `bpftrace -e` usage, probe listing with `-l`, tracepoint argument access through `args`, common built-in variables, and common map functions match bpftrace and Red Hat documentation. Some examples remain environment-dependent: kernel symbols, tracepoints, Apache symbols, and library paths can vary by RHEL minor release, installed packages, architecture, and debug symbol availability.
