# How to Run a Container with Block IO Limits in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Block IO, Resource Limit, Performance

Description: Learn how to set block I/O throughput and IOPS limits on Podman containers to prevent disk saturation and ensure fair I/O distribution.

---

> Block I/O limits prevent a single container from saturating your storage and degrading performance for every other workload on the host.

When multiple containers share the same storage, a single container performing heavy writes can starve others of disk bandwidth. Block I/O limits let you control how much disk throughput and how many I/O operations per second each container can consume. This is critical for maintaining consistent performance in multi-tenant or multi-service environments.

---

## Understanding Block IO Controls

Podman provides several flags for I/O control:

- `--blkio-weight`: Relative I/O priority (10-1000)
- `--device-read-bps`: Maximum read throughput per device
- `--device-write-bps`: Maximum write throughput per device
- `--device-read-iops`: Maximum read operations per second per device
- `--device-write-iops`: Maximum write operations per second per device

## Setting Block IO Weight

The `--blkio-weight` flag sets relative I/O priority between containers:

```bash
# Low priority I/O (default is 500)

podman run -d --name low-io \
  --blkio-weight 100 \
  alpine sleep infinity

# High priority I/O
podman run -d --name high-io \
  --blkio-weight 900 \
  alpine sleep infinity

# Verify the weight
podman inspect low-io --format '{{.HostConfig.BlkioWeight}}'
podman inspect high-io --format '{{.HostConfig.BlkioWeight}}'
```

The weight only matters when multiple containers are competing for I/O on the same device. A container with weight 900 gets roughly 9x the I/O bandwidth of a container with weight 100.

## Per-Device Weight

Set different I/O weights for specific devices:

```bash
# Set a specific weight for a device
podman run -d --name device-weighted \
  --blkio-weight-device /dev/sda:200 \
  alpine sleep infinity

# Inspect the device weight
podman inspect device-weighted --format '{{json .HostConfig.BlkioWeightDevice}}'
```

## Limiting Read Throughput (BPS)

Cap the maximum read speed from a device:

```bash
# Limit reads to 10 megabytes per second
podman run --rm \
  --device-read-bps /dev/sda:10mb \
  alpine sh -c "
    dd if=/dev/zero of=/tmp/read-test bs=1M count=50 oflag=direct 2>/dev/null
    echo 'Reading with 10MB/s limit...'
    time dd if=/tmp/read-test of=/dev/null bs=1M iflag=direct 2>&1
    rm -f /tmp/read-test
  "

# Limit reads to 1 megabyte per second (very restrictive)
podman run --rm \
  --device-read-bps /dev/sda:1mb \
  alpine sh -c "
    dd if=/dev/zero of=/tmp/read-test bs=1M count=5 oflag=direct 2>/dev/null
    echo 'Reading with 1MB/s limit...'
    time dd if=/tmp/read-test of=/dev/null bs=1M iflag=direct 2>&1
    rm -f /tmp/read-test
  "
```

## Limiting Write Throughput (BPS)

Cap the maximum write speed to a device:

```bash
# Limit writes to 5 megabytes per second
podman run --rm \
  --device-write-bps /dev/sda:5mb \
  alpine sh -c "
    echo 'Writing with 5MB/s limit...'
    time dd if=/dev/zero of=/tmp/testfile bs=1M count=20 oflag=direct 2>&1
    rm -f /tmp/testfile
  "

# Limit writes to 50 megabytes per second
podman run --rm \
  --device-write-bps /dev/sda:50mb \
  alpine sh -c "
    echo 'Writing with 50MB/s limit...'
    time dd if=/dev/zero of=/tmp/testfile bs=1M count=100 oflag=direct 2>&1
    rm -f /tmp/testfile
  "
```

## Limiting Read IOPS

Control the number of read operations per second:

```bash
# Limit to 100 read operations per second
podman run --rm \
  --device-read-iops /dev/sda:100 \
  alpine sh -c "
    dd if=/dev/zero of=/tmp/read-test bs=4k count=500 oflag=direct 2>/dev/null
    echo 'Reading with 100 IOPS limit...'
    time dd if=/tmp/read-test of=/dev/null bs=4k iflag=direct 2>&1
    rm -f /tmp/read-test
  "

# Limit to 1000 IOPS
podman run --rm \
  --device-read-iops /dev/sda:1000 \
  alpine sh -c "
    dd if=/dev/zero of=/tmp/read-test bs=4k count=5000 oflag=direct 2>/dev/null
    echo 'Reading with 1000 IOPS limit...'
    time dd if=/tmp/read-test of=/dev/null bs=4k iflag=direct 2>&1
    rm -f /tmp/read-test
  "
```

## Limiting Write IOPS

Control the number of write operations per second:

```bash
# Limit to 100 write operations per second
podman run --rm \
  --device-write-iops /dev/sda:100 \
  alpine sh -c "
    echo 'Writing with 100 IOPS limit...'
    time dd if=/dev/zero of=/tmp/testfile bs=4k count=500 oflag=direct 2>&1
    rm -f /tmp/testfile
  "
```

## Combining Multiple IO Limits

Apply comprehensive I/O controls:

```bash
# Full I/O limiting configuration
podman run -d --name io-controlled \
  --blkio-weight 300 \
  --device-read-bps /dev/sda:20mb \
  --device-write-bps /dev/sda:10mb \
  --device-read-iops /dev/sda:500 \
  --device-write-iops /dev/sda:200 \
  alpine sleep infinity

# Verify all I/O limits
podman inspect io-controlled --format '
  BlkIO Weight: {{.HostConfig.BlkioWeight}}
  Read BPS: {{json .HostConfig.BlkioDeviceReadBps}}
  Write BPS: {{json .HostConfig.BlkioDeviceWriteBps}}
  Read IOPS: {{json .HostConfig.BlkioDeviceReadIOps}}
  Write IOPS: {{json .HostConfig.BlkioDeviceWriteIOps}}
'

podman stop io-controlled && podman rm io-controlled
```

## Finding the Right Device Path

You need to know the correct device path for your storage:

```bash
# List block devices on the host
lsblk

# Find the device for a specific mount point
df -h / | tail -1

# Get the device for the container's storage
podman info --format '{{.Store.GraphRoot}}'
df -h $(podman info --format '{{.Store.GraphRoot}}') | tail -1
```

## Practical Example: Database with IO Limits

```bash
# Run PostgreSQL with appropriate I/O limits
podman run -d --name postgres-io \
  --device-read-bps /dev/sda:50mb \
  --device-write-bps /dev/sda:30mb \
  --device-read-iops /dev/sda:2000 \
  --device-write-iops /dev/sda:1000 \
  --blkio-weight 700 \
  --memory 1g \
  --cpus 2 \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16

podman stop postgres-io && podman rm postgres-io
```

## IO Limits with Comprehensive Resource Controls

```bash
# Production container with all resource limits
podman run -d --name production \
  --memory 512m \
  --cpus 2 \
  --pids-limit 200 \
  --blkio-weight 500 \
  --device-read-bps /dev/sda:20mb \
  --device-write-bps /dev/sda:10mb \
  --read-only \
  --tmpfs /tmp:size=64m \
  -p 8080:80 \
  nginx:latest

podman stop production && podman rm production
```

## Monitoring IO Usage

```bash
# View block I/O stats for containers
podman stats --no-stream --format "table {{.Name}}\t{{.BlockIO}}"

# Detailed I/O stats from cgroups
podman run -d --name io-monitor \
  --device-write-bps /dev/sda:10mb \
  alpine sleep infinity

podman exec io-monitor sh -c "
  cat /sys/fs/cgroup/io.stat 2>/dev/null || echo 'IO stats not available'
"

podman stop io-monitor && podman rm io-monitor
```

## Summary

Block I/O limits in Podman prevent disk saturation and ensure fair I/O distribution:

- `--blkio-weight`: Set relative I/O priority (10-1000)
- `--device-read-bps` / `--device-write-bps`: Cap throughput in bytes per second
- `--device-read-iops` / `--device-write-iops`: Cap operations per second
- Use `lsblk` and `df` to find the correct device paths
- Combine with memory and CPU limits for comprehensive resource control
- Monitor with `podman stats` to see actual I/O usage

Set I/O limits based on your storage capacity and the number of containers sharing it to prevent any single workload from degrading overall performance.
