# How to Use bpftrace for System Tracing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bpftrace, EBPF, Performance, Observability

Description: A practical guide to using bpftrace for system tracing on Ubuntu, covering one-liners, custom scripts, probes, and real-world performance analysis scenarios.

---

bpftrace is a high-level tracing language built on Linux's eBPF infrastructure. It lets you attach small programs to virtually any point in the kernel or userspace without modifying source code or rebooting. If you need to understand what a process is doing, which system calls are slow, or what files are being read, bpftrace can answer those questions in seconds. This guide covers installation, the bpftrace language, and practical tracing scenarios.

## Installing bpftrace

```bash
# Install from Ubuntu repositories (Ubuntu 20.04+)
sudo apt update
sudo apt install bpftrace

# Verify installation
bpftrace --version

# Check kernel support for eBPF
uname -r  # Need 4.9+ for basic eBPF, 5.x+ for full bpftrace features

# List available probes (this is a long list)
sudo bpftrace -l | head -50

# List probes matching a pattern
sudo bpftrace -l 'tracepoint:syscalls:*open*'
sudo bpftrace -l 'kprobe:tcp_*'
```

## Understanding Probe Types

bpftrace supports several probe types:

```text
kprobe:function      - Kernel function entry point
kretprobe:function   - Kernel function return
tracepoint:cat:name  - Kernel tracepoints (more stable API than kprobes)
uprobe:path:function - Userspace function entry
uretprobe:path:func  - Userspace function return
usdt:path:probe      - Userspace statically defined tracepoints
profile:hz:rate      - CPU sampling at a fixed rate
interval:s:seconds   - Fires every N seconds
BEGIN                - Runs once at script start
END                  - Runs once at script end
```

## Essential One-Liners

One-liners are the quickest way to answer specific questions:

```bash
# Count system calls by process name (for 5 seconds, then Ctrl+C)
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Trace file opens - show what files processes are opening
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args->filename)); }'

# Show the top 10 processes by CPU time (sample every 10ms)
sudo bpftrace -e 'profile:hz:99 { @[comm] = count(); } interval:s:5 { print(@); clear(@); exit(); }'

# Trace write() calls - show process name and bytes written
sudo bpftrace -e 'tracepoint:syscalls:sys_exit_write /args->ret > 0/ { @[comm] = sum(args->ret); }'

# Show which processes are reading from disk (not cache)
sudo bpftrace -e 'kprobe:blk_account_io_start { @[comm] = count(); }'

# Trace TCP connections being established
sudo bpftrace -e 'kprobe:tcp_connect { printf("TCP connect: %s\n", comm); }'

# Show all exec() calls - what processes are being spawned
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("exec: %s -> %s\n", comm, str(args->filename)); }'

# Count DNS queries by PID (queries hitting the network)
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_sendto /args->dest_len == 16/ { @[comm, pid] = count(); }'
```

## Writing bpftrace Scripts

For more complex analysis, write a `.bt` script file:

```bash
# File: syscall-latency.bt
# Measure latency of read() system calls per process
```

```text
#!/usr/bin/env bpftrace

BEGIN {
    printf("Measuring read() latency. Hit Ctrl+C to show results.\n");
}

tracepoint:syscalls:sys_enter_read {
    @start[tid] = nsecs;  // Record start time indexed by thread ID
}

tracepoint:syscalls:sys_exit_read
/@start[tid]/  // Only process if we recorded a start time
{
    // Calculate latency in microseconds
    @latency_us[comm] = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);  // Clean up the start time entry
}

END {
    printf("\nread() latency distribution by process (microseconds):\n");
    print(@latency_us);
}
```

Run it:

```bash
sudo bpftrace syscall-latency.bt
```

## Tracing Disk I/O

```text
#!/usr/bin/env bpftrace
// File: disk-io.bt
// Trace disk I/O latency and size

BEGIN {
    printf("Tracing disk I/O... Hit Ctrl+C to end.\n");
}

// Track start time when I/O is submitted
tracepoint:block:block_rq_insert {
    @start[args->dev, args->sector] = nsecs;
}

// When I/O completes, calculate latency
tracepoint:block:block_rq_complete
/@start[args->dev, args->sector]/
{
    $latency = (nsecs - @start[args->dev, args->sector]) / 1000000; // ms
    @latency_ms = hist($latency);
    @bytes = hist(args->nr_sector * 512);
    delete(@start[args->dev, args->sector]);
}

interval:s:10 {
    printf("\n--- 10 second summary ---\n");
    printf("Latency distribution (ms):\n");
    print(@latency_ms);
    printf("I/O size distribution (bytes):\n");
    print(@bytes);
    clear(@latency_ms);
    clear(@bytes);
}
```

## Tracing Network Activity

