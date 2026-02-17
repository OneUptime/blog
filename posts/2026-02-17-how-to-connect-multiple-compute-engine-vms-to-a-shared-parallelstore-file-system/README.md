# How to Connect Multiple Compute Engine VMs to a Shared Parallelstore File System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Parallelstore, Compute Engine, Shared File System, High Performance Computing

Description: A practical guide to connecting multiple Google Compute Engine virtual machines to a shared Parallelstore file system for high-performance parallel data access.

---

When you are running workloads that span multiple VMs - think distributed training, genomics pipelines, or large-scale simulations - each node needs fast, consistent access to the same dataset. Traditional solutions like NFS or even Filestore can become bottlenecks once the I/O demands grow past a certain point. Google Cloud Parallelstore is built for exactly this scenario: a fully managed, high-performance parallel file system that multiple Compute Engine VMs can mount and use simultaneously.

In this post, I will walk you through the end-to-end process of creating a Parallelstore instance and connecting several Compute Engine VMs to it.

## What Is Parallelstore?

Parallelstore is Google Cloud's managed parallel file system service. Under the hood, it uses the Intel DAOS technology to deliver extremely high throughput and low latency for data-intensive workloads. Unlike Filestore (which is NFS-based), Parallelstore stripes data across multiple storage servers, so aggregate bandwidth scales with the size of the instance.

Key characteristics include:

- Throughput that scales linearly with capacity
- Sub-millisecond latency for metadata operations
- POSIX-compatible file system interface
- Native integration with Compute Engine VMs using the DAOS client

## Prerequisites

Before you begin, make sure you have:

- A GCP project with billing enabled
- The `gcloud` CLI installed and configured
- A VPC network with Private Services Access configured (Parallelstore requires this)
- Compute Engine VMs running a supported OS (Debian 12, Ubuntu 22.04, or Rocky Linux 9)

## Step 1: Enable the Parallelstore API

First, enable the Parallelstore API in your project.

```bash
# Enable the Parallelstore API for your project
gcloud services enable parallelstore.googleapis.com
```

## Step 2: Set Up Private Services Access

Parallelstore instances are deployed within your VPC using Private Services Access. If you have not already configured this, you need to allocate an IP range and create a private connection.

```bash
# Allocate an IP address range for private services
gcloud compute addresses create parallelstore-range \
  --global \
  --purpose=VPC_PEERING \
  --addresses=10.0.0.0 \
  --prefix-length=24 \
  --network=default

# Create the private connection to Google services
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=parallelstore-range \
  --network=default
```

Wait for the peering connection to complete before proceeding. This can take a few minutes.

## Step 3: Create the Parallelstore Instance

Now create the Parallelstore instance. You need to pick a capacity that matches your workload needs. Parallelstore capacity starts at 12 TiB and scales in increments of 4 TiB.

```bash
# Create a Parallelstore instance with 12 TiB capacity
gcloud parallelstore instances create my-pfs-instance \
  --location=us-central1-a \
  --capacity-gib=12288 \
  --network=default \
  --description="Shared file system for training cluster"
```

This command kicks off the provisioning process. You can check the status with:

```bash
# Check the status of the Parallelstore instance
gcloud parallelstore instances describe my-pfs-instance \
  --location=us-central1-a
```

Look for the `state` field to change to `ACTIVE` and note the `daosVersion` and `accessPoints` fields - you will need the access points when mounting.

## Step 4: Create Compute Engine VMs in the Same Zone

Your VMs must be in the same zone as the Parallelstore instance to mount it. Here is how to create a couple of test VMs.

```bash
# Create the first VM
gcloud compute instances create vm-worker-1 \
  --zone=us-central1-a \
  --machine-type=c2-standard-16 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --network=default \
  --scopes=cloud-platform

# Create the second VM
gcloud compute instances create vm-worker-2 \
  --zone=us-central1-a \
  --machine-type=c2-standard-16 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --network=default \
  --scopes=cloud-platform
```

## Step 5: Install the DAOS Client on Each VM

SSH into each VM and install the DAOS client libraries. Parallelstore uses DAOS under the hood, so you need the client package to mount the file system.

```bash
# SSH into the first VM
gcloud compute ssh vm-worker-1 --zone=us-central1-a

# Add the DAOS package repository
sudo curl -o /etc/apt/sources.list.d/daos.list \
  https://packages.daos.io/v2.4/Debian12/packages/x86_64/daos_packages.list

# Import the GPG key
curl https://packages.daos.io/RPM-GPG-KEY-2024 | sudo apt-key add -

# Update and install the DAOS client and agent
sudo apt-get update
sudo apt-get install -y daos-client daos-agent

# Enable and start the DAOS agent service
sudo systemctl enable daos_agent
sudo systemctl start daos_agent
```

