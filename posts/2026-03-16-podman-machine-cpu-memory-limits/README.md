# How to Set CPU and Memory Limits for a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to configure and adjust CPU and memory limits for a Podman machine to optimize performance for your container workloads.

---

> Properly tuning CPU and memory for your Podman machine prevents resource contention between the VM and your host system.

Podman machines on macOS and Windows run inside a virtual machine, and the resources allocated to that VM directly affect container performance. Setting the right CPU and memory limits is crucial for balancing container workload needs with host system responsiveness. This guide covers setting, adjusting, and monitoring these limits.

---

## Prerequisites

- Podman installed on macOS or Windows
- A Podman machine initialized (or ready to create one)

## Check Current Resource Allocation

```bash
# View current machine configuration

podman machine list

# Get detailed machine information
podman machine inspect

# Check resources from inside the machine
podman machine ssh -- nproc
podman machine ssh -- free -h
```

## Setting CPU Limits

### During Initialization

```bash
# Create a machine with a specific number of CPUs
podman machine init --cpus 4

# For CPU-intensive workloads like building images
podman machine init --cpus 8
```

### Modifying CPU After Creation

To change the CPU allocation of an existing machine, you can use `podman machine set`. Note that `--cpus` is only supported for QEMU-based machines. On Apple Silicon Macs (applehv), you must recreate the machine with `podman machine init` to change CPU allocation.

```bash
# Stop the machine first
podman machine stop

# Set a new CPU count
podman machine set --cpus 6

# Start the machine with the new settings
podman machine start

# Verify the change
podman machine ssh -- nproc
```

## Setting Memory Limits

### During Initialization

```bash
# Create a machine with 8GB of memory
podman machine init --memory 8192

# For memory-intensive workloads
podman machine init --memory 16384
```

### Modifying Memory After Creation

Note: `--memory` on `podman machine set` is only supported for QEMU-based machines. On Apple Silicon Macs (applehv), you must recreate the machine with `podman machine init` to change memory allocation.

```bash
# Stop the machine
podman machine stop

# Set new memory limit (in MB)
podman machine set --memory 12288

# Start the machine
podman machine start

# Verify the change
podman machine ssh -- free -h
```

## Setting Both CPU and Memory Together

```bash
# Set both during initialization
podman machine init --cpus 4 --memory 8192

# Or modify both on an existing machine
podman machine stop
podman machine set --cpus 6 --memory 12288
podman machine start
```

## Monitoring Resource Usage

### From the Host

```bash
# Check machine resource usage
podman machine inspect --format '{{.Resources.CPUs}} CPUs, {{.Resources.Memory}}MB RAM'
```

### From Inside the Machine

```bash
# SSH into the machine and check usage
podman machine ssh

# Inside the machine:
# Check CPU usage
top -bn1 | head -5

# Check memory usage
free -h

# Check per-process resource usage
ps aux --sort=-%mem | head -10

# Exit the machine
exit
```

### Container-Level Monitoring

```bash
# Monitor resource usage of running containers
podman stats

# One-time snapshot
podman stats --no-stream

# Monitor a specific container
podman stats my-container
```

Resource Allocation Strategies

### Development Machine

```bash
# Balanced for development work
# Leave at least 50% of host resources for the host OS
podman machine stop
podman machine set --cpus 4 --memory 8192
podman machine start
```

### CI/CD Build Machine

```bash
# Maximize resources for fast builds
# Use up to 75% of host resources
podman machine stop
podman machine set --cpus 8 --memory 16384
podman machine start
```

### Database Workloads

```bash
# Memory-heavy configuration for databases
podman machine stop
podman machine set --cpus 4 --memory 16384
podman machine start
```

## Setting Container-Level Limits Within the Machine

Even with machine-level limits, you should set per-container limits:

```bash
# Run a container with CPU and memory limits
podman run -d \
  --name limited-app \
  --cpus 2 \
  --memory 1g \
  docker.io/library/nginx:latest

# Run a database with specific resource limits
podman run -d \
  --name postgres-db \
  --cpus 2 \
  --memory 4g \
  --memory-swap 8g \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Verify container resource limits
podman inspect limited-app --format '{{.HostConfig.NanoCpus}} {{.HostConfig.Memory}}'
```

## Running a Performance Test

Verify your resource settings with a practical test:

```bash
# Test CPU performance
podman run --rm docker.io/library/alpine:latest sh -c "
  echo 'Available CPUs:' && nproc
  echo 'Running CPU benchmark...'
  time dd if=/dev/zero bs=1M count=1024 | md5sum
"

# Test memory allocation
podman run --rm --memory 2g --tmpfs /mnt:rw,size=1536m docker.io/library/alpine:latest sh -c "
  echo 'Available memory:'
  free -h
  echo 'Allocating 1GB...'
  dd if=/dev/zero of=/mnt/memory-test bs=1M count=1024
  echo 'Memory test passed'
"

# Run a multi-container workload
podman run -d --name cpu-test-1 --cpus 1 docker.io/library/nginx:latest
podman run -d --name cpu-test-2 --cpus 1 docker.io/library/nginx:latest

# Monitor the distribution
podman stats --no-stream

# Clean up
podman stop cpu-test-1 cpu-test-2
podman rm cpu-test-1 cpu-test-2
```

## Checking Host System Resources

Before allocating resources, check what is available on your host:

```bash
# macOS: Check total system resources
sysctl -n hw.ncpu                    # Total CPU cores
sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 " GB"}'  # Total RAM

# Windows (PowerShell):
# (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
# (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
```

## Handling Resource Exhaustion

If your machine runs out of resources:

```bash
# Check which containers are using the most resources
podman stats --no-stream

# Kill resource-heavy containers
podman stop <container-name>

# Prune unused resources to free memory
podman system prune -a

# If the machine itself is unresponsive
podman machine stop
podman machine set --memory 16384
podman machine start
```

## Troubleshooting

If `podman machine set` fails:

```bash
# Ensure the machine is stopped
podman machine stop

# Try setting resources individually
podman machine set --cpus 4
podman machine set --memory 8192
```

If containers are killed due to OOM (Out of Memory):

```bash
# Check container logs for OOM messages
podman logs <container-name>

# Increase machine memory
podman machine stop
podman machine set --memory 16384
podman machine start

# Or set swap for the container
podman run -d --memory 2g --memory-swap 4g <image>
```

If CPU performance is poor:

```bash
# Check if other processes are competing for CPU inside the machine
podman machine ssh -- top -bn1 | head -10

# Allocate more CPUs
podman machine stop
podman machine set --cpus 8
podman machine start
```

## Summary

Setting CPU and memory limits for your Podman machine is essential for balancing container workload performance with host system responsiveness. Use `podman machine set` to adjust resources on existing machines without recreating them. Monitor usage at both the machine and container levels to identify bottlenecks. As a rule of thumb, allocate no more than 75% of your host resources to the Podman machine.
