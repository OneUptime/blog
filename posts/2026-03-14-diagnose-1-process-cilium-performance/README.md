# Diagnosing Single-Process Performance Bottlenecks in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Single-Process, CPU

Description: How to diagnose performance bottlenecks when a single-process workload runs through Cilium's eBPF datapath, focusing on CPU pinning, scheduling, and per-core analysis.

---

## Introduction

Single-process workloads in Kubernetes present a unique performance challenge for Cilium. When an application uses only one process (and often one thread) for network I/O, packet processing for a busy flow can be concentrated on a small number of CPU cores. This means the application, kernel networking work, and Cilium's eBPF programs can compete for the same core's resources, and any inefficiency is magnified.

Diagnosing single-process performance issues requires understanding how the Linux scheduler places the application thread and how kernel softirq processing interacts with Cilium's datapath. A poorly scheduled single-process workload can lose significant throughput due to CPU contention.

This guide covers the diagnostic tools and methodology for identifying exactly where a single-process workload is losing performance in a Cilium environment.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `perf`, `mpstat`, `pidstat`, `bpftool`, `ethtool`, `jq`, and `crictl` available on nodes
- `kubectl`, `cilium`, and `hubble` CLI
- Understanding of Linux CPU scheduling
- A single-process workload exhibiting poor performance

## Identifying the CPU Bottleneck

```bash
# Find the node and host PID for the application container

APP_NODE=$(kubectl get pod my-app -o jsonpath='{.spec.nodeName}')
CONTAINER_ID=$(kubectl get pod my-app -o jsonpath='{.status.containerStatuses[0].containerID}' | sed 's#^[^/]*://##')

# On $APP_NODE, check CPU affinity for the host PID
APP_PID=$(sudo crictl inspect "$CONTAINER_ID" | jq -r '.info.pid')
taskset -pc "$APP_PID"

# Monitor per-CPU utilization during the workload
mpstat -P ALL 1 30

# Look for a single CPU at 100% while others are idle
# This indicates the single-process bottleneck
```

Check what is consuming CPU on that core:

```bash
# Profile the specific CPU
perf record -C <cpu-number> -g -- sleep 10
perf report --stdio --sort=dso,symbol | head -30

# Look for the split between:
# - Application code (your binary)
# - Kernel networking (net_rx_action, napi_poll)
# - Cilium eBPF (bpf_prog_run, __htab_map_lookup_elem)
```

## Analyzing Cilium's Impact on the Core

```bash
# Check BPF program execution stats
# Runtime counters require BPF runtime statistics to be enabled on the node.
test -w /proc/sys/kernel/bpf_stats_enabled && echo 1 | sudo tee /proc/sys/kernel/bpf_stats_enabled
bpftool prog show --json | jq '.[] | select((.name // "") | contains("cil")) | {name, run_cnt: (.run_cnt // 0), run_time_ns: (.run_time_ns // 0), avg_ns: ((.run_time_ns // 0) / ((.run_cnt // 0) + 1))}'

# Monitor softirq distribution
cat /proc/softirqs | grep NET

# Check if softirq is processed on the same core as the application
# High NET_RX on the application's core = contention
```

## Checking IRQ Assignment

```bash
# Find which CPU handles the NIC IRQs for the application's traffic
cat /proc/interrupts | grep -E "eth|ens|eno"

# Check the flow hash to see which queue handles the flow
# Use ethtool to check flow steering
ethtool -n eth0 | head -20
```

```mermaid
graph TD
    A[Single-Process App on CPU 3] --> B{NIC IRQ also on CPU 3?}
    B -->|Yes| C[Contention: App + softirq + BPF on same core]
    B -->|No| D{RPS steering to CPU 3?}
    D -->|Yes| C
    D -->|No| E[App and BPF on different cores - check app itself]
```

## Checking Container CPU Limits

