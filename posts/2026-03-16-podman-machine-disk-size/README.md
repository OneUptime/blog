# How to Set Disk Size for a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to configure and manage disk size for a Podman machine, including setting initial size, monitoring usage, and handling disk space issues.

---

> Properly sizing your Podman machine's disk prevents out-of-space failures during image builds and ensures enough room for container data.

Container images, build caches, and volumes can consume significant disk space. On macOS and Windows, all container storage lives inside the Podman machine's virtual disk. Setting the right disk size during initialization and managing it effectively is critical for avoiding interrupted builds and failed deployments.

---

## Prerequisites

- Podman installed on macOS or Windows
- A Podman machine initialized (or ready to create one)

## Check Current Disk Usage

```bash
# View machine configuration including disk size

podman machine list

# Get detailed disk information
podman machine inspect

# Check disk usage from inside the machine
podman machine ssh -- df -h /
```

## Setting Disk Size During Initialization

```bash
# Initialize with a custom disk size (in GiB)
podman machine init --disk-size 100

# For image-heavy workloads
podman machine init --disk-size 200

# For minimal testing
podman machine init --disk-size 30

# Combine with other resource settings
podman machine init \
  --cpus 4 \
  --memory 8192 \
  --disk-size 150
```

## Modifying Disk Size After Creation

Use `podman machine set` to change the disk size. Note that `--disk-size` is only supported for QEMU-based machines. On Apple Silicon Macs (applehv), you must recreate the machine with `podman machine init` to change disk size.

```bash
# Stop the machine first
podman machine stop

# Increase the disk size (can only increase, not decrease)
podman machine set --disk-size 200

# Start the machine
podman machine start

# Verify the new disk size
podman machine ssh -- df -h /
```

Note: You can increase disk size but typically cannot decrease it without recreating the machine.

## Monitoring Disk Usage

### Check Overall Disk Usage

```bash
# View Podman system disk usage
podman system df

# Detailed breakdown
podman system df -v
```

### Check Usage Inside the Machine

```bash
# SSH into the machine and check disk space
podman machine ssh -- df -h

# Check what is consuming space
podman machine ssh -- du -sh /var/lib/containers/storage/*

# Check the overlay storage specifically
podman machine ssh -- du -sh /var/lib/containers/storage/overlay
```

### Check Image and Container Sizes

```bash
# List images with sizes
podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}"

# List container sizes
podman ps -a --size --format "{{.Names}} {{.Size}}"

# List volume sizes
podman volume ls
podman system df -v | grep -A 100 "Local Volumes"
```

## Freeing Disk Space

### Prune Unused Resources

```bash
# Remove unused images
podman image prune -a

# Remove stopped containers
podman container prune

# Remove unused volumes
podman volume prune

# Remove unused networks
podman network prune

# Remove everything unused at once
podman system prune -a --volumes
```

### Remove Specific Large Items

```bash
# Find the largest images
podman images --sort size --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | tail -10

# Remove a specific large image
podman rmi docker.io/library/node:latest

# Remove dangling images (untagged layers)
podman image prune

# Remove build containers and dangling build cache
podman system prune --build
```

### Check and Clean Build Cache

```bash
# View overall disk usage before cleaning build cache
podman system df -v

# Remove build containers and dangling build cache
podman system prune --build -f
```

## Disk Size Planning

### Small Workloads (30-50 GB)

```bash
# Testing and learning - few images, no build cache
podman machine init --disk-size 30

# Good for:
# - Running 2-3 pre-built containers
# - Testing basic Podman features
# - Single-service development
```

### Medium Workloads (100-150 GB)

```bash
# Standard development - multiple images and containers
podman machine init --disk-size 100

# Good for:
# - Running 5-10 containers
# - Multi-service development
# - Moderate image building
```

### Large Workloads (200+ GB)

```bash
# Heavy development - large images, many containers, CI/CD
podman machine init --disk-size 250

# Good for:
# - Building multiple large images
# - Running database containers with persistent data
# - CI/CD pipelines
# - Machine learning containers
```

## Running a Practical Example

Test your disk configuration with a realistic workload:

```bash
# Check starting disk usage
podman system df

# Pull several images to test disk usage
podman pull docker.io/library/nginx:latest
podman pull docker.io/library/postgres:16
podman pull docker.io/library/redis:latest
podman pull docker.io/library/node:20

# Check how much space the images use
podman system df

# Create a container with a volume
podman volume create test-data
podman run -d \
  --name disk-test \
  -v test-data:/data \
  docker.io/library/alpine:latest \
  sh -c "dd if=/dev/zero of=/data/testfile bs=1M count=100 && sleep 3600"

# Check the volume size
podman system df -v

# Clean up
podman stop disk-test
podman rm disk-test
podman volume rm test-data
```

## Automating Disk Cleanup

Set up automatic cleanup to prevent disk exhaustion:

```bash
# Create a cleanup script
cat > ~/podman-cleanup.sh <<'EOF'
#!/bin/bash
echo "Podman disk usage before cleanup:"
podman system df

echo "Pruning unused resources..."
podman image prune -a -f
podman container prune -f
podman volume prune -f
podman system prune --build -f

echo "Podman disk usage after cleanup:"
podman system df
EOF

chmod +x ~/podman-cleanup.sh

# Run it periodically
./podman-cleanup.sh
```

## Recreating the Machine with Larger Disk

If you need to significantly change disk size:

```bash
# Export any important data first
podman save nginx:latest -o ~/nginx-backup.tar

# Stop and remove the machine
podman machine stop
podman machine rm

# Create a new machine with a larger disk
podman machine init \
  --cpus 4 \
  --memory 8192 \
  --disk-size 250

# Start the new machine
podman machine start

# Re-import your images
podman load -i ~/nginx-backup.tar

# Clean up the backup
rm ~/nginx-backup.tar
```

## Troubleshooting

If containers fail with "no space left on device":

```bash
# Check disk usage
podman system df
podman machine ssh -- df -h /

# Emergency cleanup
podman system prune -a -f --volumes

# If still full, increase disk size
podman machine stop
podman machine set --disk-size 200
podman machine start
```

If disk usage grows unexpectedly:

```bash
# Check for containers writing large amounts of data
podman ps -a --size

# Check container logs size (logs can grow large)
podman machine ssh -- du -sh /var/lib/containers/storage/overlay-containers/*/userdata/

# Restart containers with a log size limit
podman run -d --log-opt max-size=10mb docker.io/library/nginx:latest
```

If `podman machine set --disk-size` fails:

```bash
# Some versions only support increasing disk size
# You may need to recreate the machine
podman machine stop
podman machine rm
podman machine init --disk-size 200
podman machine start
```

## Summary

Managing disk size for your Podman machine is about balancing storage capacity with actual usage. Set an appropriate initial size based on your workload, monitor usage with `podman system df`, and clean up regularly with `podman system prune`. When disk needs grow, use `podman machine set` to increase the allocation or recreate the machine with a larger disk.
