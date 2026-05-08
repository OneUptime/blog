# How to Use calicoctl ipam configure with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, Networking, IP Address Management, DevOps

Description: Learn how to use calicoctl ipam configure to manage IP address allocation settings in a Calico cluster.

---

## Introduction

Calico uses its own IP Address Management (IPAM) system to allocate IP addresses to workloads. The `calicoctl ipam configure` command allows you to adjust IPAM settings such as the maximum number of IP blocks that can be affine to a node and the strict affinity mode for IP block allocation.

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
calicoctl ipam show --show-configuration
```

Example output:

```text
+--------------------+-------+
| PROPERTY           | VALUE |
+--------------------+-------+
| StrictAffinity     | false |
| AutoAllocateBlocks | true  |
| MaxBlocksPerHost   | 0     |
+--------------------+-------+
```

## Enabling Strict Affinity

Strict affinity ensures that IP blocks allocated to a node are only used by that node. This is useful when running Calico alongside other networking solutions or when using direct server return (DSR) load balancing:

```bash
calicoctl ipam configure --strictaffinity=true
```

Verify the change:

```bash
calicoctl ipam show --show-configuration
```

Output:

```text
+--------------------+-------+
| PROPERTY           | VALUE |
+--------------------+-------+
| StrictAffinity     | true  |
| AutoAllocateBlocks | true  |
| MaxBlocksPerHost   | 0     |
+--------------------+-------+
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
  strictAffinity: true
  maxBlocksPerHost: 4
EOF
```

This limits each node to a maximum of 4 IP blocks. With the default block size of /26 (64 addresses), this gives each node up to 256 IP addresses.

## Combining Configuration Options

You can set strict affinity and max blocks per host through the CLI:

```bash
calicoctl ipam configure --strictaffinity=true --max-blocks-per-host=8
```

Or configure both settings through the IPAMConfiguration resource:

```bash
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
calicoctl ipam show --show-configuration
```

Output:

```text
+--------------------+-------+
| PROPERTY           | VALUE |
+--------------------+-------+
| StrictAffinity     | true  |
| AutoAllocateBlocks | true  |
| MaxBlocksPerHost   | 8     |
+--------------------+-------+
```

## Planning IP Capacity

Calculate your IP capacity based on the configuration:

```bash
#!/bin/bash
BLOCK_SIZE=64  # Default /26 block
MAX_BLOCKS=$(calicoctl get ipamconfiguration default -o yaml | awk '/maxBlocksPerHost:/ {print $2}')
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

if [ -z "$MAX_BLOCKS" ] || [ "$MAX_BLOCKS" = "0" ]; then
  echo "MaxBlocksPerHost: using Calico default allocation safeguard"
  echo "Check your Calico version's IPAMConfiguration defaults before planning maximum density"
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
calicoctl ipam show --show-configuration

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

A value of 0 for `maxBlocksPerHost` means no explicit global limit is set; Calico's allocation logic still applies its default safeguard when needed.

## Verification

After changing IPAM configuration, verify the settings and check that existing workloads are unaffected:

```bash
# Check configuration

calicoctl ipam show --show-configuration

# Verify workloads still have IP addresses
kubectl get pods -A -o wide | grep -v Completed | head -20

# Check IPAM allocations are consistent
calicoctl ipam show
```

## Troubleshooting

- **Pods stuck in ContainerCreating**: If `maxBlocksPerHost` is too low, nodes may run out of IP blocks. Increase the limit or add more IP pools.
- **Strict affinity causing issues**: Check for borrowed IPs with `calicoctl ipam show --show-borrowed` before enabling strict affinity in an existing cluster. Drain or restart affected workloads gradually if you need to clear borrowed allocations.
- **Configuration not taking effect**: Confirm `calicoctl` is connected to the correct datastore and inspect `calicoctl get ipamconfiguration default -o yaml`.
- **IP exhaustion after enabling strict affinity**: Strict affinity can lead to less efficient IP utilization. Monitor usage with `calicoctl ipam show` and add IP pools if needed.

## Conclusion

The `calicoctl ipam configure` command gives you control over how Calico allocates IP addresses across your cluster. Setting strict affinity and maximum blocks per host helps ensure predictable IP distribution and prevents resource imbalance. Regularly review your IPAM configuration as your cluster grows to maintain efficient IP address utilization.
