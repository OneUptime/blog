# How to Mount Google Cloud Storage as a Docker Volume

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Google Cloud, GCS, Volumes, Cloud Storage, DevOps, Containers

Description: Learn how to mount Google Cloud Storage buckets as Docker volumes using gcsfuse, volume plugins, and sidecar patterns for persistent cloud storage.

---

Google Cloud Storage (GCS) is Google's object storage service, comparable to AWS S3 and Azure Blob Storage. Mounting a GCS bucket as a Docker volume lets your containers interact with cloud storage using standard filesystem operations - reading, writing, and listing files as if they were on a local disk. This is valuable for data processing pipelines, media storage, shared datasets, and applications that need access to large amounts of cloud-hosted data.

## Prerequisites

You need a Google Cloud project with a GCS bucket created. You also need authentication credentials - either a service account key file or workload identity (when running on GCP).

Create a bucket if you do not have one:

```bash
# Create a GCS bucket
gsutil mb -l us-central1 gs://my-app-storage-bucket
```

Create a service account and download its key:

```bash
# Create a service account for GCS access
gcloud iam service-accounts create docker-gcs-mount \
  --display-name "Docker GCS Mount"

# Grant the service account access to your bucket
gsutil iam ch \
  serviceAccount:docker-gcs-mount@YOUR_PROJECT.iam.gserviceaccount.com:roles/storage.objectAdmin \
  gs://my-app-storage-bucket

# Download the service account key
gcloud iam service-accounts keys create ./gcs-key.json \
  --iam-account docker-gcs-mount@YOUR_PROJECT.iam.gserviceaccount.com
```

## Method 1: Using gcsfuse Inside a Container

gcsfuse is Google's official FUSE adapter for Cloud Storage. Build a Docker image that includes gcsfuse:

```dockerfile
# Dockerfile.gcsfuse - Container with GCS bucket mounted via gcsfuse
FROM ubuntu:22.04

# Install gcsfuse dependencies and the gcsfuse binary
RUN apt-get update && apt-get install -y \
    gnupg \
    curl \
    fuse \
    && echo "deb https://packages.cloud.google.com/apt gcsfuse-jammy main" \
       > /etc/apt/sources.list.d/gcsfuse.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && apt-get update \
    && apt-get install -y gcsfuse \
    && rm -rf /var/lib/apt/lists/*

# Create the mount point
RUN mkdir -p /mnt/gcs

# Set the entrypoint to mount the bucket and run the provided command
ENTRYPOINT ["/bin/bash", "-c", "\
    gcsfuse --foreground \
    --key-file=/credentials/key.json \
    --implicit-dirs \
    $GCS_BUCKET /mnt/gcs & \
    GCSFUSE_PID=$! && \
    sleep 2 && \
    exec \"$@\" && \
    kill $GCSFUSE_PID", "--"]
```

Build and run the image:

```bash
# Build the gcsfuse-enabled image
docker build -t gcsfuse-mount -f Dockerfile.gcsfuse .

# Run a container with GCS bucket mounted
docker run --rm \
  --cap-add SYS_ADMIN \
  --device /dev/fuse \
  -e GCS_BUCKET=my-app-storage-bucket \
  -v $(pwd)/gcs-key.json:/credentials/key.json:ro \
  gcsfuse-mount \
  ls -la /mnt/gcs
```

## Method 2: gcsfuse Sidecar with Docker Compose

A sidecar pattern separates the mount concern from your application. The gcsfuse container handles the mount, and your app container reads from a shared volume.

Create a dedicated gcsfuse image:

```dockerfile
# Dockerfile.gcsfuse-sidecar - Dedicated GCS mount sidecar
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    gnupg curl fuse \
    && echo "deb https://packages.cloud.google.com/apt gcsfuse-jammy main" \
       > /etc/apt/sources.list.d/gcsfuse.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && apt-get update && apt-get install -y gcsfuse \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /mnt/gcs

# Run gcsfuse in the foreground so the container stays alive
CMD gcsfuse --foreground \
    --key-file=/credentials/key.json \
    --implicit-dirs \
    --stat-cache-ttl=60s \
    --type-cache-ttl=60s \
    ${GCS_BUCKET} /mnt/gcs
```

