# How to Manage Azure NetApp Files Capacity Pools and Service Levels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, NetApp Files, Capacity Pools, Service Levels, Storage Management, Performance Tuning

Description: Learn how to manage Azure NetApp Files capacity pools, change service levels, resize pools, and optimize costs while maintaining performance.

---

Azure NetApp Files uses a two-tier resource model: capacity pools contain volumes, and the capacity pool's service level determines the performance characteristics of all volumes within it. Getting this right is important because it directly affects both cost and performance. Too little capacity and your workloads hit limits. Too much and you are paying for performance you do not use.

This guide covers how to create, resize, and manage capacity pools, how to move volumes between service levels, and strategies for cost optimization.

## Understanding the Capacity Pool Model

Every Azure NetApp Files volume must belong to a capacity pool. The capacity pool defines:

1. **Service level**: Determines throughput per TiB (Standard, Premium, or Ultra)
2. **Size**: The total provisioned capacity available to volumes in the pool
3. **QoS type**: Either auto (throughput scales with volume size) or manual (you assign throughput explicitly)

Here is how the service levels compare:

| Service Level | Throughput per TiB | Typical Use Cases |
|--------------|-------------------|------------------|
| Standard | 16 MiB/s | Backup targets, cold data, dev/test |
| Premium | 64 MiB/s | General production, databases, VDI |
| Ultra | 128 MiB/s | High-performance databases, analytics, HPC |

A 1 TiB volume in a Premium pool gets 64 MiB/s throughput. A 4 TiB volume in the same pool gets 256 MiB/s. Throughput scales linearly with volume size.

## Step 1: Create a Capacity Pool

Create a capacity pool with the service level that matches your workload requirements:

```bash
# Create a Standard tier pool for dev/test workloads
az netappfiles pool create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-standard \
  --location eastus2 \
  --size 4 \
  --service-level Standard

# Create a Premium tier pool for production workloads
az netappfiles pool create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --location eastus2 \
  --size 4 \
  --service-level Premium

# Create an Ultra tier pool for high-performance workloads
az netappfiles pool create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-ultra \
  --location eastus2 \
  --size 4 \
  --service-level Ultra
```

The `--size` parameter is in TiB. The minimum pool size is 4 TiB for all service levels, and the maximum is 500 TiB.

## Step 2: Create Volumes in the Pool

With the pool created, add volumes:

```bash
# Create a 2 TiB NFS volume in the Premium pool
az netappfiles volume create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --location eastus2 \
  --service-level Premium \
  --usage-threshold 2048 \
  --file-path "appdata" \
  --vnet vnet-production \
  --subnet snet-netapp \
  --protocol-types NFSv3

# Create a 500 GiB volume in the same pool
az netappfiles volume create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-config \
  --location eastus2 \
  --service-level Premium \
  --usage-threshold 500 \
  --file-path "config" \
  --vnet vnet-production \
  --subnet snet-netapp \
  --protocol-types NFSv3
```

The total volume sizes in a pool cannot exceed the pool's capacity. In this example, we have 2.5 TiB of volumes in a 4 TiB pool, leaving 1.5 TiB available.

## Step 3: Resize a Capacity Pool

If your volumes need more space, or you want to add new volumes, expand the capacity pool:

```bash
# Expand the pool from 4 TiB to 8 TiB
az netappfiles pool update \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --size 8
```

Pool expansion is online and non-disruptive. Volumes continue serving data without interruption.

To shrink a pool, you must first ensure the total volume allocation fits within the new size:

```bash
# Check total volume usage in the pool
az netappfiles volume list \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --query "[].{name:name, sizeGiB:usageThreshold}" \
  --output table

# Shrink the pool (only works if total volume allocation <= new size)
az netappfiles pool update \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --size 4
```

## Step 4: Change a Volume's Service Level

One of the most powerful features is the ability to move volumes between service levels without downtime. This is useful when workload requirements change.

For example, a volume that was initially in a Premium pool for testing might be moved to Standard for cost savings in production if the performance requirements turn out to be lower than expected. Or a Standard volume might need to be promoted to Ultra during a burst workload.

```bash
# Move a volume from Premium to Ultra pool
# First, make sure the destination pool has enough capacity
az netappfiles volume pool-change \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --new-pool-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-ultra"
```

This operation moves the volume from the Premium pool to the Ultra pool. The volume remains accessible during the move, and its mount path does not change. Clients do not need to remount.

The reverse is also possible - move a volume to a lower tier:

```bash
# Move from Ultra back to Premium (for cost reduction)
az netappfiles volume pool-change \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-ultra \
  --volume-name vol-app-data \
  --new-pool-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium"
```

## Step 5: Use Manual QoS for Fine-Grained Control

By default, pools use auto QoS, where throughput is automatically assigned based on volume size. Manual QoS lets you explicitly assign throughput to each volume, independent of its size.

This is useful when you have a small volume that needs high throughput, or a large volume that does not need much throughput.

```bash
# Create a pool with manual QoS
az netappfiles pool create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-manual-qos \
  --location eastus2 \
  --size 4 \
  --service-level Premium \
  --qos-type Manual
```

With manual QoS, the total throughput available in the pool is: pool size (TiB) x service level throughput per TiB. For a 4 TiB Premium pool: 4 x 64 = 256 MiB/s total.

Assign throughput to individual volumes:

```bash
# Create a small volume with high throughput
az netappfiles volume create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-manual-qos \
  --volume-name vol-hot-data \
  --location eastus2 \
  --service-level Premium \
  --usage-threshold 100 \
  --throughput-mibps 200 \
  --file-path "hotdata" \
  --vnet vnet-production \
  --subnet snet-netapp \
  --protocol-types NFSv3

# Create a large volume with modest throughput
az netappfiles volume create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-manual-qos \
  --volume-name vol-archive \
  --location eastus2 \
  --service-level Premium \
  --usage-threshold 3500 \
  --throughput-mibps 56 \
  --file-path "archive" \
  --vnet vnet-production \
  --subnet snet-netapp \
  --protocol-types NFSv3
```

In this example, the 100 GiB volume gets 200 MiB/s (which would require 3.1 TiB with auto QoS), while the 3.5 TiB volume gets only 56 MiB/s. The total throughput (256 MiB/s) stays within the pool's capacity.

## Step 6: Monitor Pool and Volume Utilization

Keep track of how your pools are being used:

```bash
# List all pools with their utilization
az netappfiles pool list \
  --resource-group rg-netapp \
  --account-name na-production \
  --query "[].{name:name, serviceLevel:serviceLevel, sizeTiB:size, qosType:qosType}" \
  --output table

# List volumes in a pool with their sizes
az netappfiles volume list \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --query "[].{name:name, quotaGiB:usageThreshold, throughputMibps:throughputMibps}" \
  --output table
```

Use Azure Monitor for ongoing monitoring:

```bash
# Query pool utilization metrics
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium" \
  --metric "VolumePoolAllocatedUsed" "VolumePoolAllocatedSize" \
  --interval PT1H \
  --output table
```

## Cost Optimization Strategies

Here are practical ways to reduce Azure NetApp Files costs:

**Right-size your pools**: Do not provision more capacity than you need. Remember, you pay for the full pool size, not just the volume allocations. Regularly review pool utilization and shrink pools where possible.

**Use tiered service levels**: Not every workload needs Ultra performance. Use Standard for dev/test, Premium for general production, and Ultra only for truly performance-sensitive workloads.

**Schedule service level changes**: If workloads have predictable patterns (high performance during business hours, low at night), script service level changes:

```bash
#!/bin/bash
# Move volume to Ultra during business hours, back to Premium at night

HOUR=$(date +%H)

if [ "$HOUR" -ge 8 ] && [ "$HOUR" -lt 18 ]; then
    # Business hours - promote to Ultra
    az netappfiles volume pool-change \
      --resource-group rg-netapp \
      --account-name na-production \
      --pool-name pool-premium \
      --volume-name vol-app-data \
      --new-pool-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-ultra"
else
    # Off-hours - demote to Premium
    az netappfiles volume pool-change \
      --resource-group rg-netapp \
      --account-name na-production \
      --pool-name pool-ultra \
      --volume-name vol-app-data \
      --new-pool-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium"
fi
```

**Use manual QoS** to avoid over-provisioning capacity just for throughput. A 100 GiB volume that needs 200 MiB/s throughput would require a 3.1 TiB allocation in an auto QoS pool, but only 100 GiB in a manual QoS pool.

## Wrapping Up

Managing Azure NetApp Files capacity pools effectively is about matching performance to workload requirements while controlling costs. Use auto QoS pools for straightforward deployments where volume size naturally correlates with performance needs. Switch to manual QoS when you need fine-grained control over throughput allocation. Take advantage of the ability to move volumes between service levels without downtime to adapt to changing workload demands. And monitor your utilization regularly to ensure you are not paying for capacity or performance you do not use.
