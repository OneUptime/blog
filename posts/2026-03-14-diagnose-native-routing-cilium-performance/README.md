# Diagnosing Native Routing Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Native Routing, BPF, BGP

Description: How to diagnose native routing performance in Cilium, covering route configuration, BPF host routing, and BGP integration.

---

## Introduction

Native routing mode in Cilium eliminates tunnel encapsulation overhead by routing pod traffic directly through the underlying network. This provides the best possible throughput and latency, but requires proper route configuration between nodes.

Diagnosing native routing issues involves verifying routes exist, checking for asymmetric paths, and ensuring BPF host routing is active.

This guide provides the specific steps and commands for native routing performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Verifying Native Routing Mode

```bash
kubectl -n kube-system get configmap cilium-config -o jsonpath='{.data.routing-mode}{"\n"}'
kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep "Host Routing"
# Should show: native for routing-mode and Host Routing: BPF

```

## Checking Route Tables

```bash
# Verify pod CIDR routes exist between nodes
ip route show | grep -E "10\.(24[0-9]|25[0-5])\."
# Each node should have routes to other nodes' pod CIDRs

# Check Cilium-managed routes
kubectl exec -n kube-system ds/cilium -- ip route show
```

## Diagnosing Route Asymmetry

```bash
# Test bidirectional throughput
# Node 1 -> Node 2
kubectl exec client-1 -- iperf3 -c $SERVER_2_IP -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second'
# Node 2 -> Node 1
kubectl exec client-2 -- iperf3 -c $SERVER_1_IP -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second'
# Significant difference suggests asymmetric routing
```

## BPF Host Routing Verification

```bash
# BPF host routing should be enabled with native routing
kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep "Host Routing"
# Should show: Host Routing: BPF
# If it shows "Legacy", performance is sub-optimal
```

## Verification

```bash
kubectl -n kube-system get configmap cilium-config -o jsonpath='{.data.routing-mode}{"\n"}'
kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep "Host Routing"
ip route show | head -20
```

## Troubleshooting

- **Routes not appearing**: Check `autoDirectNodeRoutes` / `auto-direct-node-routes` and ensure nodes are on the same L2 segment, or use a routing component such as BGP.
- **BPF host routing not activating**: Requires eBPF kube-proxy replacement, eBPF masquerading, and a compatible kernel.
- **Asymmetric throughput**: Check for different NIC speeds or route path differences between nodes.
- **BGP peering not establishing**: Verify BGP ASN configuration and firewall rules for TCP port 179.

## Collecting Diagnostic Data Systematically

Before making any changes, collect a complete diagnostic snapshot. This ensures you have a baseline to compare against and can reproduce the issue:

```bash
# Create a diagnostic data directory
DIAG_DIR="/tmp/cilium-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DIAG_DIR

# Collect Cilium status
kubectl exec -n kube-system ds/cilium -- cilium-dbg status --verbose > $DIAG_DIR/cilium-status.txt

# Collect Cilium configuration
kubectl -n kube-system get configmap cilium-config -o yaml > $DIAG_DIR/cilium-config.txt

# Collect BPF map information
kubectl exec -n kube-system ds/cilium -- cilium-dbg bpf ct list global > $DIAG_DIR/ct-entries.txt 2>&1
kubectl exec -n kube-system ds/cilium -- cilium-dbg bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list -o json > $DIAG_DIR/endpoints.json

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

The `cilium monitor` command provides real-time visibility into the eBPF datapath:

```bash
# Monitor all traffic for a specific endpoint
ENDPOINT_ID=$(kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list -o json | jq '.[0].id')
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --related-to $ENDPOINT_ID --type trace

# Monitor drops with verbose output
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type drop -v

# Monitor policy verdicts
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type policy-verdict

# Filter by specific protocol
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type trace -v | grep TCP
```

### Using Hubble for Historical Analysis

Hubble provides historical flow data that helps identify patterns:

```bash
# Start Hubble relay port-forward
cilium hubble port-forward &

# Query recent flows with filters
hubble observe --protocol TCP --last 500 -o json | \
  jq 'select(.flow.verdict == "DROPPED") | {src: .flow.source.pod_name, dst: .flow.destination.pod_name, reason: .flow.drop_reason_desc}'

# Get flow statistics by source and destination
hubble observe --last 1000 -o json | \
  jq -r '\(.flow.source.namespace)/\(.flow.source.pod_name) -> \(.flow.destination.namespace)/\(.flow.destination.pod_name): \(.flow.verdict)' | \
  sort | uniq -c | sort -rn | head -20
```

### Kernel Tracing with BPF

For deep datapath analysis, use BPF tracing tools:

```bash
# Trace BPF program execution time
bpftool prog show --json | jq '.[] | select(.name | contains("cil")) | {name, run_cnt, run_time_ns, avg_ns: (if .run_cnt > 0 then (.run_time_ns / .run_cnt | floor) else 0 end)}'

# Use bpftrace for custom tracing
bpftrace -e 'tracepoint:xdp:xdp_redirect { @cnt[args->action] = count(); }'
```

These diagnostic tools form a comprehensive toolkit for understanding exactly what happens to packets as they traverse Cilium's eBPF datapath.

## Conclusion

Native routing in Cilium provides the best possible network performance by eliminating tunnel overhead. Diagnosing native routing configuration ensures pods benefit from direct routing with BPF host routing acceleration, achieving 90%+ of bare-metal throughput.
