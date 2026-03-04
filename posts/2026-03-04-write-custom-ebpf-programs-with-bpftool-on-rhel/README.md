# How to Write Custom eBPF Programs with bpftool on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, eBPF, bpftool, Kernel, Tracing

Description: Use bpftool on RHEL to load, inspect, and manage eBPF programs for custom kernel tracing, networking, and security use cases.

---

eBPF (extended Berkeley Packet Filter) lets you run sandboxed programs inside the Linux kernel without modifying kernel source code. bpftool is the primary command-line utility for inspecting and managing eBPF programs and maps on RHEL.

## Install bpftool and Dependencies

```bash
# Install bpftool and development headers
sudo dnf install -y bpftool libbpf-devel clang llvm \
    kernel-devel kernel-headers

# Verify bpftool
bpftool version
```

## Inspect Loaded eBPF Programs

```bash
# List all loaded eBPF programs
sudo bpftool prog list

# Show detailed info about a specific program
sudo bpftool prog show id 42

# Dump the translated eBPF bytecode
sudo bpftool prog dump xlated id 42

# Dump the JIT-compiled machine code
sudo bpftool prog dump jited id 42
```

## Inspect eBPF Maps

```bash
# List all eBPF maps
sudo bpftool map list

# Show entries in a specific map
sudo bpftool map dump id 5

# Look up a key in a map
sudo bpftool map lookup id 5 key 0x01 0x00 0x00 0x00
```

## Write a Simple eBPF Program

Create a minimal eBPF program that traces system calls:

```c
/* trace_open.bpf.c - traces open() syscalls */
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

/* Define a tracepoint program that fires on sys_enter_openat */
SEC("tracepoint/syscalls/sys_enter_openat")
int trace_openat(struct trace_event_raw_sys_enter *ctx)
{
    /* Get the PID and TID of the calling process */
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = pid_tgid >> 32;

    /* Print the PID to the trace pipe */
    bpf_printk("openat called by PID: %d\n", pid);
    return 0;
}

/* Required license declaration */
char LICENSE[] SEC("license") = "GPL";
```

## Compile the eBPF Program

```bash
# Compile to eBPF bytecode
clang -O2 -target bpf -D__TARGET_ARCH_x86 \
    -I/usr/include/x86_64-linux-gnu \
    -c trace_open.bpf.c -o trace_open.bpf.o

# Verify the compiled object
llvm-objdump -d trace_open.bpf.o
```

## Load and Attach with bpftool

```bash
# Load the program
sudo bpftool prog load trace_open.bpf.o /sys/fs/bpf/trace_open

# Verify it is loaded
sudo bpftool prog list

# Attach to the tracepoint
sudo bpftool prog attach pinned /sys/fs/bpf/trace_open tracepoint syscalls sys_enter_openat
```

## View Output

```bash
# Read the trace pipe for bpf_printk output
sudo cat /sys/kernel/debug/tracing/trace_pipe
```

## Pin and Manage Programs

```bash
# Pin a program to the BPF filesystem
sudo bpftool prog pin id 42 /sys/fs/bpf/my_prog

# List pinned programs
ls /sys/fs/bpf/

# Unpin (unload) a program
sudo rm /sys/fs/bpf/trace_open
```

## Generate Skeleton Code

bpftool can generate a C skeleton for easier program loading:

```bash
# Generate a skeleton header from the compiled object
bpftool gen skeleton trace_open.bpf.o > trace_open.skel.h
```

## Feature Detection

```bash
# Check which eBPF features your kernel supports
sudo bpftool feature probe kernel
```

bpftool gives you full control over eBPF programs on RHEL, from inspection to loading custom programs for tracing, networking, and security enforcement.
