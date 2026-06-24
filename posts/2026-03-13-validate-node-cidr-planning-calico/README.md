# Validate Node CIDR Planning with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, CIDR, Networking

Description: Learn how to validate your node CIDR planning with Calico IPAM to ensure sufficient IP space, avoid overlaps, and support future cluster growth.

---

## Introduction

Planning IP address ranges for Kubernetes pods is a foundational networking task that affects cluster scalability, routing complexity, and integration with existing enterprise networks. Calico's IP Address Management (IPAM) system allocates pod IPs from IP pools that are subdivided into per-node blocks, making CIDR planning directly tied to both node capacity and pod density.

Poor CIDR planning manifests as IP exhaustion, routing table bloat, or conflicts with on-premises infrastructure. Validating your pod CIDR and Calico IP pool configuration before scaling the cluster prevents these failures from affecting production workloads.

This guide covers how to inspect and validate Calico IP pool and block allocations, identify potential issues, and confirm that your IP pool design supports your intended cluster size.

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
# List IPAM pools and allocated blocks
calicoctl ipam show --show-blocks

# Show a summary of IP utilization across the cluster
calicoctl ipam show

# In Kubernetes datastore clusters, inspect block affinities to map blocks to nodes
kubectl get blockaffinities.crd.projectcalico.org -o wide
```

## Step 3: Calculate Required IP Space

Validate that your CIDR provides enough addresses for your intended scale.

```bash
# Show current IP allocation summary with counts
calicoctl ipam show

# Check how many blocks are currently allocated
calicoctl ipam show --show-blocks | grep -c "Block"

# If your cluster also allocates Kubernetes node PodCIDRs, inspect them separately
# Calico IPAM does not normally use Node.spec.podCIDR for pod IP allocation
kubectl get node <node-name> -o jsonpath='{.spec.podCIDR}{"\n"}'
```

## Step 4: Validate Block Size Configuration

Ensure the block size is appropriate for your expected pod density per node.

```yaml
# ippool-validated.yaml - example new IP pool with explicit block size
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: planned-ipv4-pool
spec:
  cidr: 192.168.0.0/16
  # blockSize 26 = 64 IPs per allocation block; adjust based on pod density and node count
  blockSize: 26
  ipipMode: Always
  natOutgoing: true
  disabled: false
```

```bash
# Create the pool before workloads use it; blockSize cannot be changed on an existing IPPool
calicoctl create -f ippool-validated.yaml

# Verify the pool was created with the expected block size
calicoctl get ippool planned-ipv4-pool -o yaml | grep blockSize
```

For an existing IP pool, migrate workloads to a pool with the desired block size rather than applying a `blockSize` change in place.

## Step 5: Check for CIDR Conflicts

Validate that the pod CIDR does not overlap with node network or external ranges.

```bash
# Check node IP addresses to confirm no overlap with pod CIDR
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[*].address}{"\n"}{end}'

# Verify kube-proxy's pod CIDR setting, when detect-local-mode uses ClusterCIDR
kubectl cluster-info dump | grep -m 1 "cluster-cidr"

# On Kubernetes versions with ServiceCIDR resources, check the Service CIDR
kubectl get servicecidr
```

## Best Practices

- Use a `/16` or larger pod CIDR for clusters expected to exceed 100 nodes
- Choose a `blockSize` that leaves at least as many blocks as nodes and enough addresses per block for your expected pod density
- Reserve separate IP pools for different node pools or availability zones
- Document CIDR ranges and ensure they do not overlap with VPC or on-prem subnets
- Use `calicoctl ipam show` regularly to monitor utilization trends

## Conclusion

Validating Calico IP pool planning requires inspecting IP pool configurations, block allocations, and utilization trends. By ensuring adequate address space, appropriate block sizing, and no CIDR conflicts before scaling, you prevent IP exhaustion and routing failures that are difficult to remediate in running clusters. Build CIDR validation into your cluster provisioning checklist.
