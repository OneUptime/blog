# How to Configure Portainer SSD Requirements for Best Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Performance, SSD, Storage, Infrastructure

Description: Configure Portainer and Docker storage on SSDs to achieve optimal database performance, fast image pulls, and responsive UI in container management environments.

## Introduction

Portainer's embedded BoltDB database performs significantly better on SSDs than spinning disks. Docker's image and container storage also benefits from SSD I/O for layer operations during builds and container startups. This guide covers identifying storage bottlenecks, moving Portainer and Docker storage to SSD, and benchmarking the improvement.

## Step 1: Identify Current Storage Configuration

```bash
# Check what storage device Portainer data is on

docker inspect portainer --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}} -> {{.Destination}}{{end}}{{end}}'
# Output: /var/lib/docker/volumes/portainer_data/_data -> /data

# Find which disk that path is on
df -h /var/lib/docker/volumes/portainer_data/_data

# Check if it's SSD or spinning disk
lsblk -o NAME,ROTA,SIZE,TYPE,MOUNTPOINT
# ROTA=0: SSD (Solid State Drive)
# ROTA=1: HDD (Hard Disk Drive - spinning)

# Check I/O scheduler (important for performance)
cat /sys/block/sda/queue/scheduler
# Common SSD choices: [none] or [mq-deadline]
# Common HDD choices: [mq-deadline] or [bfq]

# Benchmark current I/O performance
sudo dd if=/dev/zero of=/var/lib/docker/volumes/portainer_data/_data/test \
  bs=1M count=1000 oflag=direct 2>&1 | tail -1
# Remove the test file after
sudo rm /var/lib/docker/volumes/portainer_data/_data/test
```

## Step 2: Mount SSD for Portainer Data

```bash
# Assuming you have a dedicated SSD at /dev/sdb
# Format and mount the SSD

# Format with ext4
sudo mkfs.ext4 -E lazy_itable_init=0,lazy_journal_init=0 /dev/sdb

# Create mount point
sudo mkdir -p /opt/ssd

# Mount with performance-optimized options
sudo mount -o noatime,nodiratime /dev/sdb /opt/ssd

# Make persistent across reboots
echo "/dev/sdb /opt/ssd ext4 noatime,nodiratime 0 2" | \
  sudo tee -a /etc/fstab

# Create Portainer directory on SSD
sudo mkdir -p /opt/ssd/portainer/data
sudo chown -R 1000:1000 /opt/ssd/portainer
```

## Step 3: Configure Portainer on SSD Storage

```yaml
# docker-compose.yml - Portainer with SSD storage
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    command:
      - "--snapshot-interval=5m"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Bind mount to SSD directory (not named volume)
      - /opt/ssd/portainer/data:/data
    ports:
      - "9443:9443"
```

## Step 4: Move Docker's Storage Root to SSD

`/etc/docker/daemon.json`

```json
{
  "data-root": "/opt/ssd/docker"
}
```

```bash
# Note: On fresh Docker Engine 29+ installs using the containerd image store,
# image and snapshot data are configured separately in /etc/containerd/config.toml.

# Move existing Docker data to SSD
sudo systemctl stop docker

# Copy all Docker data to SSD
sudo rsync -aP /var/lib/docker/ /opt/ssd/docker/

# Start Docker with new location
sudo systemctl start docker

# Verify
docker info | grep "Docker Root Dir"
# Should show: Docker Root Dir: /opt/ssd/docker
```

## Step 5: Set Optimal I/O Scheduler for SSD

```bash
# Set I/O scheduler for optimal SSD performance
# Option 1: none (common for NVMe SSDs)
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler

# Option 2: mq-deadline (common for SATA SSDs)
echo "mq-deadline" | sudo tee /sys/block/sda/queue/scheduler

# Make persistent across reboots
sudo tee /etc/udev/rules.d/60-ioscheduler.rules > /dev/null << 'EOF'
# NVMe SSDs - use none scheduler
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
# SATA SSDs (rotational=0) - use mq-deadline
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"
# HDDs (rotational=1) - use bfq
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="bfq"
EOF
```

## Step 6: Benchmark Before and After

```bash
# Benchmark Portainer database operations
# Before SSD: measure BoltDB write performance

# Install fio for proper I/O benchmarking
sudo apt-get install -y fio

# Sequential read test (simulates snapshot reads)
fio --name=seq-read \
  --directory=/opt/ssd/portainer/data \
  --ioengine=libaio \
  --direct=1 \
  --rw=read \
  --bs=4k \
  --size=1G \
  --numjobs=1 \
  --time_based \
  --runtime=30 \
  --output-format=normal

# Random write test (simulates BoltDB writes)
fio --name=rand-write \
  --directory=/opt/ssd/portainer/data \
  --ioengine=libaio \
  --direct=1 \
  --rw=randwrite \
  --bs=4k \
  --size=1G \
  --numjobs=4 \
  --iodepth=32 \
  --time_based \
  --runtime=30

# Compare Portainer API response times before and after
for i in $(seq 1 10); do
  time curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "https://portainer.example.com/api/endpoints" > /dev/null
done
```

## Conclusion

SSD storage for Portainer's database is one of the most impactful infrastructure changes you can make. BoltDB is sensitive to storage latency, and spinning disk latency can become the bottleneck when Portainer is taking regular snapshots and updating its state. Moving to SSD can reduce API response times noticeably in environments with many containers. For Docker's image and container storage, SSD can speed up container startups and image builds. The NVMe `none` I/O scheduler is commonly used on devices that already provide their own queuing. Benchmark before and after to quantify the improvement for your specific workload.
