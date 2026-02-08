# How to Use Docker Update to Change Container Resources Live

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker update, resource limits, cgroups, memory, cpu, live configuration

Description: Learn how to modify CPU, memory, and restart policies on running Docker containers without downtime using docker update.

---

Most people assume you need to stop and recreate a container to change its resource limits. That is not true. The `docker update` command lets you modify CPU, memory, and restart policy settings on running containers without any downtime. The changes take effect immediately through Linux cgroup modifications.

This is particularly useful in production when a container needs more memory to handle a traffic spike or when you want to throttle a runaway process without killing it.

## What Can Docker Update Change?

`docker update` modifies resource constraints that map to Linux cgroup settings. Here is the full list of what you can change on a live container:

- CPU shares, quota, and period
- CPU pinning (which cores a container can use)
- Memory limit and memory reservation
- Kernel memory limit
- Memory swap limit
- Restart policy
- PIDs limit

You cannot change port mappings, volume mounts, network connections, or environment variables with `docker update`. Those require recreating the container.

## Changing Memory Limits

Increase the memory limit of a running container:

```bash
# Increase memory limit to 1GB for a running container
docker update --memory 1g --memory-swap 2g my-container
```

The `--memory` flag sets the hard limit. The `--memory-swap` flag sets the combined memory and swap limit. If you set `--memory` to 1g and `--memory-swap` to 2g, the container can use 1GB of RAM and 1GB of swap.

Check the current memory settings:

```bash
# View current memory limits for a container
docker inspect my-container --format '{{.HostConfig.Memory}} bytes memory, {{.HostConfig.MemorySwap}} bytes swap'
```

A more practical example with human-readable output:

```bash
# Show memory limit in megabytes
docker inspect my-container --format '
  Memory Limit: {{.HostConfig.Memory}}
  Swap Limit: {{.HostConfig.MemorySwap}}
  Memory Reservation: {{.HostConfig.MemoryReservation}}'
```

### Setting a Memory Reservation (Soft Limit)

Memory reservation is a soft limit. Docker tries to keep the container under this limit but allows bursts above it when memory is available:

```bash
# Set a soft limit of 512MB with a hard limit of 1GB
docker update --memory 1g --memory-reservation 512m my-container
```

This tells Docker that the container normally needs 512MB but can burst up to 1GB when needed. When the host is under memory pressure, Docker reclaims memory from containers back to their reservation level.

## Changing CPU Limits

### CPU Shares (Relative Weight)

CPU shares control the relative weight of a container's CPU access. The default is 1024.

```bash
# Give this container twice the default CPU priority
docker update --cpu-shares 2048 high-priority-container

# Give this container half the default CPU priority
docker update --cpu-shares 512 background-worker
```

CPU shares only matter when containers compete for CPU. If a container is the only one running, it gets full CPU access regardless of its share value.

### CPU Quota (Hard Limit)

CPU quota sets an absolute limit on CPU usage using CFS (Completely Fair Scheduler) parameters:

```bash
# Limit the container to 50% of one CPU core
docker update --cpus 0.5 my-container

# Limit to 2 full CPU cores
docker update --cpus 2 my-container
```

The `--cpus` flag is a shorthand. Under the hood, it sets `--cpu-period` and `--cpu-quota`:

```bash
# These two commands are equivalent
docker update --cpus 1.5 my-container
docker update --cpu-period 100000 --cpu-quota 150000 my-container
```

### CPU Pinning

Pin a container to specific CPU cores:

```bash
# Restrict the container to CPU cores 0 and 1 only
docker update --cpuset-cpus "0,1" my-container

# Use a range of cores
docker update --cpuset-cpus "0-3" my-container

# Use specific non-adjacent cores
docker update --cpuset-cpus "0,2,4" my-container
```

CPU pinning is useful for latency-sensitive applications that benefit from CPU cache locality, or for isolating noisy neighbors.

## Changing Restart Policies

Update the restart policy without stopping the container:

```bash
# Set the container to always restart (survives Docker daemon restarts)
docker update --restart always my-container

# Restart only on failure, with a maximum of 5 retries
docker update --restart on-failure:5 my-container

# Restart unless the container was explicitly stopped
docker update --restart unless-stopped my-container

# Disable automatic restarts
docker update --restart no my-container
```

This is commonly used to "promote" a test container to production restart behavior:

```bash
# Container was started without restart policy during testing
docker run -d --name api-server my-api:latest

# After testing, enable auto-restart for production
docker update --restart unless-stopped api-server
```

## Updating Multiple Containers

Apply the same settings to multiple containers at once:

```bash
# Set memory limits on all worker containers
docker update --memory 512m --memory-swap 1g worker-1 worker-2 worker-3
```

