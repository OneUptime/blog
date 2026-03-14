# Diagnosing Packet Server Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Packet Processing, Server

Description: How to diagnose packet server configuration issues affecting Cilium performance, including netserver, iperf3, and workload deployment problems.

---

## Introduction

Performance benchmark results are only as reliable as the test servers generating and receiving traffic. Misconfigured packet servers, whether using netperf, iperf3, or custom workloads, can bottleneck on the server side and produce misleading results that you might incorrectly attribute to Cilium.

Diagnosing packet server issues means verifying that the server can saturate the network path independently of Cilium's datapath. If the server itself is CPU-bound, memory-limited, or misconfigured, tuning Cilium will not improve results.

This guide covers the diagnostic process for identifying server-side bottlenecks in Cilium performance testing.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Server Process Verification

```bash
# Check iperf3 server is running correctly
kubectl exec iperf-server -- ps aux | grep iperf3
kubectl exec iperf-server -- iperf3 --version

# Check netperf server
kubectl exec netperf-server -- ps aux | grep netserver

# Verify server is listening
kubectl exec iperf-server -- ss -tlnp | grep 5201
```

## Server Resource Analysis

```bash
# Check server pod resource allocation
kubectl describe pod iperf-server | grep -A5 "Limits"

# Monitor server CPU during test
kubectl exec iperf-server -- sh -c 'while true; do cat /proc/stat | head -1; sleep 1; done' &
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 8

# Check if server is CPU-bound
kubectl top pod iperf-server
```

## Server Configuration Issues

```bash
# iperf3 single-threaded limitation
# iperf3 server uses a single thread per client connection
# For multi-stream tests, consider using multiple server instances

# Check for socket buffer limits in the container
kubectl exec iperf-server -- sysctl net.core.rmem_max
kubectl exec iperf-server -- sysctl net.core.wmem_max
```

## Multiple Server Instances

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iperf-servers
  namespace: monitoring
spec:
  replicas: 4
  selector:
    matchLabels:
      app: iperf-server
  template:
    metadata:
      labels:
        app: iperf-server
    spec:
      containers:
      - name: iperf3
        image: networkstatic/iperf3
        args: ["-s"]
        ports:
        - containerPort: 5201
        resources:
          requests:
            cpu: "2"
            memory: "512Mi"
          limits:
            cpu: "2"
            memory: "512Mi"
```

## Verification

```bash
# Run the validation checks above
# All items should show PASS
cilium status --verbose
```

## Troubleshooting

- **Validation fails on specific nodes**: Check if nodes were provisioned from different images.
- **Kernel module load fails**: Verify the module is available for your kernel version.
- **Cilium status unhealthy**: Check agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Tools missing in containers**: Use an image that includes the required tools or mount from host.

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

Properly diagnosing packet server issues in Cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
