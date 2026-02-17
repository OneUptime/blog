# How to Transfer Files to GCP VMs Using gcloud SCP Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, gcloud CLI, SCP, File Transfer, Compute Engine

Description: Learn how to transfer files and directories between your local machine and GCP Compute Engine instances using gcloud scp, including IAP tunneling and batch transfers.

---

Moving files between your local machine and a GCP VM is something you end up doing constantly - deploying configuration files, pulling logs, uploading data for processing. The gcloud scp command wraps the standard SCP protocol with GCP-specific features like automatic key management and IAP tunneling, making it the easiest way to transfer files to and from Compute Engine instances.

This post covers the different ways to use gcloud scp, from simple file copies to recursive directory transfers and transfers through IAP for instances without public IPs.

## Basic File Transfer

### Uploading a File to a VM

```bash
# Copy a local file to the home directory on the VM
gcloud compute scp ./config.yaml my-instance:~ \
  --zone=us-central1-a \
  --project=my-project
```

The `~` refers to the home directory of your user on the remote instance. You can also specify an absolute path:

```bash
# Copy a file to a specific directory on the VM
gcloud compute scp ./nginx.conf my-instance:/etc/nginx/nginx.conf \
  --zone=us-central1-a \
  --project=my-project
```

### Downloading a File from a VM

Reverse the order of arguments to download:

```bash
# Download a log file from the VM to your local machine
gcloud compute scp my-instance:/var/log/app/error.log ./error.log \
  --zone=us-central1-a \
  --project=my-project
```

## Transferring Directories

Use the `--recurse` flag to copy entire directories:

```bash
# Upload an entire directory to the VM
gcloud compute scp --recurse ./deploy/ my-instance:~/deploy/ \
  --zone=us-central1-a \
  --project=my-project
```

```bash
# Download an entire log directory from the VM
gcloud compute scp --recurse my-instance:/var/log/app/ ./logs/ \
  --zone=us-central1-a \
  --project=my-project
```

## Transferring Files Through IAP

For instances without public IP addresses, use IAP tunneling:

```bash
# Transfer a file through IAP tunnel
gcloud compute scp ./data.csv my-internal-instance:~/data.csv \
  --zone=us-central1-a \
  --project=my-project \
  --tunnel-through-iap
```

IAP tunneling works the same way for both uploads and downloads:

```bash
# Download through IAP tunnel
gcloud compute scp my-internal-instance:~/results.json ./results.json \
  --zone=us-central1-a \
  --project=my-project \
  --tunnel-through-iap
```

Make sure you have the IAP firewall rule and IAM permissions set up:

```bash
# Verify IAP firewall rule exists
gcloud compute firewall-rules list \
  --filter="network=my-vpc AND sourceRanges:35.235.240.0/20 AND allowed[].ports:22" \
  --project=my-project \
  --format="table(name,direction,sourceRanges)"
```

## Transferring as a Different User

```bash
# SCP as a specific user
gcloud compute scp ./config.yaml admin@my-instance:~/config.yaml \
  --zone=us-central1-a \
  --project=my-project
```

## Transferring Multiple Files

You can specify multiple source files:

```bash
# Upload multiple files to the VM
gcloud compute scp ./file1.txt ./file2.txt ./file3.txt my-instance:~/uploads/ \
  --zone=us-central1-a \
  --project=my-project
```

For more complex patterns, use a loop:

```bash
# Upload all YAML files in a directory
for f in ./configs/*.yaml; do
  gcloud compute scp "$f" my-instance:~/configs/ \
    --zone=us-central1-a \
    --project=my-project \
    --quiet
done
```

## Compressing Before Transfer

For large directories, compressing first can significantly speed up the transfer:

```bash
# Compress locally, transfer, and extract on the VM
tar czf /tmp/deploy-package.tar.gz -C ./deploy .
gcloud compute scp /tmp/deploy-package.tar.gz my-instance:~/deploy-package.tar.gz \
  --zone=us-central1-a \
  --project=my-project

# Extract on the VM
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  --command="mkdir -p ~/deploy && tar xzf ~/deploy-package.tar.gz -C ~/deploy"
```

## Transfer Between Two VMs

gcloud scp does not directly support VM-to-VM transfers. You have two options:

### Option 1: Through your local machine

```bash
# Download from source VM, then upload to destination VM
gcloud compute scp source-vm:~/data.csv /tmp/data.csv \
  --zone=us-central1-a --project=my-project
gcloud compute scp /tmp/data.csv dest-vm:~/data.csv \
  --zone=us-east1-b --project=my-project
```

