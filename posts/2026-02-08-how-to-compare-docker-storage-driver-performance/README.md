# How to Compare Docker Storage Driver Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, Storage, Overlay2, Btrfs, ZFS, Benchmarking, DevOps

Description: Learn how to benchmark and compare Docker storage drivers to find the best fit for your workloads, with practical tests and real performance data.

---

Docker supports several storage drivers, each with different performance characteristics. Overlay2 is the default, but btrfs, zfs, devicemapper, and others exist for specific use cases. Choosing the right one can make a measurable difference in container startup time, I/O throughput, and storage efficiency. This guide walks through benchmarking each driver so you can make an informed choice for your workload.

## Available Storage Drivers

Here is a quick overview of the storage drivers Docker supports:

| Driver | Backing Filesystem | Copy-on-Write | Best For |
|--------|-------------------|---------------|----------|
| overlay2 | ext4, xfs | File-level | General purpose, most workloads |
| btrfs | btrfs | Block-level | Snapshot-heavy workloads |
| zfs | zfs | Block-level | Data integrity, compression |
| devicemapper | direct-lvm | Block-level | Legacy RHEL/CentOS |
| vfs | Any | None (full copy) | Testing, debugging |

Check your current storage driver:

```bash
# Show the active storage driver
docker info | grep "Storage Driver"
# Output: Storage Driver: overlay2

# Show detailed storage information
docker info --format '{{json .Driver}}'
```

## Setting Up the Benchmark Environment

To get meaningful comparisons, test each driver on the same hardware with the same workload. Here is the setup:

```bash
#!/bin/bash
# setup-benchmark.sh
# Prepares the environment for storage driver benchmarking

# Stop Docker
sudo systemctl stop docker

# Back up existing Docker data
sudo cp -a /var/lib/docker /var/lib/docker.backup

# Create a benchmark results directory
mkdir -p ~/docker-storage-benchmarks
```

### Switching Storage Drivers

To switch drivers, update the daemon configuration and restart Docker. This creates a new data directory since each driver uses its own format.

```bash
# Switch to overlay2
switch_driver() {
    local driver=$1
    echo "Switching to $driver..."

    sudo systemctl stop docker

    # Clean up previous driver data
    sudo rm -rf /var/lib/docker

    # Set the new driver
    sudo tee /etc/docker/daemon.json << EOF
{
    "storage-driver": "$driver"
}
EOF

    sudo systemctl start docker

    # Verify
    docker info | grep "Storage Driver"
}

# Usage:
# switch_driver overlay2
# switch_driver btrfs
# switch_driver zfs
```

For btrfs, the backing partition must be formatted with btrfs:

```bash
# Format and mount a btrfs partition for Docker
sudo mkfs.btrfs -f /dev/sdb1
sudo mount /dev/sdb1 /var/lib/docker
```

For zfs, create a pool:

```bash
# Create a ZFS pool for Docker
sudo zpool create -f docker-pool /dev/sdb1
sudo zfs create -o mountpoint=/var/lib/docker docker-pool/docker
```

## Benchmark 1: Image Pull Speed

How fast does each driver pull and extract an image?

```bash
#!/bin/bash
# bench-pull.sh
# Measures image pull time for different image sizes

IMAGES=(
    "alpine:3.19"
    "nginx:1.25-alpine"
    "node:20-alpine"
    "python:3.12-slim"
    "ubuntu:22.04"
)

DRIVER=$(docker info --format '{{.Driver}}')
RESULTS_FILE=~/docker-storage-benchmarks/pull-$DRIVER.csv

echo "image,time_seconds,size_mb" > "$RESULTS_FILE"

for image in "${IMAGES[@]}"; do
    # Remove the image if it exists
    docker rmi "$image" 2>/dev/null

    # Measure pull time
    start=$(date +%s%N)
    docker pull "$image" > /dev/null 2>&1
    end=$(date +%s%N)

    elapsed=$(( (end - start) / 1000000 ))  # Convert to milliseconds
    size=$(docker image inspect "$image" --format '{{.Size}}' | awk '{printf "%.1f", $1/1024/1024}')

    echo "$image,${elapsed},${size}" >> "$RESULTS_FILE"
    echo "  $image: ${elapsed}ms, ${size}MB"
done

echo "Results saved to $RESULTS_FILE"
```

