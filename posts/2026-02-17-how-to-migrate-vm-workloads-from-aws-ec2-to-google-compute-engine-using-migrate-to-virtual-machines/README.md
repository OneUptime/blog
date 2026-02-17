# How to Migrate VM Workloads from AWS EC2 to Google Compute Engine Using Migrate to Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Migration, Compute Engine, AWS EC2, Migrate to Virtual Machines

Description: A practical guide to migrating VM workloads from AWS EC2 to Google Compute Engine using GCP's Migrate to Virtual Machines service with minimal downtime.

---

Moving virtual machines from AWS to GCP sounds like it should be straightforward - after all, a VM is just a disk image and some configuration. In practice, there are networking differences, driver changes, boot loader adjustments, and a dozen other things that can go wrong. GCP's Migrate to Virtual Machines (M2VM) service handles most of this complexity for you.

M2VM connects to your AWS account, replicates EC2 instances to GCP in the background, and lets you cut over when you are ready. The replication is continuous, so the target VM stays close to the source until you do the final migration. In this post, I will walk through the full migration process.

## How Migrate to Virtual Machines Works

The migration process has several phases:

```mermaid
flowchart LR
    A[Add Source] --> B[Create Migration]
    B --> C[Continuous Replication]
    C --> D[Test Clone]
    D --> E[Cutover]
    E --> F[Running on GCE]

    style C fill:#4285f4,stroke:#333,color:#fff
```

1. **Add Source**: Connect M2VM to your AWS account
2. **Create Migration**: Select EC2 instances and configure target settings
3. **Continuous Replication**: Data streams from AWS to GCP in the background
4. **Test Clone**: Create a test VM on GCP to validate before cutover
5. **Cutover**: Final sync and switch to the GCP VM

## Prerequisites

- A GCP project with Compute Engine and VM Migration APIs enabled
- An AWS account with the EC2 instances you want to migrate
- AWS IAM credentials with appropriate permissions for M2VM
- Network connectivity between AWS and GCP (VPN or interconnect recommended for large migrations)

## Step 1: Enable Required APIs

```bash
# Enable the VM Migration API and related services
gcloud services enable vmmigration.googleapis.com \
  compute.googleapis.com \
  servicemanagement.googleapis.com \
  --project=PROJECT_ID
```

## Step 2: Create an AWS Source

Configure M2VM to connect to your AWS account. You need AWS credentials with permissions to describe and snapshot EC2 instances.

Create the source via the Cloud Console or gcloud:

```bash
# Create an AWS migration source
gcloud migration vms sources create aws-source \
  --location=us-central1 \
  --project=PROJECT_ID \
  --aws-source-details='{
    "accessKeyCreds": {
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    },
    "awsRegion": "us-east-1"
  }'
```

For production use, I strongly recommend using a dedicated IAM role with minimal permissions rather than access keys. The M2VM documentation lists the exact permissions needed.

## Step 3: Discover EC2 Instances

Once the source is connected, M2VM discovers your EC2 instances:

```bash
# List discovered EC2 instances available for migration
gcloud migration vms sources migrating-vms list \
  --source=aws-source \
  --location=us-central1 \
  --project=PROJECT_ID
```

This shows you all EC2 instances in the connected region with details like instance type, disk sizes, and OS.

## Step 4: Create a Target Configuration

Before starting the migration, define where and how the VMs should run on GCP:

```bash
# Create a target project and network configuration
gcloud migration vms target-projects create my-target \
  --location=us-central1 \
  --target-project=TARGET_PROJECT_ID \
  --project=PROJECT_ID
```

## Step 5: Start a Migration

Create the migration for a specific EC2 instance. This begins the continuous replication:

```bash
# Create a migration for an EC2 instance
gcloud migration vms migrating-vms create my-ec2-migration \
  --source=aws-source \
  --location=us-central1 \
  --source-vm-id=i-0123456789abcdef0 \
  --project=PROJECT_ID \
  --compute-engine-target-defaults='{
    "vmName": "migrated-web-server",
    "zone": "us-central1-a",
    "machineType": "e2-standard-4",
    "networkInterfaces": [{
      "network": "projects/PROJECT_ID/global/networks/default",
      "subnetwork": "projects/PROJECT_ID/regions/us-central1/subnetworks/default"
    }],
    "serviceAccount": "default",
    "diskType": "pd-ssd",
    "labels": {
      "migration-source": "aws",
      "environment": "production"
    }
  }'
```

