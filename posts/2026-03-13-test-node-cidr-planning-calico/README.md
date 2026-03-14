# Test Node CIDR Planning with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, CIDR, Planning, Kubernetes, Networking, IPAM, Testing

Description: Validate your Kubernetes node CIDR planning in combination with Calico IPAM to ensure sufficient address space for your cluster size and avoid common IP exhaustion scenarios.

---

## Introduction

Node CIDR planning is the process of allocating IP address ranges for Kubernetes node-level networking - the IPs assigned to the nodes themselves - in coordination with the pod CIDR used by Calico IPAM for pod IP assignment. Poor CIDR planning leads to unexpected IP exhaustion, routing conflicts between node IPs and pod IPs, or insufficient capacity when the cluster scales.

The Kubernetes `--cluster-cidr` flag and Calico's IP pool CIDR must be coordinated carefully. The cluster CIDR (used by kube-controller-manager to assign per-node pod CIDRs in some configurations) must be distinct from node IP ranges and service CIDRs. When Calico manages IPAM directly (as it does in most deployments), the coordination is between Calico IP pool CIDRs and the rest of your network addressing.

This guide provides a framework for planning and testing node CIDR configurations before production deployment, including capacity calculations, overlap detection, and scaling validation.

## Prerequisites

- Staging Kubernetes cluster with Calico v3.20+
- `calicoctl` CLI installed and configured
- Python3 for IP address math
- Understanding of your existing IP addressing (VPC, on-premises, DNS, etc.)
- Cluster admin permissions

## Step 1: Calculate Required Address Space

Perform upfront calculations to ensure your CIDR allocation is sufficient for planned cluster growth.

```python
#!/usr/bin/env python3
# cidr-calculator.py - Calculate required address space for Kubernetes cluster
import ipaddress, math

# Cluster parameters
current_nodes = 50
max_nodes_3year = 300
max_pods_per_node = 110
service_count = 500

# IP pool block size
block_prefix = 26  # /26 = 64 IPs per block

# Calculate pod address requirements
ips_per_block = 2 ** (32 - block_prefix) - 2
blocks_per_node = math.ceil(max_pods_per_node / ips_per_block)
total_pod_ips_needed = blocks_per_node * max_nodes_3year * ips_per_block
# Add 30% buffer for overhead, rescheduling, and burst
buffered_pod_ips = int(total_pod_ips_needed * 1.3)

# Calculate minimum CIDR prefix for pod pool
pod_pool_prefix = 32 - math.ceil(math.log2(buffered_pod_ips))
print(f"Pod CIDR analysis:")
print(f"  Max pods total: {max_pods_per_node * max_nodes_3year}")
print(f"  Blocks per node: {blocks_per_node}")
print(f"  Total IPs needed (with 30% buffer): {buffered_pod_ips}")
print(f"  Minimum pod CIDR prefix: /{pod_pool_prefix}")
print(f"  Recommended: /16 ({65536} IPs) for safety")
print(f"\nService CIDR analysis:")
print(f"  Services needed: {service_count}")
print(f"  Recommended service CIDR: /21 ({2048} IPs)")
```

```bash
# Run the calculator
python3 cidr-calculator.py
```

## Step 2: Check for CIDR Overlaps

Validate that planned CIDRs don't conflict with existing network addressing.

```bash
# Check existing routing table for potential conflicts
ip route show | awk '{print $1}' | grep "/" | sort -u

# Collect all existing CIDR ranges to check against
EXISTING_CIDRS=(
  "10.0.0.0/16"     # VPC CIDR
  "172.16.0.0/12"   # On-premises range
  "192.168.1.0/24"  # Management network
)

PLANNED_CIDRS=(
  "10.244.0.0/16"   # Calico pod CIDR
  "10.96.0.0/12"    # Service CIDR
)

# Check for overlaps between planned and existing CIDRs
python3 - <<EOF
import ipaddress

existing = [ipaddress.ip_network(c) for c in [
    "10.0.0.0/16",
    "172.16.0.0/12",
    "192.168.1.0/24"
]]

planned = [ipaddress.ip_network(c) for c in [
    "10.244.0.0/16",
    "10.96.0.0/12"
]]

for p in planned:
    for e in existing:
        if p.overlaps(e):
            print(f"CONFLICT: Planned {p} overlaps with existing {e}")
        else:
            print(f"OK: Planned {p} does not overlap with existing {e}")
EOF
```

## Step 3: Test CIDR Configuration in Staging

Apply and validate the planned CIDR configuration in your staging cluster.

```yaml
# ippool-production-sizing.yaml - IP pool with production-validated sizing
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-pod-cidr
spec:
  # /16 provides 65536 IPs - sufficient for 300 nodes at 110 pods/node
  cidr: 10.244.0.0/16
  # /26 blocks for 110 max pods/node requires 2 blocks per node
  blockSize: 26
  ipipMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
```

```bash
# Apply the IP pool
calicoctl apply -f ippool-production-sizing.yaml

# Deploy test workloads to use ~50% of planned capacity
kubectl create deployment cidr-scale-test \
  --image=nginx:1.25 \
  --replicas=500

# Monitor IP utilization
calicoctl ipam show
# Verify utilization is at expected percentage of pool capacity

# Check no blocks are exhausted
calicoctl ipam show --show-blocks | grep "IPs:"
```

## Step 4: Test CIDR Behavior at Scale Boundaries

Test what happens as the cluster approaches CIDR boundaries.

```bash
# Calculate the warning threshold (80% utilization)
python3 -c "
pool_size = 65536  # /16 pool
current_pods = 500
warning_threshold = int(pool_size * 0.8)
critical_threshold = int(pool_size * 0.95)
print(f'Pod count at 80% utilization: {warning_threshold}')
print(f'Pod count at 95% utilization: {critical_threshold}')
print(f'Current utilization: {current_pods/pool_size*100:.1f}%')
"

# Deploy up to 80% utilization to test allocation behavior at scale
# (adjust replicas based on your cluster size)
kubectl scale deployment cidr-scale-test --replicas=800

# Verify IPAM still functions correctly near threshold
calicoctl ipam check
calicoctl ipam show --show-blocks

# Clean up
kubectl delete deployment cidr-scale-test
```

## Best Practices

- Plan for at least 3 years of cluster growth when sizing CIDRs - CIDR migrations are high-risk and disruptive
- Add at least 50% buffer above the expected maximum pod count to handle burst scaling and block fragmentation
- Reserve separate, non-overlapping CIDRs for pods, services, and nodes with clear documentation of each range's purpose
- Verify CIDR plans with network architects who have visibility into existing on-premises routing tables and planned network expansions
- Set up Prometheus alerts for pod CIDR utilization at 70% and 85% thresholds to give adequate warning before exhaustion
- Test CIDR calculations with actual Calico block size settings - the usable IPs per block is slightly less than the theoretical maximum

## Conclusion

Thorough node CIDR planning and testing before production deployment prevents IP exhaustion scenarios that are expensive to remediate. By performing accurate capacity calculations, checking for overlaps with existing infrastructure, and validating the CIDR configuration under load in staging, you establish a solid addressing foundation that supports your cluster's growth over its operational lifetime.