### Option 2: Direct transfer using SSH between VMs

```bash
# Run scp directly on the source VM (if VMs can reach each other)
gcloud compute ssh source-vm \
  --zone=us-central1-a \
  --project=my-project \
  --command="scp ~/data.csv dest-vm-internal-ip:~/data.csv"
```

### Option 3: Use Cloud Storage as an intermediary

```bash
# Upload to Cloud Storage from source VM
gcloud compute ssh source-vm \
  --zone=us-central1-a \
  --project=my-project \
  --command="gcloud storage cp ~/data.csv gs://my-transfer-bucket/"

# Download from Cloud Storage on destination VM
gcloud compute ssh dest-vm \
  --zone=us-east1-b \
  --project=my-project \
  --command="gcloud storage cp gs://my-transfer-bucket/data.csv ~/"
```

## Bandwidth and Performance Tips

### Use Compression

The `--compress` flag enables compression during transfer:

```bash
# Enable compression for text-heavy transfers
gcloud compute scp --compress ./large-log.txt my-instance:~/large-log.txt \
  --zone=us-central1-a \
  --project=my-project
```

### Limit Bandwidth

If you do not want to saturate the network:

```bash
# Limit bandwidth to 10 MB/s using SSH options
gcloud compute scp ./big-file.dat my-instance:~/big-file.dat \
  --zone=us-central1-a \
  --project=my-project \
  -- -l 80000  # bandwidth limit in Kbit/s (80000 Kbit/s = 10 MB/s)
```

### Use Cloud Storage for Large Files

For files over a few hundred MB, gcloud storage cp is usually faster and more reliable than SCP because it supports resumable uploads:

```bash
# For large files, use Cloud Storage instead
gcloud storage cp ./large-dataset.tar.gz gs://my-bucket/transfers/

# Then download on the VM
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  --command="gcloud storage cp gs://my-bucket/transfers/large-dataset.tar.gz ~/"
```

## Troubleshooting File Transfers

### Permission Denied on Remote Path

If you cannot write to the destination:

```bash
# SCP to home directory first, then move with sudo
gcloud compute scp ./nginx.conf my-instance:~/nginx.conf \
  --zone=us-central1-a \
  --project=my-project

# Then move to the final location
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  --command="sudo mv ~/nginx.conf /etc/nginx/nginx.conf && sudo chown root:root /etc/nginx/nginx.conf"
```

### Transfer Interrupted

For unreliable connections, use rsync instead of SCP since it can resume:

```bash
# Use gcloud compute rsync for resumable transfers
gcloud compute scp --recurse ./large-dir/ my-instance:~/large-dir/ \
  --zone=us-central1-a \
  --project=my-project
```

Alternatively, split the transfer into smaller chunks.

### Slow Transfer Through IAP

IAP tunneling adds overhead. For large transfers through IAP, consider setting up a Cloud NAT temporarily or using Cloud Storage as an intermediary:

```bash
# Check IAP tunnel bandwidth
# If slow, use Cloud Storage instead
gcloud storage cp ./large-file.dat gs://my-bucket/
gcloud compute ssh my-internal-instance \
  --zone=us-central1-a \
  --project=my-project \
  --tunnel-through-iap \
  --command="gcloud storage cp gs://my-bucket/large-file.dat ~/"
```

## Scripting SCP Operations

For automated deployments, use the `--quiet` flag to suppress prompts:

```bash
#!/bin/bash
# deploy.sh - Script to deploy configuration to multiple instances

INSTANCES=("web-1" "web-2" "web-3")
ZONE="us-central1-a"
PROJECT="my-project"

for instance in "${INSTANCES[@]}"; do
  echo "Deploying to $instance..."

  # Upload configuration files
  gcloud compute scp --recurse ./configs/ "$instance":~/configs/ \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --quiet

  # Run deployment script
  gcloud compute ssh "$instance" \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --command="sudo bash ~/configs/deploy.sh" \
    --quiet

  echo "Deployed to $instance successfully"
done
```

## Summary

The gcloud scp command is the go-to tool for file transfers with Compute Engine instances. It handles SSH key management automatically, supports IAP tunneling for private instances, and works with both files and directories. For large transfers, consider Cloud Storage as an intermediary for better performance and resumability. For automated deployments, combine gcloud scp with gcloud ssh in scripts using the `--quiet` flag.
