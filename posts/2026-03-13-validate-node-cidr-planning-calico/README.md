# Validate Node CIDR Planning with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, CIDR, Networking

Description: Learn how to validate your node CIDR planning with Calico IPAM to ensure sufficient IP space, avoid overlaps, and support future cluster growth.

---

## Introduction

Planning IP address ranges for Kubernetes nodes is a foundational networking task that affects cluster scalability, routing complexity, and integration with existing enterprise networks. Calico's IP Address Management (IPAM) system allocates pod IPs from IP pools that are subdivided into per-node blocks, making CIDR planning directly tied to both node capacity and pod density.

Poor CIDR planning manifests as IP exhaustion, routing table bloat, or conflicts with on-premises infrastructure. Validating your node CIDR configuration before scaling the cluster prevents these failures from affecting production workloads.

This guide covers how to inspect and validate node CIDR allocations in Calico, identify potential issues, and confirm that your IP pool design supports your intended cluster size.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI configured with cluster access
- `kubectl` configured with cluster admin permissions
- Understanding of your intended cluster size and pod density

## Step 1: Inspect Existing IP Pools

Review the current Calico IP pool configuration to understand the available address space.

```bash
# List all Calico IP pools and their CIDR ranges
calicoctl get ippools -o wide

# Get detailed IP pool configuration including block size and node selectors
calicoctl get ippool default-ipv4-ippool -o yaml
```

## Step 2: Check Per-Node Block Allocations

Calico subdivides IP pools into fixed-size blocks assigned to individual nodes. Inspect current block allocation.

```bash
# List all IPAM blocks and their assigned nodes
calicoctl ipam show --show-blocks

# Show a summary of IP utilization across the cluster
calicoctl ipam show

# Check utilization for a specific node
calicoctl ipam show --show-blocks | grep <node-name>
```

## Step 3: Calculate Required IP Space

Validate that your CIDR provides enough addresses for your intended scale.

```bash
# Show current IP allocation summary with counts
calicoctl ipam show

# Check how many blocks are currently allocated vs available
calicoctl ipam show --show-blocks | grep -c "Block"

# Inspect node annotations to see per-node IPAM data
kubectl get node <node-name> -o jsonpath='{.metadata.annotations}' | python3 -m json.tool
```

## Step 4: Validate Block Size Configuration

Ensure the block size is appropriate for your expected pod density per node.

```yaml
# ippool-validated.yaml — example IP pool with explicit block size
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  # blockSize 26 = 64 IPs per node block; adjust based on max pods per node
  blockSize: 26
  ipipMode: Always
  natOutgoing: true
  disabled: false
```

```bash
# Apply and validate the updated pool configuration
calicoctl apply -f ippool-validated.yaml

# Verify the change took effect
calicoctl get ippool default-ipv4-ippool -o yaml | grep blockSize
```

## Step 5: Check for CIDR Conflicts

Validate that the pod CIDR does not overlap with node network or external ranges.

```bash
# Check node IP addresses to confirm no overlap with pod CIDR
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[*].address}{"\n"}{end}'

# Verify the cluster CIDR matches what Calico is using
kubectl cluster-info dump | grep -m 1 "cluster-cidr"

# Check kube-proxy configuration for service CIDR
kubectl get cm -n kube-system kube-proxy -o yaml | grep clusterCIDR
```

## Best Practices

- Use a `/16` or larger pod CIDR for clusters expected to exceed 100 nodes
- Set `blockSize` to at most half the node's `max-pods` to avoid premature exhaustion
- Reserve separate IP pools for different node pools or availability zones
- Document CIDR ranges and ensure they do not overlap with VPC or on-prem subnets
- Use `calicoctl ipam show` regularly to monitor utilization trends

## Conclusion

Validating node CIDR planning in Calico requires inspecting IP pool configurations, block allocations, and utilization trends. By ensuring adequate address space, appropriate block sizing, and no CIDR conflicts before scaling, you prevent IP exhaustion and routing failures that are difficult to remediate in running clusters. Build CIDR validation into your cluster provisioning checklist.
