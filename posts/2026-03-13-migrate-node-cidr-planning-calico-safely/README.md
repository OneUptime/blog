# Migrate Node CIDR Planning in Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, cidr, node-cidr, kubernetes, migration, ipam, networking, capacity-planning

Description: Learn how to safely re-plan and migrate Calico's node CIDR allocations when expanding cluster capacity, changing pod density requirements, or restructuring your IP address space.

---

## Introduction

Node CIDR planning determines how many pod IP addresses are available per node in your Kubernetes cluster. Calico allocates blocks of IPs from IP pools to nodes based on the configured block size. Incorrect block sizing leads to IP exhaustion on high-pod-density nodes or wasteful over-allocation on lightly loaded nodes.

Migrating to a new node CIDR plan requires changing IP pool block sizes or CIDR ranges—operations that cannot be done in-place on active pools. Understanding how to plan the right node CIDR sizing and execute the migration safely is critical for clusters that are scaling up or being restructured.

## Prerequisites

- Kubernetes cluster with Calico v3.x
- `calicoctl` CLI configured
- Current pod-per-node statistics and growth projections
- Cluster admin permissions

## Step 1: Assess Current Pod Density and IP Usage

Gather data on current pod density to inform your CIDR planning decisions.

```bash
# Check current IP pool block size
calicoctl get ippool -o jsonpath='{range .items[*]}{.metadata.name}{": blockSize="}{.spec.blockSize}{"\n"}{end}'

# Calculate pods per node to understand density
kubectl get pods --all-namespaces -o wide | awk '{print $8}' | sort | uniq -c | sort -rn

# Calculate how many IPs are available per block
# blockSize=26 -> 2^(32-26) = 64 IPs per block (62 usable)
# blockSize=25 -> 2^(32-25) = 128 IPs per block (126 usable)
# blockSize=24 -> 2^(32-24) = 256 IPs per block (254 usable)

# Show current block utilization across all nodes
calicoctl ipam show --show-blocks
```

## Step 2: Calculate the Required Block Size

Use node pod density plus headroom to determine the correct block size.

```bash
# Find the maximum pods per node (limited by kubelet --max-pods setting)
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.allocatable.pods}{"\n"}{end}'

# Rule of thumb for block sizing:
# Required IPs per node = max_pods_per_node * 2 (2x headroom for rolling updates)
# Block size = 32 - ceil(log2(required_ips))
#
# Example: 110 pods per node (default kubelet max)
# Required IPs: 110 * 2 = 220
# Block size: 32 - ceil(log2(256)) = 32 - 8 = 24
# Use blockSize: 24 (256 IPs per block)
```

## Step 3: Plan the New IP Pool CIDR

Size the IP pool CIDR to accommodate your current and projected node count.

```bash
# Calculate total IP space needed:
# total_ips = num_nodes * ips_per_block * 2 (2x for replacement blocks during scaling)
#
# Example:
# 50 nodes * 256 IPs/block * 2 = 25,600 IPs minimum
# Use /16 (65,536 IPs) to provide room for growth
# Or use /17 (32,768 IPs) for tighter space requirements
```

```yaml
# calico-ipam/new-node-cidr-pool.yaml - New IP pool sized for 110 pods per node, 100 nodes
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: optimized-pod-pool
spec:
  # /16 provides 65,536 IPs - sufficient for 100 nodes * 256 IPs/node with 2.5x buffer
  cidr: 172.16.0.0/16
  # blockSize: 24 gives 256 IPs per node, accommodating 110 pods + headroom
  blockSize: 24
  ipipMode: CrossSubnet
  natOutgoing: true
  disabled: false
  nodeSelector: "all()"
```

## Step 4: Migrate to the New IP Pool

Disable the old pool, enable the new one, and roll nodes to pick up new blocks.

```bash
# Create the new pool
calicoctl apply -f new-node-cidr-pool.yaml

# Disable the old pool to redirect new allocations
calicoctl get ippool default-ipv4-ippool -o yaml | \
  python3 -c "import sys, yaml; d=yaml.safe_load(sys.stdin); d['spec']['disabled']=True; print(yaml.dump(d))" | \
  calicoctl apply -f -

# Migrate nodes one at a time
for NODE in $(kubectl get nodes -o name | cut -d/ -f2); do
  kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data
  kubectl uncordon "$NODE"
  echo "Waiting for pods on $NODE to stabilize..."
  sleep 30
done
```

## Step 5: Validate New CIDR Allocations

After migration, confirm that nodes are receiving blocks from the new pool with the correct block size.

```bash
# Verify blocks are now from the new CIDR
calicoctl ipam show --show-blocks | grep "172.16"

# Confirm the block size is correct for each node
calicoctl ipam show --show-blocks | awk '/Blocks/{print}'

# Check that no nodes have blocks from the old pool
calicoctl ipam show --show-blocks | grep "10.244"  # Should be empty after full migration

# Run IPAM consistency check
calicoctl ipam check
```

## Best Practices

- Plan for 2x your maximum pod count per node to account for rolling updates that temporarily double pod count
- Size the total IP pool CIDR to accommodate 3-5x your current node count for future growth
- Use `/24` block size (256 IPs) for most production clusters with standard 110-pod-per-node limits
- Monitor IP exhaustion with Calico's IPAM metrics before it becomes a production issue
- Test the new block size in a staging cluster first to validate pod scheduling under load
- Document the calculation that led to your block size choice for future capacity planning

## Conclusion

Careful node CIDR planning prevents IP exhaustion and ensures Calico's IPAM can scale with your cluster. By assessing current pod density, calculating required block sizes with appropriate headroom, and migrating to a new pool incrementally, you can restructure your IP allocation strategy without disrupting running workloads.
