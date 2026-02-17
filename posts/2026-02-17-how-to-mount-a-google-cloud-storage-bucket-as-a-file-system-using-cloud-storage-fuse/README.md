# How to Mount a Google Cloud Storage Bucket as a File System Using Cloud Storage FUSE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, Cloud Storage FUSE, File System, Linux

Description: Learn how to mount Google Cloud Storage buckets as local file systems using Cloud Storage FUSE for seamless file access from applications and scripts.

---

Sometimes you need to access Cloud Storage objects as if they were regular files on a local file system. Maybe you have a legacy application that reads from a directory, a data science notebook that expects local file paths, or a batch processing script that works with standard file I/O. Cloud Storage FUSE lets you mount a GCS bucket as a local directory, so any application can read and write to Cloud Storage using normal file operations.

This guide covers installing, configuring, and using Cloud Storage FUSE effectively, along with important performance considerations.

## What Cloud Storage FUSE Does

Cloud Storage FUSE (gcsfuse) is a FUSE adapter that translates file system operations into Cloud Storage API calls. When you mount a bucket:

- `ls /mnt/my-bucket/` lists objects in the bucket
- `cat /mnt/my-bucket/data.csv` downloads and reads the object
- `cp file.txt /mnt/my-bucket/` uploads the file as a new object
- Applications see a regular directory and work normally

```mermaid
graph LR
    A[Application] -->|File I/O| B[FUSE Layer]
    B -->|API Calls| C[gcsfuse]
    C -->|HTTP/gRPC| D[Cloud Storage API]
    D --> E[GCS Bucket]
```

Important to understand: Cloud Storage FUSE is not a traditional file system. It translates file operations to object storage operations, which means some things behave differently than a local disk. More on that later.

## Installation

### On Debian/Ubuntu

```bash
# Add the Cloud Storage FUSE repository
export GCSFUSE_REPO=gcsfuse-$(lsb_release -c -s)
echo "deb [signed-by=/usr/share/keyrings/cloud.google.asc] https://packages.cloud.google.com/apt $GCSFUSE_REPO main" | sudo tee /etc/apt/sources.list.d/gcsfuse.list

# Import the repository signing key
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo tee /usr/share/keyrings/cloud.google.asc

# Install gcsfuse
sudo apt-get update
sudo apt-get install gcsfuse
```

### On RHEL/CentOS

```bash
# Add the repository
sudo tee /etc/yum.repos.d/gcsfuse.repo > /dev/null <<EOF
[gcsfuse]
name=gcsfuse (packages.cloud.google.com)
baseurl=https://packages.cloud.google.com/yum/repos/gcsfuse-el7-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=0
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg
       https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOF

# Install gcsfuse
sudo yum install gcsfuse
```

### Verify Installation

```bash
# Check the installed version
gcsfuse --version
```

## Basic Mounting

### Mount a Bucket

```bash
# Create a mount point directory
mkdir -p /mnt/my-bucket

# Mount the bucket
gcsfuse my-bucket-name /mnt/my-bucket
```

That is it. You can now access your bucket contents at `/mnt/my-bucket/`.

### Mount with Specific Options

```bash
# Mount with read-only access and a specific directory within the bucket
gcsfuse --only-dir=data/2026 \
  --file-mode=444 \
  --dir-mode=555 \
  my-bucket-name /mnt/my-data
```

### Mount a Specific Prefix

If you only need a subset of the bucket:

```bash
# Mount only the logs directory from the bucket
gcsfuse --only-dir=logs my-bucket-name /mnt/logs
```

### Unmount

```bash
# Unmount the bucket
fusermount -u /mnt/my-bucket
```

## Configuration Options

### Performance Tuning

```bash
# Mount with performance-oriented settings
gcsfuse \
  --stat-cache-capacity=20000 \
  --stat-cache-ttl=60s \
  --type-cache-ttl=60s \
  --rename-dir-limit=200000 \
  --max-conns-per-host=100 \
  --implicit-dirs \
  my-bucket-name /mnt/my-bucket
```

Key options explained:

- `--stat-cache-capacity` - number of entries to cache for stat calls
- `--stat-cache-ttl` - how long to cache file metadata
- `--type-cache-ttl` - how long to cache file type information
- `--max-conns-per-host` - maximum concurrent connections to GCS
- `--implicit-dirs` - treat path prefixes as directories even if no directory object exists

### Using a Configuration File

For complex setups, use a YAML configuration file:

```yaml
# gcsfuse-config.yaml
file-cache:
  max-size-mb: 1024
  cache-file-for-range-read: true

metadata-cache:
  stat-cache-max-size-mb: 32
  ttl-secs: 60
  type-cache-max-size-mb: 4

file-system:
  dir-mode: "0755"
  file-mode: "0644"

gcs-connection:
  max-conns-per-host: 100

logging:
  severity: WARNING
```

Mount with the config file:

```bash
# Mount using a configuration file
gcsfuse --config-file=gcsfuse-config.yaml my-bucket-name /mnt/my-bucket
```