Docker Compose setup:

```yaml
# docker-compose.yml - Application with GCS sidecar
services:
  gcs-mount:
    build:
      context: .
      dockerfile: Dockerfile.gcsfuse-sidecar
    cap_add:
      - SYS_ADMIN
    devices:
      - /dev/fuse
    environment:
      GCS_BUCKET: my-app-storage-bucket
    volumes:
      - ./gcs-key.json:/credentials/key.json:ro
      - gcs-data:/mnt/gcs:shared
    restart: unless-stopped

  app:
    image: my-app:latest
    volumes:
      - gcs-data:/data:ro
    depends_on:
      - gcs-mount
    environment:
      DATA_PATH: /data

  processor:
    image: my-processor:latest
    volumes:
      - gcs-data:/data
    depends_on:
      - gcs-mount
    environment:
      INPUT_PATH: /data/input
      OUTPUT_PATH: /data/output

volumes:
  gcs-data:
    driver: local
```

The `:shared` mount propagation on the gcs-mount service ensures the FUSE mount is visible to other containers sharing the volume.

## Method 3: Using the GCS FUSE CSI Driver (GKE-style on Docker)

For Docker hosts running on Google Compute Engine, you can leverage the instance's default credentials:

```bash
# On a GCE instance, gcsfuse can use the instance's service account
docker run --rm \
  --cap-add SYS_ADMIN \
  --device /dev/fuse \
  -e GCS_BUCKET=my-bucket \
  gcsfuse-mount \
  ls /mnt/gcs
```

When running on GCE with the right scopes, you do not need a key file. gcsfuse picks up the instance metadata credentials automatically.

Modify the Dockerfile to support both modes:

```dockerfile
# Modified CMD that works with or without a key file
CMD if [ -f /credentials/key.json ]; then \
      gcsfuse --foreground --key-file=/credentials/key.json --implicit-dirs ${GCS_BUCKET} /mnt/gcs; \
    else \
      gcsfuse --foreground --implicit-dirs ${GCS_BUCKET} /mnt/gcs; \
    fi
```

## Method 4: Using the rclone Docker Volume Plugin

rclone is a versatile tool that supports dozens of cloud storage backends, including GCS. There is a Docker volume plugin based on rclone:

```bash
# Install the rclone Docker volume plugin
docker plugin install rclone/docker-volume-rclone:latest \
  --grant-all-permissions \
  args="-v --allow-other"
```

Configure rclone for GCS:

```bash
# Create rclone config directory
mkdir -p /var/lib/docker-plugins/rclone/config

# Create rclone configuration for GCS
cat > /var/lib/docker-plugins/rclone/config/rclone.conf << 'EOF'
[gcs]
type = google cloud storage
project_number = YOUR_PROJECT_NUMBER
service_account_file = /credentials/key.json
bucket_policy_only = true
EOF
```

Create a volume:

```bash
# Create a Docker volume backed by GCS via rclone
docker volume create \
  --driver rclone \
  --opt remote=gcs:my-app-storage-bucket \
  --opt allow_other=true \
  gcs-volume
```

Use it:

```bash
# Run a container with the rclone-backed GCS volume
docker run --rm -v gcs-volume:/data alpine ls /data
```

## Performance Optimization

Object storage has different performance characteristics than block or local storage. Here are key tuning parameters for gcsfuse:

```bash
# Run gcsfuse with performance-optimized settings
gcsfuse \
  --foreground \
  --key-file=/credentials/key.json \
  --implicit-dirs \
  --stat-cache-ttl=120s \
  --type-cache-ttl=120s \
  --stat-cache-capacity=20000 \
  --max-conns-per-host=100 \
  --kernel-list-cache-ttl-secs=60 \
  --file-cache-max-size-mb=4096 \
  --temp-dir=/tmp/gcsfuse-cache \
  my-bucket /mnt/gcs
```

