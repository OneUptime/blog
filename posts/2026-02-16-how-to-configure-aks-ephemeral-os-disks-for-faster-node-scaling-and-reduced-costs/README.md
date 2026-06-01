# How to Configure AKS Ephemeral OS Disks for Faster Node Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Ephemeral OS Disks, Kubernetes, Performance, Cost Optimization, Azure, Node Pool

Description: Learn how to configure AKS with ephemeral OS disks for faster node boot times, lower latency, and reduced storage costs.

---

Every AKS node has an OS disk, and by default that disk is a managed Azure disk stored remotely in Azure Storage. Every read and write to the OS disk goes over the network to the storage backend, adding latency. Ephemeral OS disks change this by using the VM's local SSD or temp disk for the OS. The disk lives on the physical machine hosting your VM, so reads and writes are local and fast. The tradeoff is that the data is lost if the VM is deallocated or reimaged - but for AKS nodes, that is perfectly fine since node state should be disposable anyway.

## Why Ephemeral OS Disks Matter

The performance difference is real and measurable. Here is what you get:

**Faster node boot times.** Creating a managed disk involves an API call to Azure Storage, provisioning the disk, and attaching it. With ephemeral disks, the OS image is copied to the local SSD, which is significantly faster. Nodes boot 30-50% quicker, which directly affects scaling speed.

**Lower read/write latency.** Container image pulls, log writes, and OS operations hit the local SSD instead of going over the network. This reduces P99 latency for IO-heavy operations.

**No disk costs.** Managed OS disks cost money - a 128GB Premium SSD runs about $19/month per node. With 100 nodes, that is $1,900/month just for OS disks you can eliminate.

**Faster reimaging.** When a node needs to be reimaged (for updates or recovery), ephemeral disks make the process much faster since there is no remote disk to detach and reattach.

## How Ephemeral OS Disks Work

Ephemeral OS disks can be placed in three locations, depending on the VM size:

**OS cache** - Uses the VM's OS disk cache. This is available on older VM sizes that have a cache disk. The cache size depends on the VM size.

**Resource disk (temp disk)** - Uses the VM's temporary disk. This is available on VM sizes that have a temp disk, such as diskful v5 SKUs.

**NVMe disk** - Uses local NVMe storage. This is available on supported v6 and newer VM series.

The OS image is written to the chosen location at VM creation time. All subsequent reads and writes happen locally. When the VM is deallocated, the data is gone. But since AKS nodes are managed by node pools and can be recreated at any time, this is expected behavior.

## Prerequisites

You need an AKS cluster and Azure CLI. The VM size you choose must support ephemeral OS disks, and the OS disk size must fit within the cache, temp disk, or NVMe disk size of the VM.

## Step 1: Check VM Size Compatibility

Not all VM sizes support ephemeral OS disks. The VM's cache, temp disk, or NVMe disk must be large enough to hold the OS image (typically 128GB for AKS).

```bash
# Check local temp storage for a specific VM size

az vm list-sizes \
  --location eastus \
  --query "[?name=='Standard_D4ds_v5'].{name:name, tempStorageMb:resourceDiskSizeInMb, vcpus:numberOfCores, memoryMb:memoryInMb}" \
  --output table

# Common VM sizes that support ephemeral OS disks:
# Standard_D4ds_v5 - 150GB temp disk
# Standard_D8ds_v5 - 300GB temp disk
# Standard_D16ds_v5 - 600GB temp disk
# Standard_E4bds_v5 - 150GB temp disk
# Standard_E8bds_v5 - 300GB temp disk
```

As a rule of thumb, choose VM sizes that explicitly support ephemeral OS disks and have enough local storage for the OS disk. The `d` in newer v5 SKU names, such as `Standard_D4ds_v5`, indicates local temp storage is present; plain `Standard_D4s_v5` and `Standard_E4s_v5` do not have local temp storage and do not support ephemeral OS disks.

## Step 2: Create a New AKS Cluster with Ephemeral OS Disks

When creating a new cluster, specify ephemeral OS disks for the default node pool.

```bash
# Create an AKS cluster with ephemeral OS disks
az aks create \
  --resource-group myResourceGroup \
  --name aks-ephemeral \
  --node-count 3 \
  --node-vm-size Standard_D4ds_v5 \
  --node-osdisk-type Ephemeral \
  --node-osdisk-size 128 \
  --generate-ssh-keys
```

The `--node-osdisk-type Ephemeral` flag is all it takes. If the VM size does not support ephemeral disks, the command will fail with an error telling you why.

## Step 3: Add a Node Pool with Ephemeral OS Disks

For existing clusters, add new node pools with ephemeral OS disks.

```bash
# Add a node pool with ephemeral OS disks
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name aks-ephemeral \
  --name fastpool \
  --node-count 3 \
  --node-vm-size Standard_D8ds_v5 \
  --node-osdisk-type Ephemeral \
  --node-osdisk-size 128

# Verify the node pool configuration
az aks nodepool show \
  --resource-group myResourceGroup \
  --cluster-name aks-ephemeral \
  --name fastpool \
  --query "osDiskType" -o tsv
```

