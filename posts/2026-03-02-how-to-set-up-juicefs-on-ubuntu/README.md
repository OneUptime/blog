# How to Set Up JuiceFS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, JuiceFS, Distributed Storage, Object Storage, POSIX

Description: A complete guide to deploying JuiceFS on Ubuntu, including metadata engine setup with Redis, object storage backend configuration, and FUSE mount for POSIX access.

---

JuiceFS is a high-performance distributed file system that separates metadata from data. Metadata lives in a fast database (Redis, PostgreSQL, MySQL, or TiKV), while actual file data is stored in object storage (S3, MinIO, Azure Blob, or local disk). The client presents a POSIX-compatible mount point, so any application that writes to a directory can use JuiceFS without modification.

This makes it particularly useful for machine learning workflows (large model checkpoints shared across GPU nodes), Kubernetes persistent volumes, and any workload that needs a shared file system with cloud-native storage backing.

## Architecture

```text
Applications (via POSIX mount at /mnt/juicefs)
          |
    [JuiceFS Client] (FUSE mount)
          |
    +-----+-----+
    |           |
[Redis]     [MinIO/S3]
Metadata    Actual file data
```

The metadata engine tracks filenames, directories, permissions, and chunk locations. Object storage holds the actual file content in fixed-size chunks (default 64 MB blocks split into 4 MB slices).

## Prerequisites

- Ubuntu 20.04 or 22.04
- Redis 6+ for metadata (or PostgreSQL, MySQL)
- Object storage: MinIO (self-hosted), AWS S3, or compatible service
- FUSE library for the client mount

## Installing Redis

```bash
sudo apt update
sudo apt install redis-server -y

# Secure Redis: disable remote access, set a password
sudo nano /etc/redis/redis.conf
```

Key settings:

```conf
# Bind to localhost only
bind 127.0.0.1

# Require authentication
requirepass your-redis-password

# Enable persistence (important for metadata)
appendonly yes
appendfsync everysec
```

```bash
sudo systemctl restart redis
sudo systemctl enable redis

# Test
redis-cli -a your-redis-password ping
# PONG
```

## Setting Up MinIO as Object Storage

If you do not have S3, run MinIO locally:

```bash
# Download MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create data directory
sudo mkdir -p /data/minio

# Start MinIO (set credentials)
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin123 \
  minio server /data/minio --console-address ":9001" &

# Create a bucket for JuiceFS
# Access MinIO console at http://localhost:9001
# Create bucket named "juicefs"
```

Or with MinIO CLI:

```bash
# Install mc
curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc
chmod +x mc && sudo mv mc /usr/local/bin/

# Configure mc
mc alias set local http://localhost:9000 minioadmin minioadmin123

# Create the bucket
mc mb local/juicefs
```

## Installing JuiceFS

```bash
# Download JuiceFS
curl -sSL https://d.juicefs.com/install | sh

# Verify
juicefs version
```

## Formatting (Creating) a JuiceFS File System

The `format` command initializes the metadata in Redis and configures the object storage backend:

```bash
juicefs format \
  --storage minio \
  --bucket http://127.0.0.1:9000/juicefs \
  --access-key minioadmin \
  --secret-key minioadmin123 \
  redis://:your-redis-password@127.0.0.1:6379/1 \
  my-filesystem
```

Parameters:
- `--storage minio` - object storage type
- `--bucket` - MinIO endpoint and bucket
- `redis://...` - Redis connection string (database 1)
- `my-filesystem` - name for this file system

For AWS S3:

```bash
juicefs format \
  --storage s3 \
  --bucket https://s3.us-east-1.amazonaws.com/my-juicefs-bucket \
  --access-key YOUR_AWS_ACCESS_KEY \
  --secret-key YOUR_AWS_SECRET_KEY \
  redis://:your-redis-password@127.0.0.1:6379/1 \
  my-filesystem
```

## Mounting JuiceFS

Install FUSE and mount the file system:

```bash
sudo apt install fuse -y

# Create mount point
sudo mkdir -p /mnt/juicefs

# Mount the file system
sudo juicefs mount \
  redis://:your-redis-password@127.0.0.1:6379/1 \
  /mnt/juicefs \
  --background

# Verify the mount
df -h /mnt/juicefs
mount | grep fuse.juicefs
```

Test basic operations:

```bash
# Write a file
echo "hello juicefs" | sudo tee /mnt/juicefs/test.txt

# Read it back
cat /mnt/juicefs/test.txt

# Check it's in MinIO as chunks
mc ls local/juicefs/ --recursive
```

## Mounting at Boot with systemd

```bash
sudo nano /etc/systemd/system/juicefs.service
```

