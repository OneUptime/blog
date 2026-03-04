# How to Use bpftrace and eBPF for System Tracing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, bpftrace, eBPF, Tracing, Performance, Linux, Debugging

Description: Learn how to use bpftrace on RHEL to write eBPF-based tracing scripts for system analysis and troubleshooting.

---

bpftrace is a high-level tracing language for eBPF (extended Berkeley Packet Filter) on RHEL. It lets you write one-liner and script-based probes that attach to kernel functions, tracepoints, and user-space probes with minimal overhead.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access

## Installing bpftrace

```bash
sudo dnf install bpftrace -y
```

Verify the installation:

```bash
bpftrace --version
```

## Basic bpftrace Concepts

bpftrace programs consist of probes and actions:

```bash
probe /filter/ { action }
```

Probe types include:

- `kprobe` / `kretprobe` - Kernel function entry/return
- `tracepoint` - Static kernel tracepoints
- `uprobe` / `uretprobe` - User-space function entry/return
- `software` - Software events (cpu-clock, page-faults)
- `hardware` - Hardware events (cache-misses, instructions)
- `profile` - Timed sampling
- `interval` - Periodic actions
- `BEGIN` / `END` - Program start/end

## One-Liner Examples

### Trace New Processes

```bash
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s called %s\n", comm, str(args.filename)); }'
```

### Count System Calls by Process

```bash
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
```

Press Ctrl+C to see results.

### Trace File Opens

```bash
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s opened %s\n", comm, str(args.filename)); }'
```

### Histogram of Read Sizes

```bash
sudo bpftrace -e 'tracepoint:syscalls:sys_exit_read /args.ret > 0/ { @bytes = hist(args.ret); }'
```

### Monitor Disk I/O Latency

```bash
sudo bpftrace -e '
kprobe:blk_account_io_start { @start[arg0] = nsecs; }
kprobe:blk_account_io_done /@start[arg0]/ {
    @usecs = hist((nsecs - @start[arg0]) / 1000);
    delete(@start[arg0]);
}'
```

### Count Kernel Function Calls

```bash
sudo bpftrace -e 'kprobe:tcp_sendmsg { @[comm] = count(); }'
```

## Writing bpftrace Scripts

Create a file `iolatency.bt`:

```bash
cat > /tmp/iolatency.bt << 'BT'
#!/usr/bin/env bpftrace

BEGIN
{
    printf("Tracing block I/O latency... Hit Ctrl-C to end.\n");
}

kprobe:blk_account_io_start
{
    @start[arg0] = nsecs;
}

kprobe:blk_account_io_done
/@start[arg0]/
{
    @usecs = hist((nsecs - @start[arg0]) / 1000);
    delete(@start[arg0]);
}

END
{
    printf("\nI/O Latency Distribution (microseconds):\n");
}
BT
```

Run the script:

```bash
sudo bpftrace /tmp/iolatency.bt
```

## Tracing User-Space Applications

Trace a function in a compiled application:

```bash
sudo bpftrace -e 'uprobe:/usr/sbin/httpd:ap_process_request { @[comm] = count(); }'
```

Trace a library function:

```bash
sudo bpftrace -e 'uprobe:/lib64/libc.so.6:malloc { @bytes = hist(arg0); }'
```

## Listing Available Probes

List tracepoints:

```bash
sudo bpftrace -l 'tracepoint:*'
```

List kernel probes matching a pattern:

```bash
sudo bpftrace -l 'kprobe:tcp_*'
```

List user-space probes for a binary:

```bash
sudo bpftrace -l 'uprobe:/usr/sbin/httpd:*'
```

## Built-In Variables

- `comm` - Current process name
- `pid` - Process ID
- `tid` - Thread ID
- `uid` - User ID
- `nsecs` - Nanosecond timestamp
- `cpu` - CPU number
- `curtask` - Current task_struct pointer
- `args` - Tracepoint arguments

## Built-In Functions

- `count()` - Count events
- `hist(value)` - Power-of-2 histogram
- `lhist(value, min, max, step)` - Linear histogram
- `sum(value)` - Sum values
- `avg(value)` - Average values
- `min(value)` / `max(value)` - Min/max
- `printf()` - Formatted output
- `str(ptr)` - Read string from pointer
- `kstack` / `ustack` - Kernel/user stack trace

## Conclusion

bpftrace on RHEL provides a powerful and concise way to write eBPF tracing programs. Use one-liners for quick investigations and scripts for complex analysis. The minimal overhead makes bpftrace safe for production use.
