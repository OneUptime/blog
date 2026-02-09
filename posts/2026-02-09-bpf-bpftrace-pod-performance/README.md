# How to Implement BPF Tools Like bpftrace for Kubernetes Pod Performance Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, eBPF, Performance, Monitoring, bpftrace

Description: Master bpftrace and eBPF tools for analyzing Kubernetes pod performance with real-time system tracing, latency analysis, and resource monitoring.

---

BPF (Berkeley Packet Filter) and its modern evolution eBPF (extended BPF) have revolutionized system observability. When combined with bpftrace, these technologies provide unprecedented visibility into Kubernetes pod performance without requiring instrumentation or code changes.

## Understanding BPF and bpftrace

eBPF allows you to run sandboxed programs in the Linux kernel without changing kernel source code or loading kernel modules. bpftrace is a high-level tracing language built on top of eBPF that makes it easy to write powerful one-liners and scripts for performance analysis.

For Kubernetes environments, bpftrace excels at analyzing syscalls, network latency, disk I/O, CPU usage, and application-level events across all pods running on a node.

## Setting Up bpftrace on Kubernetes Nodes

First, ensure your nodes have the necessary kernel support. eBPF requires Linux kernel 4.9 or later, with 5.x recommended:

```bash
# Check kernel version
uname -r

# Verify BPF support
grep CONFIG_BPF /boot/config-$(uname -r)
```

Install bpftrace on your nodes:

```bash
# Ubuntu/Debian
apt-get update
apt-get install -y bpftrace linux-headers-$(uname -r)

# RHEL/CentOS
yum install -y bpftrace kernel-devel-$(uname -r)

# Verify installation
bpftrace --version
```

Alternatively, run bpftrace as a privileged DaemonSet for easier access:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: bpftrace
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: bpftrace
  template:
    metadata:
      labels:
        app: bpftrace
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: bpftrace
        image: quay.io/iovisor/bpftrace:latest
        command: ["/bin/bash"]
        args: ["-c", "sleep infinity"]
        securityContext:
          privileged: true
        volumeMounts:
        - name: sys
          mountPath: /sys
        - name: modules
          mountPath: /lib/modules
        - name: src
          mountPath: /usr/src
      volumes:
      - name: sys
        hostPath:
          path: /sys
      - name: modules
        hostPath:
          path: /lib/modules
      - name: src
        hostPath:
          path: /usr/src
```

## Tracing System Calls in Pods

Trace system calls to understand what your pods are doing at the kernel level:

```bash
# Find the container PID
CONTAINER_ID=$(crictl ps --name myapp -q)
PID=$(crictl inspect $CONTAINER_ID | jq -r '.info.pid')

# Trace all syscalls for that process
bpftrace -e "tracepoint:raw_syscalls:sys_enter /pid == $PID/ {
  @syscalls[args->id] = count();
}"

# Press Ctrl-C after collecting data to see results
```

More detailed syscall tracing with arguments:

```bash
# Trace file opens
bpftrace -e "tracepoint:syscalls:sys_enter_openat /pid == $PID/ {
  printf(\"%s opened %s\n\", comm, str(args->filename));
}"

# Trace network operations
bpftrace -e "
tracepoint:syscalls:sys_enter_sendto /pid == $PID/ {
  @send_bytes = hist(args->len);
}
tracepoint:syscalls:sys_enter_recvfrom /pid == $PID/ {
  @recv_bytes = hist(args->size);
}
"
```

## Measuring Network Latency

Analyze network performance for pods communicating with services:

```bash
# TCP connection latency
bpftrace -e '
kprobe:tcp_v4_connect
{
  @start[tid] = nsecs;
}

kretprobe:tcp_v4_connect
/@start[tid]/
{
  $duration_us = (nsecs - @start[tid]) / 1000;
  @connect_latency_us = hist($duration_us);
  delete(@start[tid]);
}
'

# DNS query latency
bpftrace -e '
uprobe:/lib/x86_64-linux-gnu/libc.so.6:getaddrinfo
{
  @start[tid] = nsecs;
}

uretprobe:/lib/x86_64-linux-gnu/libc.so.6:getaddrinfo
/@start[tid]/
{
  $duration_ms = (nsecs - @start[tid]) / 1000000;
  printf("DNS lookup took %d ms\n", $duration_ms);
  @dns_latency_ms = hist($duration_ms);
  delete(@start[tid]);
}
'
```

Track network packets for specific pods:

```bash
# Get pod IP
POD_IP=$(kubectl get pod myapp-xyz -o jsonpath='{.status.podIP}')

# Convert IP to hex for BPF filter
IP_HEX=$(printf '%02x%02x%02x%02x' $(echo $POD_IP | tr '.' ' '))

# Trace packets
bpftrace -e "
tracepoint:net:netif_receive_skb {
  \$iph = (struct iphdr *) args->skbaddr;
  if (\$iph->daddr == 0x$IP_HEX) {
    @packets = count();
    @bytes = sum(args->len);
  }
}
interval:s:1 {
  print(@packets);
  print(@bytes);
  clear(@packets);
  clear(@bytes);
}
"
```

## Analyzing Disk I/O Performance

Monitor disk operations to identify I/O bottlenecks:

```bash
# Track read/write latency by process
bpftrace -e '
tracepoint:block:block_rq_issue
{
  @start[args->dev, args->sector] = nsecs;
}

tracepoint:block:block_rq_complete
/@start[args->dev, args->sector]/
{
  $duration_us = (nsecs - @start[args->dev, args->sector]) / 1000;
  @io_latency_us = hist($duration_us);
  delete(@start[args->dev, args->sector]);
}
'

