# How to Use calicoctl ipam configure with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Kubernetes, Networking, IP Address Management, DevOps

Description: Learn how to use calicoctl ipam configure to manage IP address allocation settings in a Calico cluster.

---

## Introduction

Calico uses its own IP Address Management (IPAM) system to allocate IP addresses to workloads. The `calicoctl ipam configure` command allows you to adjust IPAM settings such as the number of IP addresses reserved per node and the strict affinity mode for IP block allocation.

Proper IPAM configuration is critical for cluster scalability and efficient IP address utilization. Misconfigured IPAM settings can lead to IP address exhaustion, uneven distribution across nodes, or routing issues when nodes are decommissioned.

This guide covers practical uses of `calicoctl ipam configure` to tune IPAM behavior for your cluster requirements.

## Prerequisites

- Kubernetes cluster with Calico IPAM enabled
- `calicoctl` configured with datastore access
- Understanding of your cluster IP address requirements
- Admin access to modify Calico configuration

## Viewing Current IPAM Configuration

Before making changes, check the current configuration:

```bash
calicoctl ipam configure show
```

Example output:

```
StrictAffinity: false
MaxBlocksPerHost: 0 (unlimited)
```

## Enabling Strict Affinity

Strict affinity ensures that IP blocks allocated to a node are only used by that node. This is useful when running Calico alongside other networking solutions or when using direct server return (DSR) load balancing:

```bash
calicoctl ipam configure --strictaffinity=true
```

Verify the change:

```bash
calicoctl ipam configure show
```

Output:

```
StrictAffinity: true
MaxBlocksPerHost: 0 (unlimited)
```

### When to Use Strict Affinity

Strict affinity is recommended when:

- Running Calico in a hybrid environment with other CNI plugins
- Using Calico with AWS VPC networking
- You need predictable IP-to-node mapping for firewall rules
- Running in environments where borrowed IP blocks cause routing issues

## Configuring Maximum Blocks Per Host

Limit the number of CIDR blocks a node can claim to prevent a single node from consuming too many IP addresses. The `maxBlocksPerHost` setting is configured through the IPAMConfiguration resource:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: false
  maxBlocksPerHost: 4
EOF
```

This limits each node to a maximum of 4 IP blocks. With the default block size of /26 (64 addresses), this gives each node up to 256 IP addresses.

## Combining Configuration Options

You can set strict affinity via the CLI and max blocks per host via the IPAMConfiguration resource:

```bash
calicoctl ipam configure --strictaffinity=true

calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 8
EOF
```

Verify both settings applied:

```bash
calicoctl ipam configure show
```

Output:

```
StrictAffinity: true
MaxBlocksPerHost: 8
```

## Planning IP Capacity

Calculate your IP capacity based on the configuration:

```bash
#!/bin/bash
BLOCK_SIZE=64  # Default /26 block
MAX_BLOCKS=$(calicoctl ipam configure show | grep MaxBlocksPerHost | awk '{print $2}')
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

if [ "$MAX_BLOCKS" = "0" ]; then
  echo "MaxBlocksPerHost: unlimited"
  echo "IP capacity is limited only by pool size"
else
  IPS_PER_NODE=$((BLOCK_SIZE * MAX_BLOCKS))
  TOTAL_CAPACITY=$((IPS_PER_NODE * NODE_COUNT))
  echo "IPs per node: $IPS_PER_NODE"
  echo "Total cluster capacity: $TOTAL_CAPACITY"
  echo "Node count: $NODE_COUNT"
fi
```

## Adjusting Configuration for Cluster Growth

When scaling a cluster, you may need to adjust IPAM settings. Here is a script to evaluate and recommend changes:

```bash
#!/bin/bash
echo "=== Current IPAM Configuration ==="
calicoctl ipam configure show

echo ""
echo "=== Current IPAM Usage ==="
calicoctl ipam show

echo ""
echo "=== Node Count ==="
kubectl get nodes --no-headers | wc -l

echo ""
echo "=== IP Pool Summary ==="
calicoctl get ippools -o yaml | grep -E 'cidr|blockSize'
```

## Resetting to Defaults

To reset IPAM configuration to default values:

```bash
calicoctl ipam configure --strictaffinity=false

calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: false
  maxBlocksPerHost: 0
EOF
```

A value of 0 for `maxBlocksPerHost` means unlimited.

## Verification

After changing IPAM configuration, verify the settings and check that existing workloads are unaffected:

```bash
# Check configuration
calicoctl ipam configure show

# Verify workloads still have IP addresses
kubectl get pods -A -o wide | grep -v Completed | head -20

# Check IPAM allocations are consistent
calicoctl ipam show
```

## Troubleshooting

- **Pods stuck in ContainerCreating**: If `maxblocksperhost` is too low, nodes may run out of IP blocks. Increase the limit or add more IP pools.
- **Strict affinity causing issues**: Enabling strict affinity on an existing cluster may cause borrowed blocks to not be reclaimed. Drain and restart nodes gradually.
- **Configuration not taking effect**: Changes to IPAM configuration may require Felix to restart. Check Felix logs for configuration reload messages.
- **IP exhaustion after enabling strict affinity**: Strict affinity can lead to less efficient IP utilization. Monitor usage with `calicoctl ipam show` and add IP pools if needed.

## Conclusion

The `calicoctl ipam configure` command gives you control over how Calico allocates IP addresses across your cluster. Setting strict affinity and maximum blocks per host helps ensure predictable IP distribution and prevents resource imbalance. Regularly review your IPAM configuration as your cluster grows to maintain efficient IP address utilization.