## Benchmark 2: Container Start Time

Measure how quickly each driver creates and starts a container:

```bash
#!/bin/bash
# bench-start.sh
# Measures container creation and start time

DRIVER=$(docker info --format '{{.Driver}}')
RESULTS_FILE=~/docker-storage-benchmarks/start-$DRIVER.csv
ITERATIONS=50

# Pre-pull the image
docker pull alpine:3.19 > /dev/null 2>&1

echo "iteration,create_ms,start_ms,total_ms" > "$RESULTS_FILE"

for i in $(seq 1 $ITERATIONS); do
    # Measure create + start time
    start=$(date +%s%N)
    container_id=$(docker create alpine:3.19 echo hello)
    create_time=$(date +%s%N)
    docker start -a "$container_id" > /dev/null 2>&1
    end=$(date +%s%N)

    create_ms=$(( (create_time - start) / 1000000 ))
    start_ms=$(( (end - create_time) / 1000000 ))
    total_ms=$(( (end - start) / 1000000 ))

    echo "$i,$create_ms,$start_ms,$total_ms" >> "$RESULTS_FILE"

    # Clean up
    docker rm "$container_id" > /dev/null 2>&1
done

# Calculate averages
echo ""
echo "Driver: $DRIVER"
awk -F',' 'NR>1 {sum+=$4; count++} END {printf "Average total: %.1f ms\n", sum/count}' "$RESULTS_FILE"
```

## Benchmark 3: File I/O Performance

This is where storage drivers differ most. Test sequential writes, random reads, and metadata operations:

```bash
#!/bin/bash
# bench-io.sh
# Measures file I/O performance inside containers

DRIVER=$(docker info --format '{{.Driver}}')
RESULTS_DIR=~/docker-storage-benchmarks/io-$DRIVER
mkdir -p "$RESULTS_DIR"

# Sequential write throughput
echo "=== Sequential Write ==="
docker run --rm alpine sh -c "
    dd if=/dev/zero of=/tmp/testfile bs=1M count=512 conv=fdatasync 2>&1 | tail -1
" | tee "$RESULTS_DIR/seq-write.txt"

# Sequential read throughput
echo "=== Sequential Read ==="
docker run --rm alpine sh -c "
    dd if=/dev/zero of=/tmp/testfile bs=1M count=512 2>/dev/null
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    dd if=/tmp/testfile of=/dev/null bs=1M 2>&1 | tail -1
" | tee "$RESULTS_DIR/seq-read.txt"

# Small file creation (metadata performance)
echo "=== Small File Creation ==="
docker run --rm alpine sh -c "
    time sh -c 'for i in \$(seq 1 10000); do echo x > /tmp/file_\$i; done' 2>&1
" | tee "$RESULTS_DIR/small-files.txt"

# Random read/write with fio (if available)
echo "=== Random I/O (fio) ==="
docker run --rm ljishen/fio sh -c "
    fio --name=randrw --ioengine=libaio --iodepth=16 --rw=randrw \
        --rwmixread=70 --bs=4k --direct=1 --size=256M \
        --numjobs=4 --runtime=30 --group_reporting --output-format=json
" | tee "$RESULTS_DIR/random-io.json"
```

## Benchmark 4: Copy-on-Write Performance

Test how each driver handles modifications to existing files (the CoW operation):