# Trace file writes for a specific PID
bpftrace -e "
tracepoint:syscalls:sys_enter_write /pid == $PID/ {
  @write_sizes = hist(args->count);
  @total_writes = sum(args->count);
}
"

# Track which files are being accessed most
bpftrace -e "
tracepoint:syscalls:sys_enter_openat /pid == $PID/ {
  @files[str(args->filename)] = count();
}
"
```

## CPU Performance Analysis

Profile CPU usage and identify hot functions:

```bash
# Sample stack traces at 99 Hz
bpftrace -e "
profile:hz:99 /pid == $PID/ {
  @[ustack] = count();
}
" > stacks.txt

# Generate flame graph (requires flamegraph.pl)
cat stacks.txt | flamegraph.pl > flame.svg

# Find functions with highest latency
bpftrace -e '
uprobe:/path/to/binary:function_name {
  @start[tid] = nsecs;
}

uretprobe:/path/to/binary:function_name /@start[tid]/ {
  $duration_us = (nsecs - @start[tid]) / 1000;
  @latency_us = hist($duration_us);
  delete(@start[tid]);
}
'
```

On-CPU time by function for Go applications:

```bash
# Find Go binary path
POD_NAME="myapp-xyz"
NODE=$(kubectl get pod $POD_NAME -o jsonpath='{.spec.nodeName}')

# SSH to node and trace
ssh $NODE

# Get PID and binary path
PID=$(crictl inspect $(crictl ps --name myapp -q) | jq -r '.info.pid')
BINARY=$(readlink -f /proc/$PID/exe)

# Profile Go functions
bpftrace -e "
profile:hz:49 /pid == $PID/ {
  @[ustack] = count();
}
" --unsafe
```

## Memory Allocation Tracing

Track memory allocations to find memory leaks:

```bash
# Trace malloc calls
bpftrace -e '
uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc /pid == '$PID'/ {
  @allocs = count();
  @alloc_bytes = sum(arg0);
}

uprobe:/lib/x86_64-linux-gnu/libc.so.6:free /pid == '$PID'/ {
  @frees = count();
}

interval:s:1 {
  printf("Allocs: %d, Frees: %d, Bytes: %d\n", @allocs, @frees, @alloc_bytes);
  clear(@allocs);
  clear(@frees);
  clear(@alloc_bytes);
}
'

# Track large allocations
bpftrace -e '
uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc /pid == '$PID' && arg0 > 10485760/ {
  printf("Large allocation: %d bytes at %s\n", arg0, ustack);
  @large_allocs = count();
}
'
```

## Application-Level Tracing

For applications with USDT (User Statically-Defined Tracing) probes:

```bash
# List available probes
bpftrace -l 'usdt:/path/to/binary:*'

# Trace HTTP requests (example for Node.js)
bpftrace -e '
usdt:/usr/bin/node:http__server__request {
  printf("%s %s\n", str(arg3), str(arg4));
  @requests = count();
}
'

# Trace database queries
bpftrace -e '
usdt:/usr/lib/libpq.so:query__start {
  @start[tid] = nsecs;
  @query[tid] = str(arg0);
}

usdt:/usr/lib/libpq.so:query__done /@start[tid]/ {
  $duration_ms = (nsecs - @start[tid]) / 1000000;
  printf("Query: %s, Duration: %d ms\n", @query[tid], $duration_ms);
  @query_latency = hist($duration_ms);
  delete(@start[tid]);
  delete(@query[tid]);
}
'
```

## Creating Reusable Scripts

Save common traces as scripts for repeated use:

```bash
#!/usr/bin/env bpftrace
# pod-latency.bt - Measure end-to-end latency for pod operations

BEGIN {
  printf("Tracing pod latency... Hit Ctrl-C to end.\n");
}

// Trace HTTP request latency
kprobe:tcp_sendmsg {
  @send_start[tid] = nsecs;
}

kretprobe:tcp_recvmsg /@send_start[tid]/ {
  $duration_ms = (nsecs - @send_start[tid]) / 1000000;
  @http_latency_ms = hist($duration_ms);
  delete(@send_start[tid]);
}

END {
  printf("\nHTTP Request Latency Distribution:\n");
  print(@http_latency_ms);
}
```

Run the script:

```bash
bpftrace pod-latency.bt
```

## Best Practices and Considerations

When using bpftrace in production:

1. Test scripts in development first - some probes can add overhead
2. Use filtering to limit trace scope and reduce performance impact
3. Combine with sampling (profile:hz:N) rather than tracing every event
4. Save output to files for later analysis rather than printing in real-time
5. Clean up maps in END probe to avoid memory leaks in long-running traces

Security considerations:
- bpftrace requires CAP_BPF and CAP_PERFMON capabilities
- Restrict access to nodes and bpftrace pods
- Be aware that bpftrace can read kernel and process memory
- Audit bpftrace usage in production environments

## Conclusion

bpftrace and eBPF provide powerful capabilities for analyzing Kubernetes pod performance without modifying applications or adding instrumentation. From tracing system calls and network operations to profiling CPU usage and tracking memory allocations, these tools offer comprehensive observability into your containerized workloads.

By mastering bpftrace, you can quickly diagnose performance issues, understand application behavior at the kernel level, and optimize resource usage across your Kubernetes clusters. The examples provided here form a foundation for building custom traces tailored to your specific monitoring and troubleshooting needs.
