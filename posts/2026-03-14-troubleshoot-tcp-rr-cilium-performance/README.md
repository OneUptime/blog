# Troubleshooting Request/Response Rate (TCP_RR) in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, TCP_RR, Troubleshooting

Description: A systematic troubleshooting guide for TCP_RR latency and throughput issues in Cilium, covering datapath analysis, conntrack debugging, and policy impact assessment.

---

## Introduction

When TCP_RR performance degrades in a Cilium-managed cluster, the symptoms are usually high latency per transaction and reduced transactions per second. Since TCP_RR measures the round-trip time of a single request and response on an established connection, every component in the datapath contributes to the total latency.

Troubleshooting TCP_RR issues requires a systematic approach that isolates each layer: the application, the kernel TCP stack, Cilium's eBPF programs, network policies, and the physical network. This guide provides a step-by-step troubleshooting methodology with specific commands for each layer.

The most common root causes are conntrack table contention, excessive policy evaluation, CPU frequency scaling, and competition with other eBPF programs for CPU time.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `netperf` and `cilium/netperf` container images
- `cilium` CLI, `kubectl`, `bpftool`, and `jq`
- Access to a Cilium agent pod for node-local `cilium-dbg` commands
- Node-level root access for `perf` profiling
- Hubble CLI for flow inspection

## Step 1: Establish the Problem Scope

Determine whether the issue is cluster-wide or specific to certain paths:

```bash
# Test pod-to-pod on same node

kubectl run server-local --image=cilium/netperf --restart=Never --command -- netserver -D
SERVER_NODE=$(kubectl get pod server-local -o jsonpath='{.spec.nodeName}')
kubectl run client-local --image=cilium/netperf \
  --overrides='{"apiVersion":"v1","spec":{"nodeName":"'"$SERVER_NODE"'"}}' \
  --rm -it --restart=Never \
  --command -- netperf -H $(kubectl get pod server-local -o jsonpath='{.status.podIP}') -t TCP_RR -l 10

# Test pod-to-pod cross-node
kubectl run server-remote --image=cilium/netperf \
  --overrides='{"apiVersion":"v1","spec":{"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  --restart=Never \
  --command -- netserver -D
kubectl run client-remote --image=cilium/netperf \
  --overrides='{"apiVersion":"v1","spec":{"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  --rm -it --restart=Never \
  --command -- netperf -H $(kubectl get pod server-remote -o jsonpath='{.status.podIP}') -t TCP_RR -l 10

# Test host-to-host baseline
kubectl run host-server --image=cilium/netperf \
  --overrides='{"apiVersion":"v1","spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  --restart=Never \
  --command -- netserver -D
kubectl run host-client --image=cilium/netperf \
  --overrides='{"apiVersion":"v1","spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  --rm -it --restart=Never \
  --command -- netperf -H <node-2-ip> -t TCP_RR -l 10
```

Compare the three results to isolate where the overhead is.

## Step 2: Analyze Cilium Datapath

```bash
# Check Cilium's datapath mode
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep -E "DatapathMode|Host Routing|KubeProxyReplacement|Routing"

# List BPF programs with execution stats
# Enable temporarily if run_cnt and run_time_ns are missing: sysctl -w kernel.bpf_stats_enabled=1
bpftool prog show --json | jq '.[] | select(.name | contains("cil")) | {id, name, run_cnt, run_time_ns, avg_ns: (if .run_cnt > 0 then (.run_time_ns / .run_cnt) else 0 end)}'

# Investigate Cilium programs with unusually high avg_ns relative to the rest
```

Check if the datapath is taking a sub-optimal route:

```bash
# Trace packet path through Cilium
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg monitor --type trace --related-to <endpoint-id> | head -50

# Check endpoint configuration
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg endpoint get <endpoint-id> -o json | jq '.status.policy'
```

## Step 3: Conntrack Table Analysis

Conntrack is often the bottleneck for TCP_RR:

```bash
# Check table utilization
CT_COUNT=$(kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf ct list | wc -l)
CT_MAX=$(cilium config view | grep bpf-ct-global-tcp-max | awk '{print $2}')
echo "Conntrack utilization: $CT_COUNT / $CT_MAX"

# If > 75% full, contention is likely
# Check for stale entries
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg bpf ct list | awk '{print $NF}' | sort | uniq -c | sort -rn | head

# Flush conntrack if needed (causes brief disruption)
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf ct flush
```

## Step 4: Policy Impact Assessment

```bash
# Temporarily switch to audit mode to measure policy overhead
PODNAME=<server-pod-name>
NODENAME=$(kubectl get pod "$PODNAME" -o jsonpath='{.spec.nodeName}')
ENDPOINT_ID=$(kubectl get cep "$PODNAME" -o jsonpath='{.status.id}')
CILIUM_POD=$(kubectl -n kube-system get pod --field-selector spec.nodeName="$NODENAME" -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg endpoint config "$ENDPOINT_ID" PolicyAuditMode=Enabled

# Re-run TCP_RR test
kubectl run audit-test --image=cilium/netperf \
  --rm -it --restart=Never \
  --command -- netperf -H $SERVER_IP -t TCP_RR -l 10

# If TCP_RR improves significantly, policies are the bottleneck
# Re-enable enforcement
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg endpoint config "$ENDPOINT_ID" PolicyAuditMode=Disabled
```

## Step 5: CPU and Scheduling Analysis

```bash
# Check CPU frequency (should be at max)
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq

# Check for CPU throttling
dmesg | grep -i throttl

# Profile the kernel during TCP_RR test
perf record -g -a -- sleep 5
perf report --sort=dso,symbol --stdio | head -30

# Check scheduling latency
perf sched record -- sleep 5
perf sched latency --sort max
```

## Step 6: Network-Level Debugging

```bash
# Check for packet drops in the NIC
ethtool -S eth0 | grep -i drop
ethtool -S eth0 | grep -i error

# Check kernel drop counters
netstat -s | grep -i drop
netstat -s | grep -i retransmit

# Use Hubble to look for drops
hubble observe --verdict DROPPED --last 100
```

## Resolution Flowchart

```mermaid
graph TD
    A[TCP_RR Slow] --> B{Same-node test?}
    B -->|Also slow| C{Host networking test?}
    B -->|Fast| D[Cross-node issue: check network/NIC]
    C -->|Also slow| E[Hardware/kernel issue]
    C -->|Fast| F{Policy audit mode?}
    F -->|Improves| G[Simplify policies]
    F -->|No change| H{Conntrack >75%?}
    H -->|Yes| I[Increase CT table / flush stale]
    H -->|No| J[Profile with perf / check CPU governor]
```

## Verification

After applying fixes, verify the improvement:

```bash
# Run comprehensive TCP_RR verification
for SIZE in 1 64 256 1024; do
  echo "=== Payload size: $SIZE bytes ==="
  kubectl run verify-$SIZE --image=cilium/netperf \
    --rm -it --restart=Never \
    --command -- netperf -H $SERVER_IP -t TCP_RR -l 15 -- -r $SIZE,$SIZE
done
```

## Troubleshooting

- **TCP_RR good on same node, bad cross-node**: Focus on physical network latency. Check MTU consistency across nodes.
- **Intermittent latency spikes**: Look for Cilium agent restarts (`kubectl get events -n kube-system`) or conntrack GC pauses.
- **Latency increases with cluster size**: Likely identity or policy scaling issue. Check `kubectl -n kube-system exec ds/cilium -- cilium-dbg identity list | wc -l`.
- **Test results vary wildly between runs**: Pin test pods to specific CPUs and eliminate noisy neighbors.

## Conclusion

Troubleshooting TCP_RR performance in Cilium follows a layered approach: compare same-node vs cross-node vs host networking to isolate the problem layer, then drill into Cilium's datapath, conntrack tables, policy evaluation, and CPU scheduling. The systematic flowchart approach ensures you do not waste time on the wrong layer. Most TCP_RR issues in Cilium resolve through conntrack optimization, policy simplification, or CPU frequency management.
