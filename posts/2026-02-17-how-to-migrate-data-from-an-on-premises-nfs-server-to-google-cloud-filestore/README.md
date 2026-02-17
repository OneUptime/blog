# How to Migrate Data from an On-Premises NFS Server to Google Cloud Filestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, NFS, Migration, Data Transfer

Description: A practical guide to migrating data from on-premises NFS servers to Google Cloud Filestore using rsync, Transfer Service, and other tools for reliable data migration.

---

Moving from an on-premises NFS server to Google Cloud Filestore is a common step in cloud migration projects. The good news is that both sides speak NFS, so the migration is really about getting the data across the network reliably. The bad news is that NFS data migrations can be slow and tricky, especially when dealing with large datasets, deep directory structures, and files with special permissions.

In this post, I will cover several migration approaches, from simple rsync for small datasets to more sophisticated tools for large-scale migrations.

## Planning the Migration

Before you start copying data, take stock of what you are dealing with:

```bash
# On the source NFS server, check total data size
du -sh /exports/data

# Count total files and directories
find /exports/data -type f | wc -l
find /exports/data -type d | wc -l

# Check for special file types (symlinks, hard links, etc.)
find /exports/data -type l | wc -l
```

Knowing the data size, file count, and file types helps you choose the right migration tool and estimate how long the transfer will take.

## Setting Up Network Connectivity

Your on-premises network needs to reach the Filestore instance in GCP. Filestore only has private IP addresses, so you need one of these connectivity options:

- **Cloud VPN** - Sets up an encrypted tunnel between your on-premises network and GCP. Good for most migrations.
- **Cloud Interconnect** - A dedicated physical connection. Better for large datasets because of higher bandwidth.
- **Transfer VM** - A Compute Engine VM that acts as a bridge. Mount both the source NFS and destination Filestore on the same VM.

For most migrations, the Transfer VM approach is the simplest. Create a VM in GCP, mount both the source NFS (over VPN) and the Filestore share, and copy data locally on the VM.

## Approach 1 - rsync (Small to Medium Datasets)

For datasets up to a few terabytes, rsync is the simplest and most reliable tool. It handles incremental transfers, preserves permissions, and can resume interrupted transfers.

First, set up a transfer VM that can reach both the source and destination:

```bash
# Create a transfer VM in the same zone as your Filestore instance
gcloud compute instances create transfer-vm \
  --zone=us-central1-a \
  --machine-type=n2-standard-8 \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

SSH into the VM and mount both filesystems:

```bash
# Install NFS client utilities
sudo apt-get update && sudo apt-get install -y nfs-common

# Mount the source NFS server (over VPN or Interconnect)
sudo mkdir -p /mnt/source
sudo mount -t nfs on-prem-nfs-server:/exports/data /mnt/source

# Mount the destination Filestore instance
sudo mkdir -p /mnt/destination
sudo mount -t nfs 10.0.0.2:/vol1 /mnt/destination
```

Now run rsync to copy the data:

```bash
# Copy data with rsync, preserving permissions and timestamps
# -a: archive mode (preserves permissions, ownership, timestamps, symlinks)
# -v: verbose output
# -P: show progress and allow resuming
# --delete: remove files from destination that do not exist in source
sudo rsync -avP --delete /mnt/source/ /mnt/destination/
```

For large transfers, I recommend running rsync in a screen or tmux session so it survives SSH disconnections:

```bash
# Start rsync in a tmux session
tmux new -s migration
sudo rsync -avP /mnt/source/ /mnt/destination/
# Press Ctrl+B then D to detach
# Reconnect later with: tmux attach -t migration
```

## Approach 2 - Parallel rsync (Large Datasets)

If you have millions of files, a single rsync process can be painfully slow. You can speed things up by running multiple rsync processes in parallel, each handling a different subdirectory:

```bash
# List top-level directories and run parallel rsync for each
# This script starts up to 8 parallel rsync processes
ls /mnt/source/ | xargs -P 8 -I {} \
  rsync -avP /mnt/source/{} /mnt/destination/
```

For a more controlled approach, create a script that distributes the work:

```bash
#!/bin/bash
# parallel-rsync.sh - Run multiple rsync processes in parallel
# Usage: ./parallel-rsync.sh /mnt/source /mnt/destination 8

