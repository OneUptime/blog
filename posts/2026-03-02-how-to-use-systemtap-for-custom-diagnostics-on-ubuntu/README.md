# How to Use SystemTap for Custom Diagnostics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SystemTap, Kernel, Debugging, Performance

Description: Learn how to use SystemTap on Ubuntu to write custom diagnostic scripts that probe kernel and user-space functions in real time for advanced troubleshooting and performance analysis.

---

SystemTap provides a scripting language for dynamically instrumenting a running Linux kernel and user-space applications. Unlike `strace` or `perf`, which have fixed observation capabilities, SystemTap lets you write scripts that insert probes at arbitrary kernel and user-space locations, collect custom metrics, and aggregate data - all without modifying source code or recompiling. It is a powerful tool for diagnosing production issues that are too complex for standard tools.

## Prerequisites

- Ubuntu 22.04 or newer
- Kernel debug information packages (dbgsym)
- Root access
- Basic scripting knowledge

## Installing SystemTap

```bash
# Install SystemTap and dependencies
sudo apt update
sudo apt install -y systemtap systemtap-runtime

# Install kernel build dependencies
sudo apt install -y linux-headers-$(uname -r)

# Verify installation
stap --version
```

## Installing Kernel Debug Symbols

SystemTap needs kernel debug symbols to resolve function names and variable locations:

```bash
# Add the Ubuntu debug symbols repository
echo "deb http://ddebs.ubuntu.com $(lsb_release -cs) main restricted universe multiverse
deb http://ddebs.ubuntu.com $(lsb_release -cs)-updates main restricted universe multiverse" \
  | sudo tee /etc/apt/sources.list.d/ddebs.list

# Add the debug symbols signing key
sudo apt install -y ubuntu-dbgsym-keyring

sudo apt update

# Install kernel debug symbols for the running kernel
sudo apt install -y linux-image-$(uname -r)-dbgsym

# This package is large (several GB) - allow time for download
# Verify it installed correctly
ls /usr/lib/debug/boot/
```

## Your First SystemTap Script

SystemTap scripts have a `.stp` extension and use a C-like syntax:

```stap
# hello.stp - Basic SystemTap script
# Run with: sudo stap hello.stp

probe begin {
    printf("SystemTap is working!\n")
    exit()
}
```

```bash
# Run the script
sudo stap hello.stp
```

## SystemTap Script Structure

```stap
# Script structure overview

# Probe declaration: probe <probe_point> { actions }
probe begin {
    # Runs when the script starts
}

probe end {
    # Runs when the script exits
}

probe kernel.function("tcp_sendmsg") {
    # Runs each time tcp_sendmsg is called in the kernel
    printf("TCP send: pid=%d comm=%s bytes=%d\n", pid(), execname(), $size)
}

probe timer.ms(1000) {
    # Runs every 1000 milliseconds
    printf("Heartbeat\n")
}
```

## Network Diagnostics with SystemTap

### Monitoring TCP Connections

```stap
# tcp-connections.stp - Track new TCP connections
# Usage: sudo stap tcp-connections.stp

probe kernel.function("tcp_v4_connect") {
    printf("[%s] New TCP connect: pid=%d comm=%s\n",
        ctime(gettimeofday_s()),
        pid(),
        execname())
}

probe kernel.function("inet_csk_accept").return {
    if ($return) {
        # Get details from the accepted socket
        local_port = ntohs($return->__sk_common->skc_num)
        printf("[%s] Accept on port %d: pid=%d comm=%s\n",
            ctime(gettimeofday_s()),
            local_port,
            pid(),
            execname())
    }
}
```

```bash
sudo stap tcp-connections.stp
```

### Measuring TCP Send Latency

```stap
# tcp-send-latency.stp - Measure time spent in tcp_sendmsg
# Usage: sudo stap tcp-send-latency.stp

global start_times, latencies

probe kernel.function("tcp_sendmsg") {
    # Record the start time indexed by thread ID
    start_times[tid()] = gettimeofday_us()
}

probe kernel.function("tcp_sendmsg").return {
    start = start_times[tid()]
    if (start) {
        latency_us = gettimeofday_us() - start
        latencies <<< latency_us   # Add to statistical aggregator
        delete start_times[tid()]
    }
}

probe timer.s(10) {
    printf("TCP sendmsg latency over last 10 seconds:\n")
    printf("  Count: %d\n", @count(latencies))
    printf("  Average: %d us\n", @avg(latencies))
    printf("  Min: %d us\n", @min(latencies))
    printf("  Max: %d us\n", @max(latencies))
    printf("  Histogram:\n")
    print(@hist_log(latencies))
    delete latencies
}

probe end {
    printf("Done.\n")
}
```

```bash
sudo stap tcp-send-latency.stp
```

### Tracking Which Processes Send the Most Data

```stap
# network-top.stp - Show top processes by network send volume
# Usage: sudo stap network-top.stp

global bytes_sent_by_process

probe kernel.function("tcp_sendmsg") {
    # $size is the number of bytes being sent
    bytes_sent_by_process[pid(), execname()] += $size
}

probe timer.s(5) {
    printf("\n=== Top processes by network send (last 5s) ===\n")
    printf("%-10s %-20s %-15s\n", "PID", "COMMAND", "BYTES SENT")

    # Print sorted by bytes (descending)
    foreach ([pid_val, comm_val] in bytes_sent_by_process- limit 10) {
        printf("%-10d %-20s %-15d\n",
            pid_val, comm_val, bytes_sent_by_process[pid_val, comm_val])
    }

    delete bytes_sent_by_process
}
```

