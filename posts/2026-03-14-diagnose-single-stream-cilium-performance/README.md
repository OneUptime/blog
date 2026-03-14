# Diagnosing Single-Stream Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Single-Stream, eBPF

Description: Learn how to diagnose single-stream TCP throughput issues in Cilium-managed Kubernetes clusters, identify bottlenecks in the datapath, and collect the metrics needed to pinpoint root causes.

---

## Introduction

Single-stream TCP throughput is one of the most revealing benchmarks for any CNI plugin. Unlike multi-stream tests that can mask latency and per-flow bottlenecks by aggregating bandwidth across many connections, a single-stream test exercises the entire datapath end to end through a single socket. When Cilium-powered pods show lower-than-expected throughput on a single TCP connection, the root cause can range from CPU affinity issues to sub-optimal eBPF program attachment points.

Diagnosing these problems requires a methodical approach. You need to understand what "normal" looks like for your hardware, collect baseline numbers without Cilium in the path, and then progressively enable Cilium features while measuring the impact. This post walks through the full diagnostic workflow.

Before diving in, it is important to note that single-stream performance is inherently bounded by a single CPU core's capacity to process packets. Cilium's eBPF datapath is highly efficient, but physics still applies -- a 100 Gbps NIC will not saturate on one flow if one core cannot push packets fast enough.

## Prerequisites

- A Kubernetes cluster (v1.24+) with Cilium installed (v1.14+)
- `cilium` CLI installed and configured
- `kubectl` access to the cluster
- `netperf` or `iperf3` available as container images
- Access to node-level metrics (Prometheus + Grafana recommended)
- Root or sudo access on cluster nodes for `perf` and `ethtool`

## Understanding the Single-Stream Datapath

When a single TCP connection runs between two pods on different nodes, the packet traverses the following path in Cilium:

```mermaid
graph LR
    A[Pod A tx] --> B[veth / Host-side]
    B --> C[Cilium eBPF tc egress]
    C --> D[Kernel routing]
    D --> E[NIC tx]
    E --> F[Wire / Fabric]
    F --> G[NIC rx on Node B]
    G --> H[Cilium eBPF tc ingress]
    H --> I[veth / Pod B side]
    I --> J[Pod B rx]
```

Each stage can introduce latency or throughput limits. The diagnostic process involves measuring at each stage to find the bottleneck.

### Collecting Baseline Metrics

Start by establishing a baseline without Cilium in the critical path. Run a host-network test first:

```bash
# Deploy iperf3 server on node-1 with host networking
kubectl run iperf-server --image=networkstatic/iperf3 \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  -- -s

# Deploy iperf3 client on node-2 with host networking
kubectl run iperf-client --image=networkstatic/iperf3 \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  -- -c <node-1-ip> -t 30 -P 1
```

Record the throughput. This is your hardware ceiling for single-stream.

### Running the Pod-to-Pod Test

Now test with normal pod networking:

```bash
# Server pod (regular networking)
kubectl run iperf-server-pod --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  -- -s

# Get the pod IP
SERVER_IP=$(kubectl get pod iperf-server-pod -o jsonpath='{.status.podIP}')

# Client pod
kubectl run iperf-client-pod --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  -- -c $SERVER_IP -t 30 -P 1
```

Compare the two results. A significant gap (more than 10-15%) indicates a datapath issue worth investigating.

## Inspecting Cilium eBPF Metrics

Cilium exposes detailed metrics about its eBPF programs. These are essential for diagnosis:

```bash
# Check Cilium status on each node
cilium status --verbose

# View datapath mode
cilium config view | grep datapath-mode

# Examine BPF map sizes and program stats
cilium bpf policy get --all
cilium bpf ct list global | head -20
```

Check for conntrack table pressure, which can slow down single-stream throughput:

```bash
# Count conntrack entries vs. max
cilium bpf ct list global | wc -l
cilium config view | grep bpf-ct-global-tcp-max
```

### CPU and IRQ Analysis

Single-stream throughput is CPU-bound on one core. Check if the NIC IRQs are pinned appropriately:

```bash
# On the node, check IRQ affinity
cat /proc/interrupts | grep -i eth
# Check which CPU handles the flow
cat /proc/net/softnet_stat

# Use ethtool to check ring buffer sizes
ethtool -g eth0
ethtool -l eth0
```

If a single CPU is saturated while others are idle, IRQ affinity or Receive Packet Steering (RPS) needs adjustment:

```bash
# Enable RPS to distribute softirq processing
echo "f" > /sys/class/net/eth0/queues/rx-0/rps_cpus
```

## Analyzing eBPF Program Performance

Use `bpftool` to inspect Cilium's eBPF program runtime:

```bash
# List all eBPF programs with runtime stats
bpftool prog show --json | jq '.[] | select(.name | contains("cil")) | {id, name, run_cnt, run_time_ns}'

# Calculate average per-packet processing time
# run_time_ns / run_cnt gives ns per invocation
```

Programs taking more than 1-2 microseconds per packet can limit single-stream throughput. Common causes include:

- Policy complexity: Too many L7 rules cause per-packet L7 parsing
- Encryption overhead: WireGuard or IPsec adds CPU cost
- Conntrack churn: Frequent conntrack GC interrupting flow processing

```bash
# Check if L7 policy is in the path
cilium endpoint list -o json | jq '.[].policy.proxy-statistics'

# Check encryption status
cilium encrypt status
```

## Verification

After collecting diagnostic data, verify your findings:

```bash
# Run iperf3 with JSON output for precise measurements
kubectl exec iperf-client-pod -- iperf3 -c $SERVER_IP -t 30 -P 1 -J > /tmp/results.json

# Compare against baseline
echo "Pod-to-pod throughput: $(jq '.end.sum_sent.bits_per_second' /tmp/results.json)"
echo "Host-to-host baseline: <your-baseline-value>"

# Verify CPU utilization during test
kubectl exec -it cilium-agent-pod -n kube-system -- cilium metrics list | grep cpu
```

## Troubleshooting

- **Throughput below 50% of baseline**: Check if tunneling (VXLAN/Geneve) is enabled. Tunneling adds overhead. Consider switching to native routing.
- **CPU at 100% on one core**: Check IRQ affinity and enable RPS/RFS. Consider enabling Cilium's BPF-based packet steering.
- **Inconsistent results**: Ensure no other workloads are running on the test nodes. Use `kubectl cordon` to isolate them.
- **Cilium agent high CPU**: Check `cilium monitor` output for excessive events. Rate-limit monitoring or disable verbose debugging.
- **Conntrack table full**: Increase `bpf-ct-global-tcp-max` in the Cilium ConfigMap and restart agents.

## Conclusion

Diagnosing single-stream performance in Cilium involves a layered approach: establish a hardware baseline, measure pod-to-pod throughput, inspect eBPF program efficiency, and analyze CPU and IRQ distribution. The single-stream case is particularly useful because it isolates per-core processing capacity and reveals bottlenecks that multi-stream tests can hide. With the metrics and commands covered in this guide, you can pinpoint whether the issue lies in Cilium's datapath, kernel configuration, or hardware limitations, and proceed to targeted fixes.
