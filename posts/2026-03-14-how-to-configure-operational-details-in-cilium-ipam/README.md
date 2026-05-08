# Configuring Operational Details in Cilium IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPAM, Networking, Configuration

Description: A detailed guide to configuring Cilium IPAM operational parameters including pool sizes, allocation modes, and garbage collection for production Kubernetes clusters.

---

## Introduction

Cilium IPAM (IP Address Management) handles the allocation of IP addresses to pods. The operational details of IPAM configuration determine how quickly pods get IPs, how efficiently address space is used, and what happens when address pools are exhausted. Getting these details right is critical for clusters that scale frequently or have tight IP address budgets.

Cilium supports several IPAM modes: cluster-pool (the default, where the operator divides a large CIDR into per-node pools), Kubernetes host-scope (delegating to the Kubernetes node CIDR allocator), and cloud-provider modes (AWS ENI, Azure IPAM). Each mode has different operational parameters.

This guide focuses on the operational tuning of Cilium IPAM regardless of the mode you choose.

## Prerequisites

- Kubernetes cluster running a version supported by your installed Cilium release
- Helm v3 and kubectl configured
- Understanding of your IP address requirements and constraints

## Cluster Pool IPAM Configuration

The cluster-pool mode is the default and provides straightforward control:

```yaml
# cilium-ipam.yaml

ipam:
  mode: cluster-pool
  operator:
    # The overall CIDR to allocate from
    clusterPoolIPv4PodCIDRList:
      - "10.0.0.0/8"
    # Size of per-node allocation (each node gets a /24)
    clusterPoolIPv4MaskSize: 24
```

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-ipam.yaml
```

### Choosing the Right Mask Size

| Mask Size | IPs per Node | Best For |
|-----------|-------------|----------|
| /24       | 254         | Standard workloads |
| /25       | 126         | Many nodes, moderate pods |
| /26       | 62          | Very large clusters, few pods per node |
| /23       | 510         | Dense nodes with many pods |

Cilium also allocates internal addresses, such as router and health endpoint addresses, from the node allocation.

```mermaid
graph TD
    A[Operator] --> B[Cluster CIDR: 10.0.0.0/8]
    B --> C[Node 1: 10.0.0.0/24]
    B --> D[Node 2: 10.0.1.0/24]
    B --> E[Node 3: 10.0.2.0/24]
    C --> F[Usable addresses: 10.0.0.1 - 10.0.0.254]
    D --> G[Usable addresses: 10.0.1.1 - 10.0.1.254]
    E --> H[Usable addresses: 10.0.2.1 - 10.0.2.254]
```

## Tuning IP Allocation Performance

### Pre-allocation Settings

For Multi-Pool IPAM, configure how many IPs are pre-allocated before pods request them:

```yaml
ipam:
  mode: multi-pool
  multiPoolPreAllocation: "default=8,special-pool=4"
```

### Garbage Collection

Control how often stale CiliumEndpoint objects are garbage collected by the operator:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set operator.endpointGCInterval="5m0s"
```

## Multi-Pool IPAM

For clusters using `ipam.mode=multi-pool` that need different IP ranges for different workloads:

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumPodIPPool
metadata:
  name: special-pool
spec:
  ipv4:
    cidrs:
      - "172.16.0.0/16"
    maskSize: 24
```

## Verification

```bash
# Check IPAM status
cilium status | grep IPAM

# View per-node allocations
kubectl get ciliumnodes -o json | \
  jq '.items[] | {name: .metadata.name, podCIDRs: .spec.ipam.podCIDRs}'

# Check IP utilization
cilium status --verbose | grep -A10 "IPAM"

# Verify no IP exhaustion
kubectl get events --field-selector reason=FailedScheduling | grep -i "ip"
```

## Troubleshooting

- **Pods stuck waiting for IP**: Check if the node CIDR pool is exhausted. Add another CIDR to `clusterPoolIPv4PodCIDRList`; changing `clusterPoolIPv4MaskSize` on an existing cluster is not supported.
- **IP address conflicts**: Ensure cluster CIDR does not overlap with node, service, or external networks.
- **Slow pod startup**: In Multi-Pool or cloud-provider IPAM modes, pre-allocation may be too conservative. Check operator logs for allocation latency.
- **IPAM mode change**: Changing IPAM modes requires cluster recreation. Plan this during initial setup.

## Conclusion

Cilium IPAM operational configuration directly affects pod scheduling speed and IP address efficiency. Choose your CIDR ranges and mask sizes based on cluster scale, tune mode-specific pre-allocation for your workload churn rate, and monitor IP utilization to prevent exhaustion. These operational details are easy to overlook but critical for production stability.
