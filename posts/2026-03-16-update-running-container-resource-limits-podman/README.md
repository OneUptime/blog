# How to Update a Running Container's Resource Limits in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Resource Management, Container Management

Description: Learn how to dynamically update CPU, memory, and other resource limits on running Podman containers without restarting them.

---

> Updating resource limits on the fly lets you respond to changing workloads without any container downtime.

The `podman update` command lets you modify resource constraints on a running container without stopping or recreating it. This is essential for responding to load changes, fixing resource issues, and tuning container performance in real time. This guide covers all the resource limits you can update dynamically.

---

## Basic Resource Update

```bash
# Start a container with initial limits

podman run -d --name my-app \
  --memory 256m \
  --cpus 1.0 \
  docker.io/library/alpine:latest sleep 3600

# Update memory limit
podman update --memory 512m my-app

# Update CPU limit
podman update --cpus 2.0 my-app

# Verify the changes
podman inspect my-app --format 'Memory: {{.HostConfig.Memory}} CPUs: {{.HostConfig.NanoCpus}}'

# Clean up
podman rm -f my-app
```

## Updating Memory Limits

```bash
# Start a container
podman run -d --name mem-test \
  --memory 128m \
  docker.io/library/alpine:latest sleep 3600

# Increase memory limit
podman update --memory 512m mem-test

# Set memory reservation (soft limit)
podman update --memory-reservation 256m mem-test

# Set memory swap limit
podman update --memory 512m --memory-swap 1g mem-test

# Verify
podman inspect mem-test --format '{{.HostConfig.Memory}}'

# Clean up
podman rm -f mem-test
```

## Updating CPU Limits

```bash
# Start a container with CPU constraints
podman run -d --name cpu-test \
  --cpus 0.5 \
  docker.io/library/alpine:latest sleep 3600

# Update to allow more CPU
podman update --cpus 2.0 cpu-test

# Set CPU shares (relative weight)
podman update --cpu-shares 1024 cpu-test

# Set CPU period and quota directly
podman update --cpu-period 100000 --cpu-quota 200000 cpu-test

# Pin to specific CPU cores
podman update --cpuset-cpus 0,1 cpu-test

# Verify
podman inspect cpu-test --format 'CPUs: {{.HostConfig.NanoCpus}} Shares: {{.HostConfig.CpuShares}}'

# Clean up
podman rm -f cpu-test
```

## Updating Multiple Limits at Once

```bash
# Update several limits in a single command
podman run -d --name multi-update \
  --memory 128m --cpus 0.5 \
  docker.io/library/alpine:latest sleep 3600

podman update \
  --memory 1g \
  --memory-reservation 512m \
  --cpus 4.0 \
  --cpu-shares 2048 \
  multi-update

# Verify all changes
podman inspect multi-update --format '
  Memory: {{.HostConfig.Memory}}
  MemReservation: {{.HostConfig.MemoryReservation}}
  NanoCpus: {{.HostConfig.NanoCpus}}
  CpuShares: {{.HostConfig.CpuShares}}'

# Clean up
podman rm -f multi-update
```

## Updating Block I/O Limits

```bash
# Start a container
podman run -d --name io-test docker.io/library/alpine:latest sleep 3600

# Set block I/O weight (10-1000)
podman update --blkio-weight 500 io-test

# Verify
podman inspect io-test --format '{{.HostConfig.BlkioWeight}}'

# Clean up
podman rm -f io-test
```

## Updating PIDs Limit

```bash
# Start a container
podman run -d --name pids-test \
  --pids-limit 100 \
  docker.io/library/alpine:latest sleep 3600

# Increase the PIDs limit
podman update --pids-limit 500 pids-test

# Verify
podman inspect pids-test --format '{{.HostConfig.PidsLimit}}'

# Clean up
podman rm -f pids-test
```

## Updating Restart Policy

```bash
# Start a container with no restart policy
podman run -d --name restart-test docker.io/library/alpine:latest sleep 3600

# Update to restart on failure
podman update --restart on-failure:5 restart-test

# Update to always restart
podman update --restart always restart-test

# Verify
podman inspect restart-test --format '{{.HostConfig.RestartPolicy.Name}}'

# Clean up
podman rm -f restart-test
```

## Monitoring After Update

Verify that updated limits are being enforced.

```bash
# Start a container
podman run -d --name monitored \
  --memory 256m --cpus 1.0 \
  docker.io/library/alpine:latest \
  sh -c 'while true; do echo "working"; sleep 5; done'

# Update limits
podman update --memory 512m --cpus 2.0 monitored

# Check real-time resource usage
podman stats --no-stream monitored

# View detailed resource info
podman inspect monitored --format '
  Memory Limit: {{.HostConfig.Memory}}
  CPU Limit: {{.HostConfig.NanoCpus}}'

# Clean up
podman rm -f monitored
```

## Scripting Dynamic Resource Management

```bash
#!/bin/bash
# auto-scale.sh - Adjust container resources based on usage

CONTAINER="my-app"
HIGH_MEM_THRESHOLD=80
LOW_MEM_THRESHOLD=30

# Get current memory usage percentage
MEM_USAGE=$(podman stats --no-stream --format "{{.MemPerc}}" "$CONTAINER" | tr -d '%')

echo "Current memory usage: ${MEM_USAGE}%"

if (( $(echo "$MEM_USAGE > $HIGH_MEM_THRESHOLD" | bc -l) )); then
  echo "High memory usage detected. Increasing limit..."
  podman update --memory 1g "$CONTAINER"
  echo "Memory limit increased to 1GB"
elif (( $(echo "$MEM_USAGE < $LOW_MEM_THRESHOLD" | bc -l) )); then
  echo "Low memory usage. Reducing limit..."
  podman update --memory 256m "$CONTAINER"
  echo "Memory limit reduced to 256MB"
else
  echo "Memory usage is within normal range"
fi
```

## Listing All Updateable Resources

Here is a reference of common resources you can update on a running container:

```bash
# Memory options
podman update --memory <limit> <container>
podman update --memory-reservation <limit> <container>
podman update --memory-swap <limit> <container>

# CPU options
podman update --cpus <number> <container>
podman update --cpu-shares <shares> <container>
podman update --cpu-period <period> <container>
podman update --cpu-quota <quota> <container>
podman update --cpuset-cpus <cpus> <container>
podman update --cpuset-mems <mems> <container>

# I/O options
podman update --blkio-weight <weight> <container>

# Process options
podman update --pids-limit <limit> <container>

# Restart policy
podman update --restart <policy> <container>
```

## Summary

The `podman update` command enables dynamic resource management without container downtime. Update memory, CPU, I/O, and PID limits on running containers to respond to changing workloads. Combine updates with monitoring via `podman stats` and `podman inspect` to verify changes are applied and effective.
