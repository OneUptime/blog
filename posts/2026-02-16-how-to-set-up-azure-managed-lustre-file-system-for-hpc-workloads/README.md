# How to Set Up Azure Managed Lustre File System for HPC Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Lustre, HPC, High Performance Computing, File System, Parallel Storage, Cloud HPC

Description: Step-by-step instructions for deploying Azure Managed Lustre to provide high-throughput parallel file storage for HPC and AI workloads.

---

High-performance computing workloads have storage requirements that regular file shares simply cannot meet. When you are running simulations, training machine learning models, or processing genomics data, you need a file system that can deliver hundreds of gigabytes per second of throughput and handle millions of IOPS. Azure Managed Lustre is a fully managed implementation of the Lustre parallel file system designed exactly for these scenarios. This guide walks through setting it up from scratch.

## What Is Lustre and Why Use It in Azure?

Lustre is an open-source parallel file system that has been the standard in HPC for over two decades. It is used by most of the world's top supercomputers. The key design principle is that data is striped across multiple storage servers, so clients can read and write in parallel, achieving aggregate throughput that scales linearly with the number of servers.

Azure Managed Lustre takes this technology and wraps it in a managed service. You do not need to deploy, configure, or maintain any Lustre infrastructure. You just specify the capacity and throughput you need, and Azure provisions the cluster.

The main use cases are:

- **HPC simulations**: Computational fluid dynamics, weather modeling, finite element analysis
- **AI/ML training**: Loading large training datasets into GPU clusters at high speed
- **Genomics**: Processing sequencing data that involves reading thousands of files in parallel
- **Media rendering**: Rendering farms that need fast access to texture and scene files

## Prerequisites

Before creating a Managed Lustre cluster, you need:

1. An Azure subscription with the ability to create resources
2. A virtual network with a dedicated subnet for the Lustre cluster
3. The subnet must have at least a /24 CIDR block (256 addresses) available
4. No NSG (Network Security Group) or service endpoints on the Lustre subnet
5. The Azure HPC resource provider registered in your subscription

Register the resource provider if you have not already:

```bash
# Register the Azure Managed Lustre resource provider
az provider register --namespace Microsoft.StorageCache

# Check registration status - wait until it shows "Registered"
az provider show --namespace Microsoft.StorageCache --query "registrationState"
```

## Creating the Virtual Network and Subnet

If you do not have an existing virtual network, create one with a dedicated subnet for Lustre:

```bash
# Create a resource group for the HPC environment
az group create \
  --name hpc-resources \
  --location eastus

# Create a virtual network
az network vnet create \
  --resource-group hpc-resources \
  --name hpc-vnet \
  --address-prefix 10.0.0.0/16 \
  --location eastus

# Create a dedicated subnet for the Lustre cluster
# This subnet should not have any NSGs attached
az network vnet subnet create \
  --resource-group hpc-resources \
  --vnet-name hpc-vnet \
  --name lustre-subnet \
  --address-prefix 10.0.1.0/24
```

The Lustre subnet needs to be isolated from other workloads in terms of network configuration. Do not attach NSGs or route tables with restrictive rules to this subnet, as it can interfere with the Lustre protocol.

## Deploying the Managed Lustre Cluster

You can create a Managed Lustre cluster through the Azure Portal or CLI. Here is the CLI approach:

```bash
# Create an Azure Managed Lustre file system
# SKU determines the throughput per TiB of storage
az amlfs create \
  --resource-group hpc-resources \
  --name hpc-lustre-cluster \
  --location eastus \
  --sku "AMLFS-Durable-Premium-250" \
  --storage-capacity 48 \
  --zones 1 \
  --filesystem-subnet "/subscriptions/{sub-id}/resourceGroups/hpc-resources/providers/Microsoft.Network/virtualNetworks/hpc-vnet/subnets/lustre-subnet"
```

Let's break down the key parameters:

- **sku**: Determines the performance tier. `AMLFS-Durable-Premium-250` provides 250 MB/s throughput per TiB of storage. Other SKUs include `AMLFS-Durable-Premium-125` for lower throughput at lower cost.
- **storage-capacity**: The total capacity in TiB. Must be a multiple of the SKU's increment (usually 4 TiB for Premium-250).
- **zones**: The availability zone within the region.
- **filesystem-subnet**: The full resource ID of the subnet where the Lustre endpoints will be created.

Provisioning takes 15-30 minutes. You can check the status with:

```bash
# Check the provisioning status
az amlfs show \
  --resource-group hpc-resources \
  --name hpc-lustre-cluster \
  --query "provisioningState"
```

## Connecting Compute Nodes to the Lustre Cluster