Key configuration decisions:

- **Machine type mapping**: An m5.xlarge on AWS maps roughly to e2-standard-4 on GCP (4 vCPUs, 16 GB RAM). Check the GCP machine type comparison for your specific instance types.
- **Disk type**: Use `pd-ssd` for production workloads, `pd-standard` for cost optimization.
- **Network**: Make sure the target network has the right firewall rules for your workload.

## Step 6: Monitor Replication Progress

Check the replication status:

```bash
# Check migration status and replication progress
gcloud migration vms migrating-vms describe my-ec2-migration \
  --source=aws-source \
  --location=us-central1 \
  --project=PROJECT_ID
```

The replication goes through these stages:

- `PENDING_REPLICATION`: Migration created, replication not started
- `ACTIVE`: Replication in progress
- `REPLICATING`: Data is being copied
- `REPLICATED`: Initial replication complete, continuous sync active

Monitor the data transfer to estimate when replication will complete:

```bash
# List all active migrations with their replication status
gcloud migration vms migrating-vms list \
  --source=aws-source \
  --location=us-central1 \
  --project=PROJECT_ID \
  --format="table(name, currentSyncInfo.progress, state)"
```

## Step 7: Create a Test Clone

Before cutting over, create a test clone to validate the migration:

```bash
# Create a test clone of the migrated VM
gcloud migration vms migrating-vms clone-jobs create test-clone-1 \
  --migrating-vm=my-ec2-migration \
  --source=aws-source \
  --location=us-central1 \
  --project=PROJECT_ID
```

The test clone creates a Compute Engine VM from the latest replicated data. You can:

- SSH into it and verify the OS boots correctly
- Check that applications start properly
- Test network connectivity
- Validate data integrity
- Run smoke tests

The test clone does not affect the source EC2 instance or the ongoing replication.

## Step 8: Perform the Cutover

When you are satisfied with the test clone, perform the final cutover:

```bash
# Initiate the cutover - this is the point of no return
gcloud migration vms migrating-vms cutover-jobs create final-cutover \
  --migrating-vm=my-ec2-migration \
  --source=aws-source \
  --location=us-central1 \
  --project=PROJECT_ID
```

During cutover:

1. M2VM performs a final data sync to capture any changes since the last replication cycle
2. A Compute Engine VM is created from the fully synced data
3. The VM starts up on GCP

The cutover window (downtime) depends on the amount of data that changed since the last sync. With continuous replication, this is usually small.

## Step 9: Post-Migration Tasks

After cutover, there are a few things to take care of:

**Update DNS records** to point to the new GCP VM's IP address:

```bash
# Get the new VM's external IP
gcloud compute instances describe migrated-web-server \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)" \
  --project=PROJECT_ID
```

**Install the GCP guest agent** if it was not installed automatically:

```bash
# SSH into the migrated VM and install the guest agent
sudo apt-get update && sudo apt-get install -y google-guest-agent
```

**Update monitoring and alerting** to use GCP's Cloud Monitoring instead of CloudWatch.

**Review firewall rules** to make sure the Compute Engine firewall rules match what the AWS security groups allowed.

**Clean up AWS resources** once you have verified everything is working on GCP. Keep the EC2 instance as a fallback for a reasonable period before terminating it.

## Tips for Large-Scale Migrations

**Migrate in waves.** Do not try to move everything at once. Start with non-critical workloads, learn from the experience, and then tackle production.

**Plan network connectivity.** For large data transfers, a VPN or Dedicated Interconnect between AWS and GCP significantly speeds up replication and reduces costs compared to going over the public internet.

**Map instance types carefully.** AWS and GCP instance types do not map one-to-one. Benchmark your workloads on the target machine type to make sure performance is acceptable.

**Test thoroughly.** Use the test clone feature for every migration. It is much easier to fix issues in a test clone than to debug a failed production cutover.

**Watch for licensing.** Some software licenses are tied to AWS (like certain Windows Server or SQL Server licenses). Make sure your licenses work on GCP or plan for new licensing.

## Summary

Migrate to Virtual Machines makes the AWS-to-GCP migration manageable by handling continuous data replication, driver adaptation, and VM creation. Connect your AWS account as a source, start migrations for your EC2 instances, let replication run until it catches up, validate with test clones, and cut over when ready. The continuous replication approach minimizes downtime, and the test clone feature lets you validate everything before committing.
