# Monitor Calico VPP Technical Details

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, VPP, DPDK, Monitoring, Technical

Description: In-depth monitoring of Calico VPP technical internals, including node graph statistics, ACL evaluation metrics, buffer pool health, and DPDK interface counters.

---

## Introduction

Technical monitoring of Calico VPP goes beyond top-level throughput and latency metrics to track the health of VPP's internal data structures. Buffer pool exhaustion, ACL evaluation overhead, FIB lookup performance, and DPDK queue depth are all internal metrics that can indicate performance problems or configuration issues before they manifest as visible packet drops or latency spikes.

This guide covers the technical monitoring of VPP internals using VPP's native stats socket, Prometheus integration, and node graph counters.

## Prerequisites

- Calico VPP with VPP stats socket exposed
- Prometheus and Grafana deployed
- Understanding of VPP's internal processing model

## Step 1: Access VPP Stats via API

VPP exposes statistics through a stats socket that can be queried without vppctl:

```bash
# Install vpp-api-python if not available
pip3 install vpp-papi

# Query VPP stats
python3 - <<'EOF'
from vpp_papi.vpp_stats import VPPStats
s = VPPStats('/run/vpp/stats.sock')
clients = s.ls('/if/')
for c in clients:
    print(c)
EOF
```

## Step 2: Buffer Pool Monitoring

Buffer pool exhaustion causes packet drops that are hard to detect from outside VPP:

```bash
# Check current buffer pool state
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show buffers

# Critical metric: free buffers count
# Alert if free_buffers / total_buffers < 10%
```

```mermaid
graph LR
    A[Buffer Pool Full] --> B[Packets dropped at dpdk-input]
    B --> C[Visible as rx_no_bufs counter]
    C --> D[Alert: CalicoVPPBufferExhausted]
    D --> E[Increase buffers-per-numa in config]
```

## Step 3: Node Graph Processing Statistics

```bash
# View per-node processing rates
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show runtime

# Output includes:
# - calls/sec per node
# - vectors/sec per node
# - avg vectors/call (target: 16-64 for good performance)
# - suspends (how often VPP yields the CPU)
```

Create Prometheus metrics from runtime stats:

```yaml
# VPP exporter configuration
scrape_configs:
  - job_name: vpp-runtime
    static_configs:
      - targets: ['calico-vpp-node:9099']
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'vpp_node_.*'
        action: keep
```

## Step 4: ACL Performance Monitoring

```bash
# ACL hash tables provide fast O(1) lookup
# Linear search is O(n) - avoid if possible
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show acl-plugin statistics

# Watch for:
# match_n_vectors_n: ideal performance
# miss_n_vectors: cache misses in ACL hash tables
```

## Step 5: DPDK Queue Depth Monitoring

```bash
# Monitor NIC RX queue fill levels
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show dpdk statistics

# Key metrics:
# rx_q_errors: queue overflow events
# rx_mbuf_allocation_errors: buffer allocation failures
```

## Step 6: Prometheus Alerts for VPP Internals

```yaml
groups:
  - name: calico-vpp-technical
    rules:
      - alert: VPPBufferPoolLow
        expr: vpp_buffer_free_count / vpp_buffer_total_count < 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "VPP buffer pool < 10% free on {{ $labels.node }}"
          description: "Increase buffers-per-numa in VPP startup config"

      - alert: VPPNodeGraphDrops
        expr: rate(vpp_node_dpdk_input_no_buffers[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "VPP dropping packets due to buffer exhaustion"

      - alert: VPPACLMissRateHigh
        expr: rate(vpp_acl_hash_lookup_miss[5m]) / rate(vpp_acl_hash_lookup_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High VPP ACL hash miss rate - policy evaluation may be slow"
```

## Conclusion

Technical monitoring of Calico VPP's internals provides the earliest warning of performance degradation. Buffer pool monitoring detects memory pressure before it causes visible drops; node graph runtime statistics reveal processing inefficiencies; ACL hash miss monitoring detects policy evaluation overhead. By combining these metrics with operational-level throughput monitoring, you can detect and address VPP performance issues at their root cause rather than their symptoms.