Once the cluster is provisioned, you need to mount it on your compute nodes. The compute nodes must be in a virtual network that can reach the Lustre subnet (either the same VNet or a peered one).

First, get the mount information:

```bash
# Get the Lustre cluster's mount command details
az amlfs show \
  --resource-group hpc-resources \
  --name hpc-lustre-cluster \
  --query "{mgsAddress: mgsAddress, mountCommand: mountCommand}"
```

On each compute node, install the Lustre client and mount the file system:

```bash
# Install Lustre client packages on Ubuntu 22.04
# These packages provide the kernel modules needed to mount Lustre
sudo apt-get update
sudo apt-get install -y lustre-client-modules-$(uname -r) lustre-client-utils

# Load the Lustre kernel module
sudo modprobe lustre

# Create the mount point
sudo mkdir -p /lustre

# Mount the Lustre file system
# Replace the MGS address with the one from the az amlfs show output
sudo mount -t lustre 10.0.1.4@tcp:/lustrefs /lustre

# Verify the mount
df -h /lustre
```

For production deployments, add the mount to `/etc/fstab` so it persists across reboots:

```bash
# Add Lustre mount to fstab for persistence
# The 'noauto,_netdev' options prevent mount issues during boot
echo "10.0.1.4@tcp:/lustrefs /lustre lustre defaults,noauto,_netdev 0 0" | sudo tee -a /etc/fstab
```

## Integrating with Azure Blob Storage

One of the most powerful features of Azure Managed Lustre is its ability to import data from Azure Blob Storage and export data back. This lets you use blob storage for long-term, cost-effective storage while using Lustre for high-performance computation.

### Setting Up the Blob Integration

You can configure a blob container as a data source during or after cluster creation:

```bash
# Create an import job to pull data from blob storage into Lustre
az amlfs archive create \
  --resource-group hpc-resources \
  --amlfs-name hpc-lustre-cluster \
  --archive-name "training-data" \
  --filesystem-path "/data/training" \
  --storage-account-url "https://mystorageaccount.blob.core.windows.net" \
  --container-name "training-datasets" \
  --logging-container-name "lustre-logs"
```

This creates a link between the Lustre path `/data/training` and the blob container. Data is lazy-loaded - when a compute node accesses a file, it is fetched from blob storage on first access and then served from Lustre's high-speed cache for subsequent reads.

### Exporting Results Back to Blob Storage

After your computation completes, export the results back to blob storage:

```bash
# Archive data from Lustre back to blob storage
az amlfs archive --resource-group hpc-resources --amlfs-name hpc-lustre-cluster
```

## Performance Tuning

To get the most out of your Lustre cluster, consider these tuning tips:

### Stripe Settings

Lustre distributes file data across Object Storage Targets (OSTs). You can control how files are striped to optimize for your access pattern:

```bash
# Set the stripe count for a directory
# A higher stripe count means more parallelism for large files
sudo lfs setstripe -c 4 -S 4M /lustre/large-files/

# For many small files, use a stripe count of 1 to avoid overhead
sudo lfs setstripe -c 1 /lustre/small-files/
```

### Monitor Cluster Performance

Check the cluster's health and performance:

```bash
# View OST usage and balance
lfs df -h /lustre

# Check stripe information for a specific file
lfs getstripe /lustre/data/training/dataset.tar
```

### Right-Size the Cluster

The total throughput of your Lustre cluster is capacity times per-TiB throughput. For example, a 48 TiB cluster with the Premium-250 SKU delivers 48 x 250 = 12,000 MB/s (about 12 GB/s) of aggregate throughput. Size the cluster based on your throughput needs, not just storage capacity.

## Cost Management

Managed Lustre is priced per TiB per hour, and the cost is significant compared to blob storage. Here are strategies to manage costs:

- **Ephemeral clusters**: Create the Lustre cluster when you start a computation and delete it when done. Import data from blob storage at the start, export results at the end.
- **Right-size aggressively**: Do not provision more capacity than your workload needs. A 16 TiB cluster is much cheaper than a 48 TiB one.
- **Use blob integration**: Store your primary data in blob storage (which is cheap) and only bring it into Lustre during active computation.

## Cleanup

When your HPC job is complete and you have exported results to blob storage, delete the Lustre cluster to stop incurring charges:

```bash
# Delete the Managed Lustre cluster
# Make sure you have exported any important data first
az amlfs delete \
  --resource-group hpc-resources \
  --name hpc-lustre-cluster \
  --yes
```

Azure Managed Lustre fills a specific niche - workloads that need parallel file system performance without the operational burden of managing Lustre infrastructure. If your HPC or AI workloads are bottlenecked on storage throughput, it is worth evaluating. The blob integration makes it practical to use ephemeral clusters for burst computing while keeping your data in cost-effective blob storage long term.
