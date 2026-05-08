# Diagnosing Baseline Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Baseline, Benchmarking

Description: How to diagnose baseline performance issues in Cilium by comparing pod-to-pod performance against host-to-host hardware baselines.

---

## Introduction

Baseline performance represents the maximum achievable throughput and minimum latency of your hardware without any CNI overhead. Every Cilium performance analysis should start with establishing this baseline, because it sets the upper bound for what is achievable.

Diagnosing baseline issues involves measuring host-to-host performance, comparing it with pod-to-pod performance, and quantifying the CNI overhead.

This guide provides the methodology and commands for baseline performance management in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Establishing Hardware Baseline

```bash
# Host-to-host throughput (no CNI overhead)

kubectl run host-server --image=networkstatic/iperf3 \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  -- -s

kubectl run host-client --image=networkstatic/iperf3 \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  --rm -it --restart=Never \
  -- -c <node-1-ip> -t 30 -P 1

# Host TCP_RR baseline
kubectl run host-netserver --image=cilium/netperf \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-1"}}}' \
  --restart=Never \
  -- netserver -D

kubectl run host-netperf-client --image=cilium/netperf \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  --rm -it --restart=Never \
  -- netperf -H <node-1-ip> -t TCP_RR -l 20
```

## Comparing Pod vs Host Performance

```bash
# Pod-to-pod throughput
kubectl run pod-iperf-server --image=networkstatic/iperf3 --restart=Never -- -s
POD_SERVER_IP=$(kubectl get pod pod-iperf-server -o jsonpath='{.status.podIP}')
kubectl run pod-iperf-client --image=networkstatic/iperf3 \
  --rm -it --restart=Never \
  -- -c "$POD_SERVER_IP" -t 30 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

# Calculate CNI overhead
HOST_GBPS=10.0
POD_GBPS=9.4
echo "Host baseline: $HOST_GBPS Gbps"
echo "Pod throughput: $POD_GBPS Gbps"
echo "CNI overhead: $(echo "scale=1; (1 - $POD_GBPS/$HOST_GBPS) * 100" | bc)%"
```

## Baseline Metrics Collection

```bash
#!/bin/bash
# Collect comprehensive baseline
kubectl run pod-netserver --image=cilium/netperf --restart=Never -- netserver -D
POD_IP=$(kubectl get pod pod-netserver -o jsonpath='{.status.podIP}')

METRICS=("TCP_STREAM" "TCP_RR" "TCP_CRR")
for M in "${METRICS[@]}"; do
  SAFE_M=$(echo "$M" | tr '[:upper:]_' '[:lower:]-')

  echo "=== $M ==="
  # Host baseline
  echo "Host:"
  kubectl run "host-netperf-client-$SAFE_M" --image=cilium/netperf \
    --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
    --rm -i --restart=Never \
    -- netperf -H "$HOST_IP" -t "$M" -l 20
  # Pod baseline
  echo "Pod:"
  kubectl run "pod-netperf-client-$SAFE_M" --image=cilium/netperf \
    --rm -i --restart=Never \
    -- netperf -H "$POD_IP" -t "$M" -l 20
done
```

## Verification

```bash
cilium status --verbose
echo "Compare pod throughput vs host baseline"
```

## Troubleshooting

- **Host baseline lower than expected**: Check NIC link speed, CPU governor, and kernel TCP tuning.
- **Pod performance much lower than host**: Check Cilium datapath mode -- tunnel mode adds significant overhead.
- **Inconsistent baseline measurements**: Increase test duration, check for background workloads.
- **Baseline changes after kernel update**: Re-run host baseline and update reference values.

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

# Select a Cilium agent pod for node-local datapath inspection
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')

# Collect BPF map information
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg bpf ct list > $DIAG_DIR/ct-entries.txt 2>&1
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

## Advanced Diagnostic Techniques

### Using Cilium Monitor for Real-Time Analysis

The `cilium-dbg monitor` command provides real-time visibility into the eBPF datapath:

```bash
# Monitor all traffic for a specific endpoint
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')
ENDPOINT_ID=$(kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg endpoint list -o json | jq -r '.[0].id')
kubectl -n kube-system exec -it "$CILIUM_POD" -- cilium-dbg monitor --related-to "$ENDPOINT_ID" --type trace

# Monitor drops with verbose output
kubectl -n kube-system exec -it "$CILIUM_POD" -- cilium-dbg monitor --type drop -v

# Monitor policy verdicts
kubectl -n kube-system exec -it "$CILIUM_POD" -- cilium-dbg monitor --type policy-verdict

# Filter by specific protocol
kubectl -n kube-system exec -it "$CILIUM_POD" -- cilium-dbg monitor --type trace -v | grep TCP
```

### Using Hubble for Historical Analysis

Hubble provides historical flow data that helps identify patterns:

```bash
# Start Hubble relay port-forward
cilium hubble port-forward &

# Query recent flows with filters
hubble observe --protocol TCP --last 500 -o json | \
  jq 'select(.verdict == "DROPPED") | {src: .source.pod_name, dst: .destination.pod_name, reason: .drop_reason_desc}'

# Get flow statistics by source and destination
hubble observe --last 1000 -o json | \
  jq -r '\(.source.namespace)/\(.source.pod_name) -> \(.destination.namespace)/\(.destination.pod_name): \(.verdict)' | \
  sort | uniq -c | sort -rn | head -20
```

### Kernel Tracing with BPF

For deep datapath analysis, use BPF tracing tools:

```bash
# Trace BPF program execution time
bpftool prog show --json | jq '.[] | select(.name | contains("cil")) | {name, run_cnt, run_time_ns, avg_ns: (if .run_cnt > 0 then (.run_time_ns / .run_cnt | floor) else 0 end)}'

# Use bpftrace for custom tracing
bpftrace -e 'tracepoint:xdp:xdp_redirect*_err { @redir_errno[-args->err] = count(); }'
```

These diagnostic tools form a comprehensive toolkit for understanding exactly what happens to packets as they traverse Cilium's eBPF datapath.

## Conclusion

Diagnosing baseline performance in Cilium establishes the reference point for all performance optimization. With optimal Cilium configuration (native routing and BPF host routing), pod-to-pod throughput can approach the host-to-host baseline, confirming minimal CNI overhead.