SOURCE=$1
DEST=$2
PARALLEL=$3

# Get list of top-level directories
dirs=$(ls -1 "$SOURCE")

# Run rsync for each directory in parallel
echo "$dirs" | xargs -P "$PARALLEL" -I {} bash -c \
  "echo 'Starting: {}' && rsync -avP '$SOURCE/{}' '$DEST/' && echo 'Done: {}'"
```

## Approach 3 - Google Transfer Service for On-Premises Data

For very large migrations (tens of terabytes or more), Google provides the Transfer Service for on-premises data. This is a more sophisticated tool that manages the transfer pipeline, handles retries, and provides progress tracking.

Install the transfer agent on a machine that can access the source NFS:

```bash
# Pull the transfer agent container image
docker pull gcr.io/cloud-ingest/tsop-agent:latest

# Run the transfer agent
docker run --rm -d \
  --name=transfer-agent \
  -v /exports/data:/transfer/source:ro \
  -v /tmp/agent-logs:/tmp/agent-logs \
  gcr.io/cloud-ingest/tsop-agent:latest \
  --project-id=my-project \
  --agent-pool=my-pool \
  --mount-directories=/transfer/source
```

Then create a transfer job through the console or API that moves data from the on-premises source to a Cloud Storage bucket. From there, you can copy the data to Filestore.

## Approach 4 - gcloud Storage Transfer to GCS then to Filestore

Another approach is to use gsutil or gcloud to transfer data to Cloud Storage first, then use a VM to copy from GCS to Filestore:

```bash
# Step 1: Upload from on-premises to Cloud Storage
gsutil -m rsync -r /exports/data gs://migration-bucket/data/

# Step 2: On a GCP VM, mount Filestore and download from GCS
sudo mount -t nfs 10.0.0.2:/vol1 /mnt/destination
gsutil -m rsync -r gs://migration-bucket/data/ /mnt/destination/
```

The `-m` flag enables parallel transfers, which significantly speeds up the process for many files.

## Handling Permissions and Ownership

NFS permissions are based on UID/GID numbers. If your on-premises users have UID 1000 and GID 1000, those same numbers need to exist on the machines mounting Filestore in GCP.

Check permissions before and after migration:

```bash
# Check file ownership on the source
ls -la /mnt/source/ | head -20

# Compare with destination after migration
ls -la /mnt/destination/ | head -20
```

If UIDs/GIDs differ between your on-premises and GCP environments, you may need to do a chown pass after migration:

```bash
# Remap ownership if UIDs changed in the cloud environment
sudo find /mnt/destination -user 1000 -exec chown 2000 {} \;
sudo find /mnt/destination -group 1000 -exec chgrp 2000 {} \;
```

## Validating the Migration

After the transfer completes, validate that all data arrived correctly:

```bash
# Compare file counts
echo "Source files: $(find /mnt/source -type f | wc -l)"
echo "Dest files:   $(find /mnt/destination -type f | wc -l)"

# Compare total size
echo "Source size: $(du -sh /mnt/source)"
echo "Dest size:   $(du -sh /mnt/destination)"

# Do a dry-run rsync to check for differences
rsync -avnc /mnt/source/ /mnt/destination/
```

The dry-run rsync with the checksum flag (`-c`) will identify any files that differ between source and destination without transferring anything.

## Cutover Strategy

For minimal downtime, do the migration in two phases:

1. **Initial bulk transfer** - Copy all data while the source NFS is still active. This can take hours or days.
2. **Final incremental sync** - Stop writes to the source NFS, run one last rsync to catch up changes since the bulk transfer, then switch applications to Filestore.

The final incremental sync is usually fast because only the changed files need to be transferred.

```bash
# Final incremental sync (run after stopping writes to source)
sudo rsync -avP --delete /mnt/source/ /mnt/destination/
```

## Cleanup

After the migration is validated and applications are running on Filestore:

1. Delete the transfer VM
2. Remove Cloud Storage migration buckets if used
3. Decommission the on-premises NFS server (after a suitable observation period)
4. Update DNS or service discovery to point at the new storage

Migrating NFS data to Filestore is not glamorous, but rsync makes it reliable. Start the bulk transfer early, plan for the final cutover, and validate everything before decommissioning the old server.