## Step 4: Choose the Placement Location

AKS chooses the ephemeral OS disk placement based on the VM SKU. On newer diskful v5 SKUs, ephemeral OS disks use the resource disk because there is no dedicated cache disk. If you need a larger OS disk, choose a VM size with enough temp or NVMe storage.

```bash
# Use a VM size with enough temp disk for a 128GB ephemeral OS disk
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name aks-ephemeral \
  --name temppool \
  --node-count 3 \
  --node-vm-size Standard_D4ds_v5 \
  --node-osdisk-type Ephemeral \
  --node-osdisk-size 128
```

The `kubeletDiskType` setting is separate from OS disk placement. It controls where kubelet data such as container images and `emptyDir` volumes are stored; it does not force the ephemeral OS disk placement.

## Step 5: Verify the Configuration

After the nodes are running, verify that ephemeral disks are in use.

```bash
# Check the OS disk type for nodes in the pool
az aks nodepool show \
  --resource-group myResourceGroup \
  --cluster-name aks-ephemeral \
  --name fastpool \
  --query "{osDiskType: osDiskType, osDiskSizeGB: osDiskSizeGb, vmSize: vmSize}" -o json

# SSH into a node and check disk configuration
kubectl debug node/<node-name> -it --image=mcr.microsoft.com/cbl-mariner/base/core:2.0
# Inside the debug pod:
chroot /host
lsblk
df -h
```

With ephemeral OS disks, the root filesystem is backed by the VM's local cache, temp, or NVMe storage depending on the VM size.

## Performance Comparison

Here is a comparison of disk performance between managed and ephemeral OS disks.

```mermaid
graph LR
    subgraph Managed OS Disk
    A[VM] -->|Network| B[Azure Storage]
    B -->|Read/Write| C[Managed Disk]
    end
    subgraph Ephemeral OS Disk
    D[VM] -->|Local| E[Cache, Temp, or NVMe Storage]
    end
```

Typical benchmarks vary by VM size and disk tier. For example, a 128GB Premium SSD P10 managed disk has a 500 IOPS baseline, while a `Standard_D4ds_v5` temp disk is rated for 19,000 random-read IOPS:

| Metric | Managed Premium SSD | Ephemeral OS Disk |
|--------|-------------------|-------------------|
| Read/write path | Network-attached managed disk | Local VM storage |
| IOPS example | 500 baseline for P10 | 19,000 random-read IOPS on Standard_D4ds_v5 temp disk |
| Node boot time | 3-5 min | 1.5-3 min |

The improvement in container image pull times is particularly noticeable. Images stored on the local SSD load much faster than from a managed disk.

## Step 6: Migrate Existing Node Pools

You cannot change an existing node pool's OS disk type in place. To migrate, create a new pool with ephemeral disks, move your workloads, and delete the old pool.

```bash
# Create a new pool with ephemeral disks
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name aks-ephemeral \
  --name newpool \
  --node-count 3 \
  --node-vm-size Standard_D4ds_v5 \
  --node-osdisk-type Ephemeral

# Cordon the old pool to prevent new pods from scheduling
kubectl cordon -l agentpool=oldpool

# Drain the old pool to move pods to the new pool
kubectl drain -l agentpool=oldpool \
  --ignore-daemonsets \
  --delete-emptydir-data

# Delete the old node pool
az aks nodepool delete \
  --resource-group myResourceGroup \
  --cluster-name aks-ephemeral \
  --name oldpool
```

## Considerations and Limitations

**Data is not persistent.** Anything written to the OS disk is lost on VM deallocation, reimaging, or during a host maintenance event that moves the VM. Do not store important data on the OS disk. Use persistent volumes for stateful workloads.

**OS disk size is limited by local storage size.** If you need a large OS disk (for example, for storing many container images), make sure the VM's cache, temp disk, or NVMe disk is large enough. The Standard_D4ds_v5 has a 150GB temp disk, which can fit the default 128GB AKS OS disk.

**Not all VM sizes support ephemeral disks.** Some burstable B-series VMs and smaller VM sizes do not have sufficient local storage for the OS disk size you choose. Check the VM specifications before choosing.

**Container images are pulled fresh on new nodes.** Since the local disk is empty when a node is created, all container images must be pulled from the registry. Pre-pulling images or using proximity placement groups with the registry can help mitigate this.

## Cost Savings Calculation

Here is a quick cost comparison for a 50-node cluster running for a year.

```text
Managed Premium SSD (128GB P10):
  50 nodes x $19.71/month = $985.50/month = $11,826/year

Ephemeral OS Disk:
  $0/year (included in VM cost)

Annual savings: $11,826
```

For larger clusters, the savings scale linearly. A 200-node cluster saves over $47,000 per year on OS disk costs alone, on top of the performance improvements.

Ephemeral OS disks are one of those optimizations that give you better performance and lower costs at the same time. Unless you have a specific reason to keep data on the OS disk between reimages (which you should not for AKS nodes), ephemeral disks should be the default choice for all your node pools.