Repeat these steps on `vm-worker-2`.

## Step 6: Configure the DAOS Agent

The DAOS agent on each VM needs to know where to find the Parallelstore access points. Update the agent configuration file with the access points from your Parallelstore instance.

```bash
# Get the access points from the Parallelstore instance
ACCESS_POINTS=$(gcloud parallelstore instances describe my-pfs-instance \
  --location=us-central1-a \
  --format="value(accessPoints)")

# Write the DAOS agent configuration
sudo tee /etc/daos/daos_agent.yml > /dev/null <<EOF
access_points: [$ACCESS_POINTS]
port: 10001
transport_config:
  allow_insecure: true
EOF

# Restart the agent to pick up the new configuration
sudo systemctl restart daos_agent
```

## Step 7: Mount the Parallelstore File System

With the agent configured, you can now mount the file system using `dfuse`, the DAOS FUSE client.

```bash
# Create the mount point directory
sudo mkdir -p /mnt/parallelstore

# Mount the file system using dfuse
dfuse -m /mnt/parallelstore --pool default-pool --container default-container

# Verify the mount
df -h /mnt/parallelstore
```

Run these same commands on every VM that needs access to the shared file system.

## Step 7: Verify Shared Access

Now test that files written on one VM are visible on another. On `vm-worker-1`:

```bash
# Write a test file from the first VM
echo "Hello from worker 1" > /mnt/parallelstore/test-file.txt
```

On `vm-worker-2`:

```bash
# Read the test file on the second VM
cat /mnt/parallelstore/test-file.txt
# Output: Hello from worker 1
```

If you see the content, your shared file system is working correctly.

## Performance Considerations

A few things to keep in mind for production deployments:

**Use the right machine types.** VMs with higher network bandwidth (like N2 or C2 families) will get more out of Parallelstore. The file system can deliver hundreds of GB/s of aggregate throughput, but each VM is limited by its own network bandwidth.

**Match your instance size to your I/O needs.** Parallelstore throughput scales with capacity. A 12 TiB instance delivers a baseline throughput, while a 100 TiB instance delivers significantly more. Check the documentation for exact numbers at each capacity tier.

**Keep VMs in the same zone.** Cross-zone access is not supported. All VMs must be in the same zone as the Parallelstore instance.

**Use the interception library for maximum performance.** Instead of going through FUSE, you can use the DAOS interception library (libioil) to bypass the kernel and achieve lower latency. This requires LD_PRELOAD and works with most POSIX applications:

```bash
# Use the interception library for better performance
export LD_PRELOAD=/usr/lib64/libioil.so
# Now run your application - it will use DAOS directly
python train.py --data-dir /mnt/parallelstore/dataset
```

## Automating the Setup

If you are deploying many VMs, consider using a startup script or a custom image with the DAOS client pre-installed. Here is a snippet you can add to your instance template:

```bash
# Startup script for auto-mounting Parallelstore
#!/bin/bash
apt-get update && apt-get install -y daos-client daos-agent

# Configure and start the agent
cat > /etc/daos/daos_agent.yml <<EOF
access_points: [10.0.0.2, 10.0.0.3, 10.0.0.4]
port: 10001
transport_config:
  allow_insecure: true
EOF

systemctl enable daos_agent && systemctl start daos_agent

# Mount the file system
mkdir -p /mnt/parallelstore
dfuse -m /mnt/parallelstore --pool default-pool --container default-container
```

## Cleanup

When you are done, unmount the file system and delete the resources:

```bash
# Unmount on each VM
fusermount -u /mnt/parallelstore

# Delete the Parallelstore instance
gcloud parallelstore instances delete my-pfs-instance \
  --location=us-central1-a

# Delete the VMs
gcloud compute instances delete vm-worker-1 vm-worker-2 \
  --zone=us-central1-a
```

## Wrapping Up

Parallelstore fills a real gap in the GCP storage lineup. For workloads that need multiple VMs reading and writing to the same dataset with high throughput, it is a much better fit than Filestore or Cloud Storage FUSE. The setup involves a few more steps than a simple NFS mount, but the performance gains are substantial - especially for AI training, HPC simulations, and other data-intensive parallel workloads.