```bash
# Check if CPU limits are throttling
kubectl exec my-app -- sh -c 'cat /sys/fs/cgroup/cpu.stat 2>/dev/null || cat /sys/fs/cgroup/cpu/cpu.stat'
# Look for nr_throttled and throttled_usec on cgroup v2,
# or nr_throttled and throttled_time on cgroup v1.

kubectl describe pod my-app | grep -A5 "Limits"
# If CPU limit is 1 core, the app can be throttled when it consumes its quota.
```

## Using Hubble for Flow Analysis

```bash
# Check flow patterns from the single-process app
hubble observe --pod my-app --protocol tcp -o json | \
  jq '{src: .source.pod_name, dst: .destination.pod_name, verdict: .verdict}' | head -20

# Check for drops
hubble observe --pod my-app --verdict DROPPED
```

## Verification

```bash
# Verify your findings by running a controlled test
# Pin the app to a specific CPU and run iperf3 on the same core vs different core

# Same core test
taskset -c 0 iperf3 -c $SERVER_IP -t 10 -P 1 &
# Force IRQ to CPU 0
echo 0 > /proc/irq/<nic-irq>/smp_affinity_list

# Different core test
taskset -c 0 iperf3 -c $SERVER_IP -t 10 -P 1 &
echo 1 > /proc/irq/<nic-irq>/smp_affinity_list

# Compare results to quantify contention
```

## Troubleshooting

- **Cannot find application PID on node**: Use `crictl ps` to find the container, then `crictl inspect` for the PID.
- **perf not available**: Install `linux-tools-$(uname -r)` or use BCC tools like `profile`.
- **CPU utilization data unclear**: Use `pidstat -t -p $APP_PID 1` for per-thread breakdown.
- **Cilium agent itself consuming excessive CPU**: Check `cilium-dbg monitor` inside the Cilium agent pod for excessive events and disable verbose logging.

## Collecting Diagnostic Data Systematically

Before making any changes, collect a complete diagnostic snapshot. This ensures you have a baseline to compare against and can reproduce the issue:

```bash
# Create a diagnostic data directory
DIAG_DIR="/tmp/cilium-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DIAG_DIR

# Select the Cilium agent pod on the same node as the application
APP_NODE=${APP_NODE:-$(kubectl get pod my-app -o jsonpath='{.spec.nodeName}')}
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium --field-selector spec.nodeName="$APP_NODE" -o jsonpath='{.items[0].metadata.name}')

# Collect Cilium status
cilium status --verbose > $DIAG_DIR/cilium-status.txt

# Collect Cilium configuration
cilium config view > $DIAG_DIR/cilium-config.txt

# Collect BPF map information
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg bpf ct list global > $DIAG_DIR/ct-entries.txt 2>&1
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg endpoint list -o json > $DIAG_DIR/endpoints.json

# Collect node information
kubectl get nodes -o wide > $DIAG_DIR/nodes.txt
kubectl describe nodes > $DIAG_DIR/node-details.txt

# Collect Cilium agent logs
kubectl logs -n kube-system ds/cilium --tail=500 > $DIAG_DIR/cilium-logs.txt

# Archive everything
tar czf $DIAG_DIR.tar.gz $DIAG_DIR
echo "Diagnostic data saved to $DIAG_DIR.tar.gz"
```

Keep this diagnostic snapshot for comparison after applying fixes. The data is also useful if you need to escalate to Cilium support or open a GitHub issue.

### Understanding the Diagnostic Output

When reviewing the diagnostic data, focus on these key indicators:

1. **Cilium status**: Look for any components showing errors or degraded state
2. **BPF map utilization**: Compare current entries against maximum capacity
3. **Endpoint health**: Check for endpoints in "not-ready" or "disconnected" state
4. **Agent logs**: Search for ERROR and WARNING messages, especially related to BPF programs or policy computation

The combination of these data points will point you toward the specific subsystem causing the performance issue.

## Conclusion

Diagnosing single-process performance in Cilium centers on understanding CPU core contention between the application, kernel softirq processing, and Cilium's eBPF programs. The key diagnostic steps are identifying which CPU the application runs on, measuring what else competes for that core, and quantifying the overhead from each component. With this information, you can proceed to targeted fixes like IRQ steering, CPU pinning, or Cilium configuration changes.