Update all running containers with a pattern:

```bash
# Set restart policy on all containers whose names start with "prod-"
docker update --restart unless-stopped $(docker ps --filter name=prod- -q)
```

## Practical Scenario: Handling a Traffic Spike

Your web service is running with 512MB memory and getting OOM-killed during a traffic spike. Instead of restarting with new settings (causing downtime), update it live:

```bash
# Step 1: Check current resource usage
docker stats web-server --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"

# Step 2: Increase memory to handle the spike
docker update --memory 2g --memory-swap 4g web-server

# Step 3: Give it more CPU as well
docker update --cpus 4 web-server

# Step 4: Verify the new limits are applied
docker inspect web-server --format 'Memory: {{.HostConfig.Memory}}, CPUs: {{.HostConfig.NanoCpus}}'

# Step 5: Monitor resource usage with the new limits
docker stats web-server
```

After the traffic spike passes, scale the resources back down:

```bash
# Return to normal resource allocations
docker update --memory 512m --memory-swap 1g --cpus 1 web-server
```

## Verifying Changes Took Effect

After running `docker update`, verify the cgroup settings were applied:

```bash
# Check that the memory limit was applied at the cgroup level
# For cgroup v2 systems
docker exec my-container cat /sys/fs/cgroup/memory.max

# For cgroup v1 systems
docker exec my-container cat /sys/fs/cgroup/memory/memory.limit_in_bytes
```

Check CPU settings:

```bash
# View the CPU quota at the cgroup level
docker exec my-container cat /sys/fs/cgroup/cpu.max
```

Use `docker inspect` for a consolidated view:

```bash
# Show all resource-related settings
docker inspect my-container --format '
  Memory: {{.HostConfig.Memory}}
  MemorySwap: {{.HostConfig.MemorySwap}}
  MemoryReservation: {{.HostConfig.MemoryReservation}}
  NanoCPUs: {{.HostConfig.NanoCpus}}
  CpuShares: {{.HostConfig.CpuShares}}
  CpusetCpus: {{.HostConfig.CpusetCpus}}
  RestartPolicy: {{.HostConfig.RestartPolicy.Name}}'
```

## Limitations

There are important constraints to understand:

1. **Memory can only be increased on running containers on some systems.** Decreasing memory below the container's current usage will fail. The container must free memory first.

2. **Changes do not persist in Docker Compose.** If you use `docker compose up` to recreate containers, they will use the settings from the Compose file, not the `docker update` values.

3. **Not all runtimes support all flags.** The Windows container runtime has different supported flags than the Linux runtime.

4. **Kernel memory limits are deprecated** in newer Docker versions and cgroup v2.

Handle errors when updating:

```bash
# This might fail if the container uses more than 256MB currently
docker update --memory 256m my-container 2>&1
# Error: Cannot update container: memory limit too low
```

## Automating Resource Adjustments

Create a script that adjusts resources based on metrics:

```bash
#!/bin/bash
# auto-scale-memory.sh - Increase container memory when usage exceeds 80%

CONTAINER="web-server"
THRESHOLD=80
INCREASE_MB=256

# Get current memory usage percentage
USAGE=$(docker stats "$CONTAINER" --no-stream --format "{{.MemPerc}}" | tr -d '%')
CURRENT_LIMIT=$(docker inspect "$CONTAINER" --format '{{.HostConfig.Memory}}')

# Convert current limit from bytes to MB
CURRENT_MB=$((CURRENT_LIMIT / 1048576))

if (( $(echo "$USAGE > $THRESHOLD" | bc -l) )); then
  NEW_MB=$((CURRENT_MB + INCREASE_MB))
  echo "Memory usage at ${USAGE}%, increasing from ${CURRENT_MB}MB to ${NEW_MB}MB"
  docker update --memory "${NEW_MB}m" "$CONTAINER"
else
  echo "Memory usage at ${USAGE}%, no adjustment needed"
fi
```

## Docker Update in CI/CD Pipelines

Use `docker update` in deployment pipelines to adjust resources during different phases:

```bash
# During database migration phase, give the app more CPU
docker update --cpus 4 --memory 2g app-server

# Run migrations
docker exec app-server python manage.py migrate

# Scale back for normal operation
docker update --cpus 1 --memory 512m app-server
```

## Summary

`docker update` is a powerful tool for live resource management. It modifies CPU, memory, and restart policy settings through Linux cgroup changes without any container downtime. Use it to respond to traffic spikes, adjust resource allocations based on monitoring data, and change restart policies after testing. Remember that changes made with `docker update` are not reflected in your Compose files, so update both when making permanent changes. Always verify changes with `docker inspect` or by checking the cgroup files directly inside the container.