Key tuning parameters:
- `stat-cache-ttl`: How long to cache file metadata (increase for read-heavy workloads)
- `stat-cache-capacity`: Number of metadata entries to cache
- `max-conns-per-host`: Connection pool size for parallel operations
- `file-cache-max-size-mb`: Local disk cache for recently accessed files

For Docker Compose:

```yaml
services:
  gcs-mount:
    build:
      context: .
      dockerfile: Dockerfile.gcsfuse-sidecar
    cap_add:
      - SYS_ADMIN
    devices:
      - /dev/fuse
    environment:
      GCS_BUCKET: my-bucket
    volumes:
      - ./gcs-key.json:/credentials/key.json:ro
      - gcs-data:/mnt/gcs:shared
      # Mount a fast local disk for the file cache
      - /ssd-cache:/tmp/gcsfuse-cache
    tmpfs:
      - /tmp/gcsfuse-temp:size=1G
```

## Read-Only Mounts

For applications that only need to read from GCS, mount as read-only for safety:

```bash
# Mount the GCS bucket as read-only
gcsfuse --foreground --key-file=/credentials/key.json \
  --implicit-dirs \
  --o ro \
  my-bucket /mnt/gcs
```

In Docker Compose:

```yaml
services:
  app:
    image: my-app
    volumes:
      - gcs-data:/data:ro
```

## Health Checking

Add a health check to detect when the GCS mount becomes unresponsive:

```yaml
services:
  gcs-mount:
    build:
      context: .
      dockerfile: Dockerfile.gcsfuse-sidecar
    healthcheck:
      # Verify the mount is responsive by listing the directory
      test: ["CMD-SHELL", "ls /mnt/gcs > /dev/null 2>&1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

## Security Best Practices

1. **Use the principle of least privilege.** Grant the service account only the permissions it needs:

```bash
# Read-only access
gsutil iam ch \
  serviceAccount:docker-gcs-mount@PROJECT.iam.gserviceaccount.com:roles/storage.objectViewer \
  gs://my-bucket

# Read-write access (when needed)
gsutil iam ch \
  serviceAccount:docker-gcs-mount@PROJECT.iam.gserviceaccount.com:roles/storage.objectAdmin \
  gs://my-bucket
```

2. **Never embed credentials in Docker images.** Always mount key files or use environment variables.

3. **Use workload identity on GKE or GCE** to avoid managing key files entirely.

4. **Rotate service account keys** periodically:

```bash
# List existing keys
gcloud iam service-accounts keys list \
  --iam-account docker-gcs-mount@PROJECT.iam.gserviceaccount.com

# Create a new key
gcloud iam service-accounts keys create new-key.json \
  --iam-account docker-gcs-mount@PROJECT.iam.gserviceaccount.com

# Delete the old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account docker-gcs-mount@PROJECT.iam.gserviceaccount.com
```

## Troubleshooting

**Mount point is empty even though the bucket has files:**

gcsfuse only shows explicitly created directory entries by default. Use `--implicit-dirs` to see all files:

```bash
gcsfuse --implicit-dirs my-bucket /mnt/gcs
```

**Permission denied errors:**

Check that the service account has the correct IAM role on the bucket:

```bash
gsutil iam get gs://my-bucket
```

**Slow listing of directories with many files:**

Increase the stat cache and enable kernel list cache:

```bash
gcsfuse --stat-cache-capacity=50000 --kernel-list-cache-ttl-secs=120 my-bucket /mnt/gcs
```

**FUSE mount fails with "Operation not permitted":**

Ensure the container has SYS_ADMIN capability and access to /dev/fuse:

```bash
docker run --cap-add SYS_ADMIN --device /dev/fuse ...
```

## Summary

Mounting Google Cloud Storage as a Docker volume brings cloud object storage into your container workflows. gcsfuse is the most straightforward tool, providing a FUSE-based mount that translates filesystem operations to GCS API calls. Use a sidecar pattern in Docker Compose to separate the mount concern from your application. Tune cache settings for your workload, mount read-only when possible, and use workload identity instead of key files when running on Google Cloud. While object storage will never match local disk performance, the right caching configuration makes it practical for many workloads.
