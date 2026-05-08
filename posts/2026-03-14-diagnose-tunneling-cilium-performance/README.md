# Diagnosing Tunneling Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Tunneling, VXLAN, GENEVE, Native Routing

Description: How to diagnose tunneling-related performance issues in Cilium, covering VXLAN/Geneve overhead, MTU configuration, and native routing alternatives.

---

## Introduction

Tunneling (VXLAN or Geneve) in Cilium adds encapsulation overhead to every cross-node packet. This overhead includes additional headers (50-60 bytes), extra processing for encapsulation/decapsulation, and potential MTU-related fragmentation. Diagnosing these issues is critical for achieving optimal network performance.

The diagnostic process involves comparing tunneled and non-tunneled throughput, checking for fragmentation, and analyzing packet captures to quantify the exact overhead.

This guide provides the specific steps for each aspect of tunnel performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Identifying Tunnel Mode

```bash
# Check current tunnel configuration

cilium config view | grep -E "routing-mode|tunnel-protocol|tunnel-port"
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg status --verbose | grep -E "Routing|Host Routing"

# If routing-mode=tunnel and tunnel-protocol=vxlan or geneve, tunneling is active
```

## Measuring Tunnel Overhead

```bash
# Compare tunneled vs host-network throughput
# Host network (no tunnel)
kubectl exec host-iperf -- iperf3 -c $HOST_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

# Pod network (through tunnel)
kubectl exec pod-iperf -- iperf3 -c $POD_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

# Difference shows tunnel overhead (typically 10-20%)
```

## Analyzing Tunnel Packets

```bash
# Capture tunnel traffic on the wire
tcpdump -i eth0 -n 'udp port 8472' -c 100  # VXLAN
tcpdump -i eth0 -n 'udp port 6081' -c 100  # Geneve

# Check for fragmentation in tunnel
tcpdump -i eth0 -n 'udp port 8472 and ip[6:2] & 0x1fff != 0' -c 10
```

## MTU Analysis

```bash
# Tunnel adds 50-60 bytes overhead
# VXLAN: 50 bytes, Geneve: 54+ bytes
# If outer MTU is 1500, inner MTU must be <=1450

cilium config view | grep mtu
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  sh -c 'ip link show cilium_vxlan 2>/dev/null || ip link show cilium_geneve 2>/dev/null' | grep mtu
```

## Verification

```bash
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg status --verbose | grep -E "Routing|Host Routing"
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Cannot switch to native routing**: Cloud provider may require specific network configuration. Check provider documentation.
- **MTU too low causes poor performance**: Verify with ping -M do and adjust MTU in Cilium config.
- **Fragmentation despite correct MTU**: Check for nested encapsulation (tunnel inside tunnel).
- **Native routing breaks cross-node**: Ensure node routes are configured correctly.

## Collecting Diagnostic Data Systematically

Before making any changes, collect a complete diagnostic snapshot. This ensures you have a baseline to compare against and can reproduce the issue:

```bash
# Create a diagnostic data directory
DIAG_DIR="/tmp/cilium-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DIAG_DIR

# Collect Cilium status
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg status --verbose > $DIAG_DIR/cilium-status.txt

# Collect Cilium configuration
cilium config view > $DIAG_DIR/cilium-config.txt

# Collect BPF map information
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg bpf ct list > $DIAG_DIR/ct-entries.txt 2>&1
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint list -o json > $DIAG_DIR/endpoints.json

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
ENDPOINT_ID=$(kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint list -o json | jq -r '.[0].id')
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg monitor --related-to $ENDPOINT_ID --type trace

# Monitor drops with verbose output
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg monitor --type drop -v

# Monitor policy verdicts
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg monitor --type policy-verdict

# Filter by specific protocol
kubectl exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg monitor --type trace -v | grep TCP
```

### Using Hubble for Historical Analysis

Hubble provides historical flow data that helps identify patterns:

```bash
# Start Hubble relay port-forward
cilium hubble port-forward &

# Query recent flows with filters
hubble observe --protocol tcp --last 500 -o json | \
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
bpftool prog show --json | jq '.[] | select((.name // "") | contains("cil")) | {name, run_cnt, run_time_ns, avg_ns: (if (.run_cnt // 0) > 0 then ((.run_time_ns // 0) / .run_cnt | floor) else 0 end)}'

# Use bpftrace for custom tracing
bpftrace -e 'tracepoint:xdp:* { @cnt[probe] = count(); }'
```

These diagnostic tools form a comprehensive toolkit for understanding exactly what happens to packets as they traverse Cilium's eBPF datapath.

## Conclusion

Diagnosing tunneling performance in Cilium is essential for optimal cross-node communication. Native routing eliminates tunnel overhead entirely and should be the default choice when the network supports it. When tunneling is required, proper MTU configuration and BPF host routing minimize the performance impact.