### Detecting Packet Drops

```stap
# packet-drops.stp - Monitor packet drops in the kernel
# Usage: sudo stap packet-drops.stp

probe kernel.function("kfree_skb") {
    # This function is called when a packet is dropped
    reason = $reason    # Drop reason
    printf("Packet dropped: pid=%d comm=%s reason=%d\n",
        pid(), execname(), reason)
}

probe timer.s(1) {
    # Periodic status marker
    printf("--- 1 second elapsed ---\n")
}
```

## User-Space Probing

SystemTap can probe user-space functions in applications:

```stap
# probe-nginx.stp - Probe nginx to log request processing time
# Requires nginx compiled with debug info

probe process("/usr/sbin/nginx").function("ngx_http_process_request") {
    start_time[tid()] = gettimeofday_us()
}

probe process("/usr/sbin/nginx").function("ngx_http_finalize_request") {
    start = start_time[tid()]
    if (start) {
        elapsed = gettimeofday_us() - start
        printf("Request completed in %d us\n", elapsed)
        delete start_time[tid()]
    }
}
```

```bash
sudo stap -d /usr/sbin/nginx probe-nginx.stp
```

## Statistical Aggregation

SystemTap's `<<<` operator and `@` statistics functions are key for performance analysis:

```stap
# syscall-latency.stp - Measure latency of all network system calls
# Usage: sudo stap syscall-latency.stp

global syscall_start, syscall_latency

# Probe the entry of network system calls
probe syscall.send,
      syscall.sendto,
      syscall.sendmsg,
      syscall.recv,
      syscall.recvfrom,
      syscall.recvmsg {
    syscall_start[tid()] = gettimeofday_ns()
}

# Probe the return of network system calls
probe syscall.send.return,
      syscall.sendto.return,
      syscall.sendmsg.return,
      syscall.recv.return,
      syscall.recvfrom.return,
      syscall.recvmsg.return {
    start = syscall_start[tid()]
    if (start) {
        latency_ns = gettimeofday_ns() - start
        syscall_latency[pn()] <<< latency_ns    # pn() = probe name
        delete syscall_start[tid()]
    }
}

probe timer.s(10) {
    foreach (sc in syscall_latency) {
        printf("\n%s:\n", sc)
        printf("  Calls: %d\n", @count(syscall_latency[sc]))
        printf("  Avg latency: %d ns\n", @avg(syscall_latency[sc]))
        printf("  Max latency: %d ns\n", @max(syscall_latency[sc]))
    }
    delete syscall_latency
    exit()
}
```

## Running SystemTap Scripts

```bash
# Run a script interactively
sudo stap my-script.stp

# Run for a fixed time (5 seconds)
sudo stap -T 5 my-script.stp

# Run with verbose output for debugging the script itself
sudo stap -v my-script.stp

# Compile without running (check for errors)
sudo stap -p4 my-script.stp

# Run targeting a specific PID
sudo stap -x <PID> my-script.stp

# Pass command-line arguments to the script
sudo stap my-script.stp <ARG1> <ARG2>
```

## Troubleshooting SystemTap

### Compilation Errors

```bash
# Check if debug symbols are installed
ls /usr/lib/debug/boot/vmlinux-$(uname -r)

# If missing, reinstall debug symbols
sudo apt install --reinstall linux-image-$(uname -r)-dbgsym

# Test with a simple probe
sudo stap -e 'probe begin { printf("OK\n"); exit() }'
```

### Missing Kernel Functions

```bash
# Check if a function exists in the kernel
# Note: some functions get inlined by the compiler and are not probeable
sudo stap -e 'probe kernel.function("tcp_sendmsg") { exit() }' 2>&1

# List available probes related to network
sudo stap -l 'kernel.function("tcp_*")' 2>&1 | head -20

# Try probing at the system call level instead
sudo stap -l 'syscall.send*' 2>&1
```

### Performance Impact

```bash
# Test the overhead of your script before deploying to production
# Run with timing info
sudo stap -t my-script.stp

# Estimate overhead with a CPU benchmark
sysbench cpu run &
sudo stap -c "sysbench cpu run" my-script.stp
# Compare benchmark results with and without stap
```

## Practical Use Case: Finding Slow Network Calls in Production

```bash
# Step 1: Run this script during an incident to find what's slow
sudo tee /tmp/find-slow-sockets.stp > /dev/null <<'EOF'
# Find all socket operations taking longer than 100ms

global start_time

probe syscall.connect {
    start_time[tid()] = gettimeofday_ms()
}

probe syscall.connect.return {
    start = start_time[tid()]
    if (start) {
        elapsed = gettimeofday_ms() - start
        if (elapsed > 100) {   # Alert on operations > 100ms
            printf("SLOW connect: pid=%d comm=%s elapsed=%dms\n",
                pid(), execname(), elapsed)
            print_ubacktrace()  # Show where in the code this came from
        }
        delete start_time[tid()]
    }
}
EOF

sudo stap /tmp/find-slow-sockets.stp
```

SystemTap requires more setup than simpler tools like strace or perf, but it provides capabilities no other tool can match: the ability to write arbitrary diagnostic logic that runs in the kernel, with access to kernel data structures, aggregation functions, and user-space context all in a single script. For complex production problems where standard tools do not give enough detail, SystemTap is the right tool.
