# Optimize Calico Networking on Google Compute Engine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, GCE, Google Cloud, Performance, Optimization

Description: Performance optimization techniques for Calico networking on GCE, including native VPC routing, Tier 1 networking, and eBPF dataplane configuration for maximum throughput.

---

## Introduction

GCE's globally-distributed VPC is one of the best cloud networks for Calico native routing performance. Without encapsulation overhead and with Google's high-bandwidth backbone connecting zones, native-routed Calico on GCE can deliver near-bare-metal networking performance for Kubernetes pods. Achieving this requires selecting the right network tier, machine type, and Calico configuration.

Key GCE-specific optimizations include using Tier 1 networking for premium bandwidth on network-intensive instances, configuring Calico for native routing (eliminating VXLAN overhead), enabling eBPF on GCE's supported kernel versions, and correctly sizing MTU for GCE's 1500-byte or jumbo frame networks.

## Prerequisites

- GCE-based Kubernetes with Calico installed
- gcloud CLI with Compute Engine permissions
- Ability to recreate or modify GCE instances

## Optimization 1: Use Native Routing Mode

```yaml
# Zero-overhead pod networking on GCE
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: gce-pod-pool-optimized
spec:
  cidr: 192.168.0.0/16
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
```

Maintain VPC routes for each node's pod CIDR (automate this):

```bash
# Create a Cloud Functions or GCE instance group manager hook
# that adds/removes routes when nodes join/leave

function ensure_pod_cidr_route() {
  local node=$1 pod_cidr=$2 zone=$3
  gcloud compute routes create "${node}-pod-cidr" \
    --network k8s-network \
    --destination-range "$pod_cidr" \
    --next-hop-instance "$node" \
    --next-hop-instance-zone "$zone" 2>/dev/null || \
  echo "Route ${node}-pod-cidr already exists"
}
```

## Optimization 2: Select High-Performance Machine Types

GCE machine types with higher vCPU counts offer higher network bandwidth:

| Machine Type | vCPU | Max Bandwidth | Best For |
|-------------|------|---------------|----------|
| n2-standard-8 | 8 | 16 Gbps | General workloads |
| c2-standard-16 | 16 | 32 Gbps | Compute-intensive |
| n2-highcpu-32 | 32 | 32 Gbps | High-throughput |
| c3-standard-44 | 44 | 100 Gbps | Network-intensive |

## Optimization 3: Enable Tier 1 Networking

Tier 1 networking provides higher per-VM bandwidth caps on eligible instances:

```bash
gcloud compute instances create worker-tier1 \
  --machine-type c3-standard-22 \
  --network-performance-configs total-egress-bandwidth-tier=TIER_1 \
  --can-ip-forward \
  --tags kubernetes-node
```

## Optimization 4: Enable eBPF Dataplane

On GCE instances running Container-Optimized OS or Ubuntu 22.04 (kernel 5.15+):

```bash
kubectl patch installation default \
  --type=merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'
```

```mermaid
graph LR
    A[iptables mode] -->|O(n) rule traversal| B[Higher latency under load]
    C[eBPF mode] -->|O(1) map lookup| D[Consistent low latency]
    D --> E[40-60% throughput improvement]
```

## Optimization 5: Configure MTU

GCE standard networking uses 1460 bytes MTU (not 1500):

```bash
# For native routing on GCE: use 1460
kubectl patch felixconfiguration default \
  --type=merge \
  --patch='{"spec":{"mtu":1460}}'

# If VXLAN is used: subtract 50 bytes
# 1460 - 50 = 1410
kubectl patch felixconfiguration default \
  --type=merge \
  --patch='{"spec":{"mtu":1410}}'
```

## Optimization 6: Use Google's DNS for Lower Latency

Configure CoreDNS to use Google's internal DNS for cluster DNS:

```bash
kubectl edit configmap coredns -n kube-system
# Add: forward . 169.254.169.254 for GCP internal names
```

## Conclusion

Optimizing Calico on GCE centers on native VPC routing (eliminating encapsulation), selecting high-bandwidth machine types with Tier 1 networking for performance-critical nodes, enabling eBPF on supported kernels, and setting the correct MTU for GCE's 1460-byte standard network. With these optimizations, Calico on GCE can deliver near-maximum VPC throughput with minimal CPU overhead.
