# How to Migrate On-Premises NFS File Shares to Google Cloud Filestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, NFS, Storage, Migration

Description: Learn how to plan and execute a migration from on-premises NFS file shares to Google Cloud Filestore with minimal disruption.

---

Many organizations still rely heavily on NFS file shares for shared storage - application configurations, user home directories, media files, legacy application data. When moving to Google Cloud, Filestore is the natural landing zone for these workloads because it is a fully managed NFS service that speaks the same protocol your applications already use. The migration itself is straightforward but requires careful planning around data volume, access patterns, and cutover timing.

## Understanding Filestore Tiers

Before migrating, you need to pick the right Filestore tier. Google offers several options:

- **Basic HDD** - lowest cost, suitable for file sharing and backups (throughput: up to 180 MB/s)
- **Basic SSD** - better performance for general workloads (throughput: up to 1.2 GB/s)
- **Zonal** - high performance with zonal availability (throughput: up to 4.8 GB/s)
- **Enterprise** - regional availability with snapshots and backups (throughput: up to 1.2 GB/s)

```bash
# Create a Filestore instance - Basic SSD tier
gcloud filestore instances create my-filestore \
  --zone us-central1-a \
  --tier BASIC_SSD \
  --file-share name=shared_data,capacity=2TB \
  --network name=my-vpc

# Create a high-performance Filestore instance for demanding workloads
gcloud filestore instances create my-hp-filestore \
  --zone us-central1-a \
  --tier ZONAL \
  --file-share name=app_data,capacity=10TB \
  --network name=my-vpc

# Verify the instance is ready and get the IP address
gcloud filestore instances describe my-filestore \
  --zone us-central1-a \
  --format="table(name, networks[0].ipAddresses[0], fileShares[0].name, fileShares[0].capacityGb)"
```

## Planning the Migration

### Inventory Your NFS Shares

Start by documenting what you have on-premises:

```bash
# On your NFS server, check exported shares
showmount -e localhost

# Check current usage per share
df -h /exports/*

# Count files and measure data volume
find /exports/shared_data -type f | wc -l
du -sh /exports/shared_data

# Check for hard links, symlinks, and special files that might need handling
find /exports/shared_data -type l -o -type p -o -type s | head -20
```

Document these details for each share:

- Total data size
- Number of files
- Largest individual files
- Access patterns (read-heavy, write-heavy, mixed)
- Number of connected clients
- Required permissions and ownership
- Any special NFS mount options clients use

### Network Connectivity

Your migration approach depends on how data gets from on-premises to GCP:

- **Cloud VPN or Interconnect** - transfer data over your existing private connection
- **Transfer Appliance** - for very large datasets (hundreds of TB) where network transfer would take too long
- **gsutil/gcloud storage** - upload to Cloud Storage first, then copy to Filestore

For most migrations under 10 TB, transferring over Cloud VPN or Interconnect works well.

## Migration Method 1 - Direct rsync

The simplest approach is to use rsync directly from the on-premises NFS server to the Filestore instance. This requires network connectivity between on-premises and GCP (via VPN or Interconnect).

First, set up a transfer VM in GCP that can access both networks:

```bash
# Create a VM in the same VPC as Filestore
gcloud compute instances create transfer-vm \
  --zone us-central1-a \
  --machine-type n2-standard-8 \
  --network my-vpc \
  --subnet default \
  --image-family ubuntu-2204-lts \
  --image-project ubuntu-os-cloud

# SSH into the transfer VM
gcloud compute ssh transfer-vm --zone us-central1-a

# Mount the Filestore instance on the transfer VM
sudo mkdir -p /mnt/filestore
sudo mount 10.0.0.2:/shared_data /mnt/filestore

# Verify the mount
df -h /mnt/filestore
```

Then run rsync from the on-premises NFS server to the Filestore mount:

```bash
# Initial sync - this transfers all data
# -a preserves permissions, ownership, timestamps, and symlinks
# -v provides verbose output
# -z compresses data during transfer
# --progress shows transfer progress
rsync -avz --progress \
  /exports/shared_data/ \
  transfer-vm:/mnt/filestore/

# For large transfers, use screen or tmux to keep the session alive
screen -S migration
rsync -avz --progress --partial \
  /exports/shared_data/ \
  transfer-vm:/mnt/filestore/
```

Run rsync multiple times before the final cutover. The first run transfers everything. Subsequent runs only transfer changed files, making each run faster.

## Migration Method 2 - Via Cloud Storage

For larger datasets or when direct connectivity is limited, you can stage data in Cloud Storage:

```bash
# Upload data to Cloud Storage using parallel transfers
gcloud storage cp -r /exports/shared_data/ gs://my-migration-bucket/shared_data/ \
  --parallel-composite-upload-threshold=150M

# Then on the transfer VM, copy from GCS to Filestore
# Using gcsfuse to mount the GCS bucket
gcsfuse my-migration-bucket /mnt/gcs
rsync -av /mnt/gcs/shared_data/ /mnt/filestore/
```

## Migration Method 3 - Transfer Appliance

For datasets exceeding 20 TB where network transfer would take weeks, Google's Transfer Appliance is a physical device shipped to your data center:

```bash
# Order a Transfer Appliance through the GCP Console
# Transfer Appliance comes in two sizes:
# - TA40: 40 TB capacity
# - TA300: 300 TB capacity

# After data is loaded onto the appliance and shipped back to Google,
# data lands in a Cloud Storage bucket
# Then transfer to Filestore using the VM-based approach above
```

## Handling Permissions and Ownership

NFS file permissions need to match between source and target. Filestore supports standard POSIX permissions:

```bash
# Ensure UIDs and GIDs match between on-premises and GCP VMs
# On the transfer VM, verify that rsync preserved permissions
ls -la /mnt/filestore/
find /mnt/filestore -maxdepth 1 -exec stat --format="%n %U:%G %a" {} \;

# If UIDs/GIDs differ, you may need to remap them
# Create matching users/groups on GCP VMs or use NFS ID mapping
```

For environments that use LDAP or Active Directory for NFS authentication, you need to set up equivalent identity mapping on the GCP side. This could mean:

- Running an LDAP server on GCP
- Using Google Cloud Identity with Managed Microsoft AD
- Configuring idmapd on client VMs

## Cutover Strategy

The cutover is where timing matters. Here is a low-downtime approach:

```bash
# Step 1: Run initial rsync (can take hours/days for large datasets)
rsync -avz /exports/shared_data/ transfer-vm:/mnt/filestore/

# Step 2: Run delta syncs periodically to keep the target close to the source
# Schedule this daily or more frequently
rsync -avz --delete /exports/shared_data/ transfer-vm:/mnt/filestore/

# Step 3: During the maintenance window, stop writes to the source
# Remount the on-premises share as read-only on all clients

# Step 4: Run the final rsync to capture any remaining changes
rsync -avz --delete /exports/shared_data/ transfer-vm:/mnt/filestore/

# Step 5: Update NFS clients to mount Filestore instead of the on-premises share
# On each client VM:
sudo umount /mnt/shared_data
sudo mount 10.0.0.2:/shared_data /mnt/shared_data
```

Update /etc/fstab on all client VMs:

```bash
# Replace the old NFS mount with Filestore
# Old entry:
# nfs-server.internal:/exports/shared_data /mnt/shared_data nfs defaults 0 0

# New entry pointing to Filestore:
10.0.0.2:/shared_data /mnt/shared_data nfs defaults,rw,hard,timeo=600,retrans=3 0 0
```

## Post-Migration Validation

After cutover, verify everything is working:

```bash
# Check mount status on all clients
mount | grep filestore

# Verify file counts match
find /mnt/shared_data -type f | wc -l

# Test read and write operations
echo "test" > /mnt/shared_data/migration_test.txt
cat /mnt/shared_data/migration_test.txt
rm /mnt/shared_data/migration_test.txt

# Monitor Filestore performance in Cloud Console
gcloud filestore instances describe my-filestore \
  --zone us-central1-a
```

## Setting Up Backups

Once migrated, configure Filestore backups:

```bash
# Create a backup schedule
gcloud filestore backups create daily-backup \
  --instance my-filestore \
  --file-share shared_data \
  --instance-zone us-central1-a \
  --region us-central1
```

## Common Issues

- **Performance differences.** On-premises NFS servers with local SSDs may have lower latency than Filestore over the network. If latency-sensitive applications notice a difference, consider using the Zonal tier.
- **Capacity planning.** Filestore requires you to provision capacity upfront. Basic tier cannot shrink, only grow. Plan for growth to avoid hitting the capacity limit.
- **IP address management.** Filestore instances get an IP from your VPC. Make sure your subnet has enough IP space and that firewall rules allow NFS traffic (port 2049).

The NFS-to-Filestore migration is one of the more straightforward migrations in a cloud move because the protocol stays the same. The application does not know the difference - it just mounts an NFS share. Get the data there, update the mount points, and you are done.
