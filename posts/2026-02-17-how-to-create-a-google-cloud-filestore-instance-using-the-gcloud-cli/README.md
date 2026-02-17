# How to Create a Google Cloud Filestore Instance Using the gcloud CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, NFS, Storage, gcloud CLI

Description: Step-by-step instructions for creating a Google Cloud Filestore NFS instance using the gcloud command-line tool, including tier selection and network configuration.

---

Google Cloud Filestore provides managed NFS (Network File System) storage that you can mount on Compute Engine VMs, GKE pods, and other GCP services. It is the go-to option when you need a shared filesystem that multiple clients can read from and write to simultaneously. In this post, I will show you how to create a Filestore instance using the gcloud CLI, walk through the configuration options, and help you understand which settings matter for your use case.

## What Filestore Gives You

Filestore is a fully managed NFS file server. You create an instance, specify a capacity, and get an NFS endpoint that you can mount on any client in the same VPC. It handles the underlying storage infrastructure, including replication, snapshots, and performance tuning.

Common use cases include shared storage for web application content, media processing pipelines, machine learning training data, CI/CD build artifacts, and any workload where multiple VMs or pods need concurrent access to the same files.

## Prerequisites

Before creating a Filestore instance, make sure you have:

- A GCP project with billing enabled
- The gcloud CLI installed and authenticated
- The Filestore API enabled on your project
- A VPC network where the instance will be accessible

Enable the API if you have not already:

```bash
# Enable the Filestore API
gcloud services enable file.googleapis.com
```

## Creating a Basic Filestore Instance

The simplest way to create a Filestore instance is with the following command:

```bash
# Create a basic HDD Filestore instance with 1TB capacity
gcloud filestore instances create my-filestore \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=vol1,capacity=1TB \
  --network=name=default
```

Let me break down each parameter:

- `my-filestore` - The name of your instance. Must be unique within the project and zone.
- `--zone` - The zone where the instance will be created. Choose a zone close to your compute resources.
- `--tier` - The performance tier. I will cover tiers in detail below.
- `--file-share` - Defines the NFS share. You specify a name (which becomes the export path) and the capacity.
- `--network` - The VPC network the instance will be attached to.

The instance creation takes a few minutes. You can monitor progress with:

```bash
# Check the status of the instance creation
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="yaml(state,networks,fileShares)"
```

Once the state shows `READY`, you can mount the share.

## Understanding the Tiers

Filestore offers several tiers, each with different performance characteristics and pricing:

**BASIC_HDD** - The most affordable option. Provides 100 MB/s read throughput and 100 MB/s write throughput for all capacity sizes. Minimum capacity is 1 TB. Good for general-purpose file sharing where performance is not critical.

**BASIC_SSD** - Higher performance with SSD-backed storage. Provides up to 1.2 GB/s read throughput. Minimum capacity is 2.5 TB. Good for latency-sensitive workloads.

**ZONAL** - High performance with SSD storage and zonal redundancy. Starts at 1 TB minimum. Provides up to 4.8 GB/s read throughput at higher capacities. Good for production workloads that need consistent performance.

**REGIONAL** - Same performance as Zonal but with cross-zone replication for high availability. Data is replicated across two zones in the region. Minimum capacity is 1 TB.

**ENTERPRISE** - The highest tier with regional availability, snapshots, and the broadest range of capacity options. Minimum capacity is 1 TB. Designed for business-critical workloads.

Here is how to create instances at different tiers:

```bash
# Create a Basic SSD instance with 2.5TB capacity
gcloud filestore instances create my-ssd-filestore \
  --zone=us-central1-a \
  --tier=BASIC_SSD \
  --file-share=name=data,capacity=2.5TB \
  --network=name=default

# Create a Zonal (high-scale) instance
gcloud filestore instances create my-zonal-filestore \
  --zone=us-central1-a \
  --tier=ZONAL \
  --file-share=name=data,capacity=1TB \
  --network=name=default

# Create an Enterprise instance
gcloud filestore instances create my-enterprise-filestore \
  --location=us-central1 \
  --tier=ENTERPRISE \
  --file-share=name=data,capacity=1TB \
  --network=name=default
```

Note that Enterprise tier uses `--location` (a region) instead of `--zone`.

## Configuring the Network

The network configuration determines which VMs and services can access the Filestore instance. By default, any client in the specified VPC network can mount the share.

You can restrict access to a specific subnet:

```bash
# Create an instance accessible only from a specific subnet
gcloud filestore instances create my-filestore \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=vol1,capacity=1TB \
  --network=name=default,reserved-ip-range=filestore-range
```

If you want to use a specific IP address range for the Filestore instance, create a reserved range first:

```bash
# Reserve an IP range for Filestore
gcloud compute addresses create filestore-range \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=29 \
  --network=default

# Create the instance with the reserved range
gcloud filestore instances create my-filestore \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=vol1,capacity=1TB \
  --network=name=default,reserved-ip-range=filestore-range
```

## Getting the Mount Information

After the instance is created, grab the IP address and share path:

```bash
# Get the IP address and file share details
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="table(networks[0].ipAddresses[0],fileShares[0].name,fileShares[0].capacityGb)"
```

This gives you the IP address and share name you need for mounting. The mount path will be the IP address plus the share name, like `10.0.0.2:/vol1`.

## Quick Mount Test

To verify the instance works, SSH into a VM in the same VPC and mount the share:

```bash
# Install NFS client utilities
sudo apt-get update && sudo apt-get install -y nfs-common

# Create a mount point and mount the Filestore share
sudo mkdir -p /mnt/filestore
sudo mount 10.0.0.2:/vol1 /mnt/filestore

# Verify the mount
df -h /mnt/filestore
```

You should see the Filestore share mounted with the capacity you specified.

## Adding Labels for Organization

Labels help you organize and track costs across multiple Filestore instances:

```bash
# Create an instance with labels for cost tracking
gcloud filestore instances create my-filestore \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=vol1,capacity=1TB \
  --network=name=default \
  --labels=team=engineering,env=production,app=web
```

## Listing and Managing Instances

A few useful management commands:

```bash
# List all Filestore instances in the project
gcloud filestore instances list

# List instances in a specific zone
gcloud filestore instances list --zone=us-central1-a

# Delete an instance (use with caution)
gcloud filestore instances delete my-filestore --zone=us-central1-a
```

## Common Mistakes to Avoid

1. **Choosing the wrong zone** - Put the Filestore instance in the same zone as your primary compute resources. Cross-zone NFS traffic adds latency and costs.

2. **Under-provisioning capacity** - Filestore performance scales with capacity for some tiers. A larger instance may give you better throughput even if you do not need the space.

3. **Forgetting to enable the API** - The `file.googleapis.com` API must be enabled before creating instances.

4. **Using the wrong network** - If your VMs are in a custom VPC, make sure you specify that network when creating the Filestore instance.

Creating a Filestore instance with the gcloud CLI is straightforward once you understand the tier options and networking requirements. Start with BASIC_HDD for testing and development, then move to a higher tier when you need better performance for production workloads.