```bash
#!/bin/bash
# bench-cow.sh
# Measures copy-on-write performance

DRIVER=$(docker info --format '{{.Driver}}')

# Create a test image with a large file
docker build -t cow-test -f - . << 'EOF'
FROM alpine:3.19
RUN dd if=/dev/zero of=/data/largefile bs=1M count=256
RUN dd if=/dev/zero of=/data/medfile bs=1M count=64
RUN for i in $(seq 1 1000); do dd if=/dev/zero of=/data/small_$i bs=4K count=1 2>/dev/null; done
EOF

echo "=== CoW: Modify large file ==="
docker run --rm cow-test sh -c "
    time dd if=/dev/urandom of=/data/largefile bs=1M count=1 conv=notrunc 2>&1
"

echo "=== CoW: Modify medium file ==="
docker run --rm cow-test sh -c "
    time dd if=/dev/urandom of=/data/medfile bs=1M count=1 conv=notrunc 2>&1
"

echo "=== CoW: Modify many small files ==="
docker run --rm cow-test sh -c "
    time sh -c 'for i in \$(seq 1 1000); do echo modified > /data/small_\$i; done' 2>&1
"

docker rmi cow-test > /dev/null 2>&1
```

The key difference: overlay2 uses file-level CoW (copies the entire file), while btrfs and zfs use block-level CoW (copies only changed blocks). For large files with small modifications, block-level CoW is significantly faster.

## Benchmark 5: Storage Efficiency

Compare how efficiently each driver stores multiple containers from the same image:

```bash
#!/bin/bash
# bench-efficiency.sh
# Measures storage overhead per container

DRIVER=$(docker info --format '{{.Driver}}')

# Get baseline disk usage
baseline=$(df /var/lib/docker --output=used | tail -1)

# Create 50 containers from the same image
for i in $(seq 1 50); do
    docker create --name "bench-$i" nginx:1.25-alpine > /dev/null 2>&1
done

# Measure disk usage after creating containers
after=$(df /var/lib/docker --output=used | tail -1)

overhead=$(( after - baseline ))
per_container=$(( overhead / 50 ))

echo "Driver: $DRIVER"
echo "Total overhead for 50 containers: ${overhead} KB"
echo "Per-container overhead: ${per_container} KB"

# Clean up
for i in $(seq 1 50); do
    docker rm "bench-$i" > /dev/null 2>&1
done
```

## Comparing Results

After running all benchmarks across drivers, compile the results:

```bash
#!/bin/bash
# compare-results.sh
# Summarizes benchmark results across storage drivers

BENCH_DIR=~/docker-storage-benchmarks

echo "=== Storage Driver Comparison ==="
echo ""

for driver_dir in $BENCH_DIR/start-*; do
    driver=$(basename "$driver_dir" | sed 's/start-//')
    avg=$(awk -F',' 'NR>1 {sum+=$4; count++} END {printf "%.1f", sum/count}' "$driver_dir")
    echo "Container start time ($driver): ${avg}ms"
done

echo ""
echo "See individual benchmark files for detailed I/O results."
```

## Typical Results Summary

Based on common benchmarks, here is what you can generally expect:

| Metric | overlay2 | btrfs | zfs |
|--------|----------|-------|-----|
| Container start | Fastest (~50ms) | Moderate (~80ms) | Moderate (~90ms) |
| Sequential write | Good | Good | Good (with compression) |
| Random I/O | Good | Moderate | Good |
| Small file creation | Good | Moderate | Moderate |
| CoW (large files) | Slow (file-level) | Fast (block-level) | Fast (block-level) |
| Storage efficiency | Good | Excellent (compression) | Excellent (dedup + compression) |
| Reliability | Good | Good | Excellent |

## Choosing a Driver

- **overlay2**: Best for most workloads. Fastest container startup, good I/O performance, and wide compatibility. Choose this unless you have a specific reason not to.
- **btrfs**: Good for environments that benefit from filesystem-level snapshots and compression. Higher CPU usage due to CoW at the block level.
- **zfs**: Best for data integrity and storage efficiency. Built-in checksums, compression, and deduplication. Higher memory usage (ARC cache). Good for database workloads where data integrity matters.
- **devicemapper**: Legacy option. Only use if you cannot use overlay2 on older RHEL/CentOS systems.

## Wrapping Up

The right storage driver depends on your workload profile. Run these benchmarks on your actual hardware with your actual images to get relevant numbers. For most teams, overlay2 provides the best balance of performance and simplicity. If you need block-level CoW, data integrity features, or compression, zfs and btrfs are worth the additional setup complexity.
