# Diagnosing 32-Process Performance Bottlenecks in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Multi-Process, Scaling

Description: Learn how to diagnose performance issues when running 32 parallel processes through Cilium's eBPF datapath, focusing on CPU scaling, lock contention, and resource distribution.

---

## Introduction

Running 32 parallel processes through Cilium's network datapath represents a high-parallelism scenario that stresses every shared resource in the system. Unlike single-process workloads where the bottleneck is one CPU core, 32-process workloads can saturate NIC bandwidth, exhaust BPF map capacity, create lock contention on shared data structures, and overwhelm the kernel's scheduling subsystem.

Diagnosing performance issues at this level of parallelism requires tools that can observe per-CPU behavior, per-queue statistics, and BPF program contention simultaneously. The root cause is rarely a single component; instead, it is usually a combination of factors that interact under high load.

This guide provides a systematic diagnostic methodology for 32-process workloads in Cilium, from initial measurement to root cause identification.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- Nodes with at least 32 CPU cores
- `iperf3`, `mpstat`, `perf`, and `bpftool` available
- Prometheus with Cilium metrics enabled
- `cilium` CLI and `kubectl` access

## Measuring 32-Process Throughput

```bash
# Deploy iperf3 server
kubectl run iperf-server --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  -- -s

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

# Run 32-stream test
kubectl run iperf-client --image=networkstatic/iperf3 \
  --rm -it --restart=Never \
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  -- -c $SERVER_IP -t 30 -P 32 -J
```

Compare against the theoretical maximum: single-stream throughput multiplied by 32, capped at NIC link speed.

## Analyzing Per-CPU Distribution

```bash
# Monitor all CPUs during the test
mpstat -P ALL 1 30 > /tmp/cpu_during_test.txt

# Check for uneven distribution
awk '/^Average/ && $2 != "all" && $2 != "CPU" {if ($3+$5 > 80) print "CPU "$2": "$3+$5"% busy"}' /tmp/cpu_during_test.txt

# Check NIC queue distribution
ethtool -S eth0 | grep -E "rx_queue_[0-9]+_packets" | sort -t_ -k3 -n
```

## BPF Map Contention Analysis

```bash
# Check conntrack table pressure under 32-process load
CT_BEFORE=$(cilium bpf ct list global | wc -l)
# Run test
sleep 30
CT_AFTER=$(cilium bpf ct list global | wc -l)
echo "CT entries created: $((CT_AFTER - CT_BEFORE))"

# Profile BPF program performance
bpftool prog show --json | jq '.[] | select(.name | contains("cil")) | {name, run_cnt, run_time_ns, avg_ns: (.run_time_ns / (.run_cnt + 1))}'

# Look for high avg_ns under load (>5000ns suggests contention)
```

## Memory and NUMA Analysis

```bash
# Check NUMA memory distribution
numastat -p $(pgrep cilium-agent)

# Verify NIC NUMA affinity
cat /sys/class/net/eth0/device/numa_node

# Check for cross-NUMA memory access
perf stat -e LLC-load-misses,LLC-store-misses -a -- sleep 10
```

## Verification

```bash
# Verify diagnostic findings with targeted tests
# Test with increasing process counts to find the scaling breakpoint
for P in 1 4 8 16 32; do
  echo "=== $P processes ==="
  kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P $P -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000' | xargs -I{} echo "{} Gbps"
done
```

## Troubleshooting

- **Throughput plateaus before 32 streams**: NIC link speed reached. Verify with `ethtool eth0 | grep Speed`.
- **Uneven CPU distribution**: Check RSS hash configuration with `ethtool -n eth0 rx-flow-hash tcp4`.
- **BPF program slowdown under load**: Check for map full conditions with `cilium bpf ct list global | wc -l`.
- **NUMA cross-node traffic**: Use `numactl --cpunodebind` to pin cilium-agent to the NIC's NUMA node.

## Collecting Diagnostic Data Systematically

Before making any changes, collect a complete diagnostic snapshot. This ensures you have a baseline to compare against and can reproduce the issue:

```bash
# Create a diagnostic data directory
DIAG_DIR="/tmp/cilium-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DIAG_DIR

# Collect Cilium status
cilium status --verbose > $DIAG_DIR/cilium-status.txt

# Collect Cilium configuration
cilium config view > $DIAG_DIR/cilium-config.txt

# Collect BPF map information
cilium bpf ct list global > $DIAG_DIR/ct-entries.txt 2>&1
cilium bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
cilium endpoint list -o json > $DIAG_DIR/endpoints.json

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

Diagnosing 32-process performance in Cilium requires multi-dimensional observation: CPU distribution, NIC queue utilization, BPF map behavior, and NUMA topology all contribute to aggregate throughput. The scaling test from 1 to 32 processes reveals exactly where throughput stops scaling linearly, pointing to the specific bottleneck. Use this diagnostic data to apply targeted fixes rather than guessing at configuration changes.
