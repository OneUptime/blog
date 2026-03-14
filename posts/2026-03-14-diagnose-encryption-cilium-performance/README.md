# Diagnosing Encryption Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Encryption, WireGuard, IPsec, Performance

Description: How to diagnose encryption performance in Cilium, covering both WireGuard and IPsec overhead analysis and optimization.

---

## Introduction

Encryption in Cilium adds CPU overhead to every packet, reducing throughput and increasing latency compared to unencrypted networking. The magnitude of the overhead depends on the encryption protocol (WireGuard vs IPsec), hardware crypto support, and the workload characteristics.

Diagnosing encryption performance involves measuring the overhead compared to unencrypted baseline and profiling CPU usage during encrypted transfers.

This guide covers the specific steps for managing encryption performance in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Identifying Encryption Status

```bash
cilium encrypt status
# Shows: Encryption type, keys, and node status

# Check which traffic is encrypted
tcpdump -i eth0 -n 'udp port 51871' -c 10  # WireGuard
tcpdump -i eth0 -n esp -c 10  # IPsec
```

## Measuring Encryption Overhead

```bash
# Baseline without encryption
helm upgrade cilium cilium/cilium --namespace kube-system --set encryption.enabled=false
kubectl rollout status ds/cilium -n kube-system && sleep 30
NOENC=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second')

# With encryption
helm upgrade cilium cilium/cilium --namespace kube-system --set encryption.enabled=true --set encryption.type=wireguard
kubectl rollout status ds/cilium -n kube-system && sleep 30
ENC=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second')

OVERHEAD=$(echo "scale=1; (1 - $ENC / $NOENC) * 100" | bc)
echo "Encryption overhead: ${OVERHEAD}%"
```

## CPU Profile During Encryption

```bash
perf record -g -a -- sleep 10
perf report --stdio | grep -E "chacha|poly|aes|gcm|esp|wireguard|crypto" | head -15
```

## Verification

```bash
cilium encrypt status
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Encryption not active**: Verify Cilium helm values include encryption.enabled=true.
- **Overhead > 40%**: Check for userspace WireGuard or missing AES-NI for IPsec.
- **Some nodes not encrypted**: Check Cilium agent logs for key exchange errors.
- **Performance varies by node pair**: Different hardware capabilities across nodes.

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

## Advanced Diagnostic Techniques

### Using Cilium Monitor for Real-Time Analysis

The `cilium monitor` command provides real-time visibility into the eBPF datapath:

```bash
# Monitor all traffic for a specific endpoint
ENDPOINT_ID=$(cilium endpoint list -o json | jq '.[0].id')
cilium monitor --related-to $ENDPOINT_ID --type trace

# Monitor drops with verbose output
cilium monitor --type drop -v

# Monitor policy verdicts
cilium monitor --type policy-verdict

# Filter by specific protocol
cilium monitor --type trace -v | grep TCP
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
bpftrace -e 'tracepoint:xdp:xdp_redirect { @cnt[args->action] = count(); }'
```

These diagnostic tools form a comprehensive toolkit for understanding exactly what happens to packets as they traverse Cilium's eBPF datapath.

## Conclusion

Diagnosing encryption performance in Cilium ensures that the security benefits of transparent encryption come with acceptable performance overhead. With proper protocol selection, hardware utilization, and continuous monitoring, encryption overhead can be kept below 20-30%, making it practical for production deployments.