```ini
[Unit]
Description=JuiceFS Mount
After=network.target redis.service

[Service]
Type=forking
User=root
ExecStart=/usr/local/bin/juicefs mount \
  redis://:your-redis-password@127.0.0.1:6379/1 \
  /mnt/juicefs \
  --background \
  --log=/var/log/juicefs.log
ExecStop=/usr/local/bin/juicefs umount /mnt/juicefs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable juicefs
sudo systemctl start juicefs
```

## Performance Tuning

JuiceFS has several options that affect performance:

```bash
# Mount with performance tuning
sudo juicefs mount \
  redis://:password@127.0.0.1:6379/1 \
  /mnt/juicefs \
  --background \
  --cache-dir=/var/cache/juicefs \  # local cache for frequently read data
  --cache-size=5120 \               # 5 GB local cache
  --prefetch=3 \                    # prefetch 3 blocks ahead for sequential reads
  --writeback \                     # async writes (faster but less durable)
  --max-uploads=10 \                # parallel upload threads
  --max-deletes=5                   # parallel delete threads
```

The local cache is particularly important for read performance. JuiceFS caches chunks locally so repeated reads of the same data do not hit object storage every time.

## Multi-Host Shared Mounting

The main advantage of JuiceFS is that multiple machines can mount the same file system:

On a second machine:

```bash
# Install JuiceFS (same version)
curl -sSL https://d.juicefs.com/install | sh

# Mount using the same Redis and same object storage configuration
sudo juicefs mount \
  redis://:your-redis-password@192.168.1.10:6379/1 \
  /mnt/juicefs \
  --background
```

Both machines now see the same files and changes propagate in near real-time. This enables shared storage for Kubernetes pods across nodes, shared training data for ML workloads, or shared NFS-like storage without running an NFS server.

## Setting Up Redis for High Availability

For production, use Redis Sentinel or Redis Cluster instead of a single Redis instance:

```bash
# JuiceFS with Redis Sentinel
juicefs mount \
  "redis://:password@sentinel1:26379,sentinel2:26379,sentinel3:26379/1?sentinel=mymaster" \
  /mnt/juicefs \
  --background
```

## Using PostgreSQL as the Metadata Engine

Redis is fastest but PostgreSQL is more familiar for many teams and has better durability guarantees:

```bash
sudo apt install postgresql -y
sudo -u postgres createuser juicefs
sudo -u postgres createdb juicefs -O juicefs
sudo -u postgres psql -c "ALTER USER juicefs PASSWORD 'juicefspass';"

# Format with PostgreSQL backend
juicefs format \
  --storage minio \
  --bucket http://127.0.0.1:9000/juicefs \
  --access-key minioadmin \
  --secret-key minioadmin123 \
  "postgres://juicefs:juicefspass@localhost:5432/juicefs?sslmode=disable" \
  my-filesystem
```

## Monitoring

JuiceFS exposes Prometheus metrics:

```bash
# Mount with metrics server
sudo juicefs mount \
  redis://:password@127.0.0.1:6379/1 \
  /mnt/juicefs \
  --background \
  --metrics=127.0.0.1:9567

# Scrape metrics
curl http://127.0.0.1:9567/metrics
```

Check file system statistics:

```bash
# Show file system info
juicefs info /mnt/juicefs/some-file

# Show overall stats
juicefs status redis://:password@127.0.0.1:6379/1
```

## Garbage Collection

JuiceFS does not immediately delete object storage data when files are deleted. Run GC to reclaim space:

```bash
# Find and delete orphaned objects
juicefs gc redis://:password@127.0.0.1:6379/1

# Also compact metadata
juicefs fsck redis://:password@127.0.0.1:6379/1
```

## Troubleshooting

**Mount fails with "transport endpoint is not connected":**
```bash
# Unmount the stuck FUSE mount
sudo umount -l /mnt/juicefs
# Or
sudo fusermount -u /mnt/juicefs

# Remount
sudo juicefs mount redis://:password@127.0.0.1:6379/1 /mnt/juicefs
```

**Slow writes - check if writeback is enabled:**
```bash
# Remount with writeback for async writes
sudo juicefs umount /mnt/juicefs
sudo juicefs mount ... --writeback /mnt/juicefs
```

**Object storage errors:**
```bash
# Check JuiceFS logs
sudo tail -f /var/log/juicefs.log | grep -i error

# Test MinIO connectivity
mc ping local
```

JuiceFS fills a specific niche: POSIX semantics over object storage at scale. If your workload needs a shared file system that scales horizontally, integrates with cloud object storage, and does not require a dedicated NFS server with its availability concerns, JuiceFS is worth evaluating.