## Automatic Mounting with fstab

To mount the bucket automatically at boot:

```bash
# Add this line to /etc/fstab
# my-bucket-name /mnt/my-bucket gcsfuse rw,user,implicit_dirs,_netdev 0 0
```

Or using a systemd mount unit for more control:

```ini
# /etc/systemd/system/mnt-mybucket.mount
[Unit]
Description=Mount GCS bucket
After=network-online.target
Wants=network-online.target

[Mount]
What=my-bucket-name
Where=/mnt/my-bucket
Type=gcsfuse
Options=rw,implicit_dirs,stat_cache_ttl=60s

[Install]
WantedBy=multi-user.target
```

Enable it:

```bash
# Enable and start the mount
sudo systemctl enable mnt-mybucket.mount
sudo systemctl start mnt-mybucket.mount
```

## Using gcsfuse with Docker

Mount a bucket inside a Docker container:

```dockerfile
FROM ubuntu:22.04

# Install gcsfuse
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.asc] https://packages.cloud.google.com/apt gcsfuse-jammy main" | tee /etc/apt/sources.list.d/gcsfuse.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | tee /usr/share/keyrings/cloud.google.asc && \
    apt-get update && \
    apt-get install -y gcsfuse && \
    mkdir -p /mnt/gcs

# Mount script that runs gcsfuse before the application
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

The entrypoint script:

```bash
#!/bin/bash
# entrypoint.sh - Mount GCS bucket before starting the application

# Mount the bucket specified by environment variable
gcsfuse --implicit-dirs "${GCS_BUCKET}" /mnt/gcs

# Run the main application
exec "$@"
```

Run the container with the required privileges:

```bash
# Run with FUSE device access
docker run --device /dev/fuse --cap-add SYS_ADMIN \
  -e GCS_BUCKET=my-bucket-name \
  my-image python process_data.py
```

## Performance Characteristics

Cloud Storage FUSE has fundamentally different performance characteristics than a local file system. Understanding these helps you use it effectively.

### What Works Well

- **Sequential reads of large files** - gcsfuse reads ahead efficiently
- **Listing large directories** - uses GCS list operations which are fast
- **Bulk reads of many files** - good throughput for data processing
- **Write once, read many** - typical object storage pattern

### What Does Not Work Well

- **Random access patterns** - each seek may trigger a new HTTP request
- **Frequent small writes** - each write creates a new object version
- **Appending to files** - the entire object must be rewritten
- **File locking** - not supported
- **Hard links and symbolic links** - not supported
- **Renaming directories** - requires renaming every object with that prefix

### Performance Tips

```bash
# Enable kernel buffer for better read performance
gcsfuse --kernel-list-cache-ttl-secs=60 my-bucket /mnt/my-bucket

# For data processing workloads, use file caching
gcsfuse --file-cache-max-size-mb=4096 \
  --cache-dir=/tmp/gcsfuse-cache \
  my-bucket /mnt/my-bucket
```

## Common Use Cases

### Data Science Notebooks

Mount a bucket so Jupyter notebooks can load data with standard pandas calls:

```python
import pandas as pd

# Read directly from the mounted bucket
df = pd.read_csv('/mnt/my-bucket/datasets/training-data.csv')

# Save results back to the bucket
df.to_parquet('/mnt/my-bucket/results/analysis-output.parquet')
```

### Batch Processing Scripts

```bash
#!/bin/bash
# Process all CSV files in a mounted bucket directory

for file in /mnt/my-bucket/incoming/*.csv; do
    echo "Processing: $file"
    python process.py "$file"
    mv "$file" /mnt/my-bucket/processed/
done
```

### Log Aggregation

Mount a bucket as a log destination:

```bash
# Mount the log bucket
gcsfuse --only-dir=app-logs log-bucket /var/log/app-gcs/

# Configure your application to write logs there
# Note: Consider buffering writes for better performance
```

## Authentication

gcsfuse uses the same authentication as other GCP tools:

```bash
# On GCE instances - uses the instance service account automatically

# For local development - use application default credentials
gcloud auth application-default login

# To use a specific service account key
gcsfuse --key-file=/path/to/service-account-key.json my-bucket /mnt/bucket
```

## Troubleshooting

Enable debug logging to diagnose issues:

```bash
# Mount with debug logging
gcsfuse --debug_fuse --debug_gcs --debug_http my-bucket /mnt/my-bucket
```

Common issues:

- **Permission denied** - check that the service account has `roles/storage.objectAdmin` or equivalent
- **Transport endpoint not connected** - the gcsfuse process crashed, unmount and remount
- **Slow listing** - enable implicit dirs and increase stat cache
- **Writes seem slow** - gcsfuse uploads the entire object on close, so large files take time

Cloud Storage FUSE is a practical tool for bridging the gap between applications that expect a file system and data stored in Cloud Storage. Use it for batch processing, data analysis, and legacy application integration, but keep in mind that it is not a replacement for a local file system in latency-sensitive applications.