```text
#!/usr/bin/env bpftrace
// File: tcp-connections.bt
// Show TCP connections being made

#include <linux/socket.h>
#include <net/sock.h>

kprobe:tcp_connect {
    $sk = (struct sock *)arg0;
    printf("TCP connect: PID %d (%s) -> %s:%d\n",
        pid,
        comm,
        ntop(AF_INET, $sk->__sk_common.skc_daddr),
        $sk->__sk_common.skc_dport >> 8 | ($sk->__sk_common.skc_dport & 0xff) << 8
    );
}

kprobe:tcp_close {
    printf("TCP close: PID %d (%s)\n", pid, comm);
}
```

## CPU Flame Graph Generation

bpftrace can collect stack traces for generating flame graphs:

```bash
# Collect CPU stack traces for 30 seconds at 99Hz sampling rate
sudo bpftrace -e 'profile:hz:99 { @[kstack, ustack, comm] = count(); }' \
  > /tmp/out.txt \
  & sleep 30 && kill $!

# Download and use FlameGraph tools
git clone https://github.com/brendangregg/FlameGraph.git
cd FlameGraph

# Convert bpftrace output to flame graph
# The bpftrace output needs reformatting first
bpftrace -e 'profile:hz:99 { @[kstack] = count(); }' > /tmp/stacks.txt
./stackcollapse-bpftrace.pl /tmp/stacks.txt | ./flamegraph.pl > /tmp/flamegraph.svg
```

## Tracing Userspace Applications

You can trace functions in running applications with uprobes:

```bash
# Find available probe points in a binary
sudo bpftrace -l 'uprobe:/usr/bin/python3:*' 2>/dev/null | head -20

# Trace calls to malloc in a process
sudo bpftrace -e 'uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc { @allocs[comm] = count(); }'

# Trace a specific function with arguments
# Trace open() in libc (matches any process using libc)
sudo bpftrace -e '
uprobe:/lib/x86_64-linux-gnu/libc.so.6:open {
    printf("open: %s -> %s\n", comm, str(arg0));
}'

# Trace only a specific process by PID
sudo bpftrace -e '
uprobe:/usr/bin/nginx:ngx_event_accept
/pid == 12345/
{
    printf("nginx accepted connection in PID %d\n", pid);
}'
```

## Memory Leak Detection

```text
#!/usr/bin/env bpftrace
// File: malloc-track.bt
// Track allocations without matching frees (potential leaks)
// Attach to a specific PID

uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc
/pid == $1/  // $1 is first argument passed to bpftrace
{
    @alloc_sizes[tid, retval] = arg0;  // Store size at (tid, return addr)
}

uretprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc
/pid == $1/
{
    @allocations[retval] = @alloc_sizes[tid, retval];
    delete(@alloc_sizes[tid, retval]);
}

uprobe:/lib/x86_64-linux-gnu/libc.so.6:free
/pid == $1/
{
    delete(@allocations[arg0]);  // Remove when freed
}

interval:s:30 {
    printf("\nUnfreed allocations:\n");
    print(@allocations);
}
```

Run with a PID:

```bash
sudo bpftrace malloc-track.bt 12345
```

## Security Monitoring with bpftrace

```text
#!/usr/bin/env bpftrace
// File: security-monitor.bt
// Monitor for suspicious activity

// Alert on privilege escalation attempts
tracepoint:syscalls:sys_enter_setuid {
    printf("ALERT: setuid(%d) called by %s (PID %d)\n",
        args->uid, comm, pid);
}

// Track ptrace (debugging/injection)
tracepoint:syscalls:sys_enter_ptrace {
    printf("ALERT: ptrace called by %s (PID %d) on target PID %d\n",
        comm, pid, args->pid);
}

// Monitor /etc/passwd reads
tracepoint:syscalls:sys_enter_openat
/str(args->filename) == "/etc/passwd" || str(args->filename) == "/etc/shadow"/
{
    printf("ALERT: %s (PID %d) opened %s\n",
        comm, pid, str(args->filename));
}

// Track new process creation
tracepoint:syscalls:sys_enter_execve {
    printf("EXEC: %s spawned %s\n", comm, str(args->filename));
}
```

## Useful bpftrace Built-ins

```text
Variables available in bpftrace:
  pid         - Process ID
  tid         - Thread ID
  uid         - User ID
  gid         - Group ID
  comm        - Process name
  kstack      - Kernel stack trace
  ustack      - Userspace stack trace
  nsecs       - Current timestamp in nanoseconds
  elapsed     - Nanoseconds since bpftrace started
  cpu         - CPU number
  args        - Tracepoint arguments (structured)
  arg0..argN  - Probe arguments (kprobe/uprobe)
  retval      - Return value (kretprobe/uretprobe)

Functions:
  printf()    - Print formatted output
  hist()      - Log2 histogram
  lhist()     - Linear histogram
  count()     - Count occurrences
  sum()       - Sum values
  avg()       - Average values
  min()/max() - Min/max values
  str()       - Convert pointer to string
  ntop()      - Convert IP address to string
  delete()    - Delete a map entry
  clear()     - Clear a map
  print()     - Print a map
  exit()      - Exit the program
```

bpftrace is one of the most powerful tools available for Linux performance analysis and debugging. It requires no application changes and minimal overhead when not actively sampling.
