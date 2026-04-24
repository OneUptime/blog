# How to Configure Service Resource Limits in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Resource, Service, DevOps

Description: Learn how to set CPU and memory limits and reservations for Docker Swarm services in Portainer to ensure stable cluster performance.

## Introduction

Resource limits in Docker Swarm prevent any single service from consuming all available CPU and memory on a node, ensuring cluster stability. Portainer provides an interface for setting both resource limits (maximum usage) and reservations (guaranteed minimum). This guide covers configuring service resource constraints for production deployments.

## Prerequisites

- Portainer on Docker Swarm
- Running Swarm cluster
- Understanding of Docker resource management concepts

Resource Management Concepts

### Limits vs Reservations

| Setting | Description | Effect |
|---------|-------------|--------|
| **CPU Limit** | Maximum CPU the service can use | Hard cap - cgroup enforcement |
| **CPU Reservation** | Minimum CPU guaranteed | Used by scheduler for placement |
| **Memory Limit** | Maximum RAM; task is OOM-killed if exceeded | Hard cap |
| **Memory Reservation** | Minimum RAM guaranteed | Used by scheduler for placement |

### CPU Units

CPU values are in fractional vCPUs:
- `0.5` = 50% of one CPU core
- `1.0` = 1 full CPU core
- `2.0` = 2 CPU cores

### Memory Units

```text
128m, 256m, 512m, 1g, 2g, etc.
```

## Step 1: Configure Resources in Portainer Service Editor

1. Open **Services → Add service** (or edit existing)
2. Scroll to the **Resources** section
3. Set values:

```text
CPU reservation:   0.25    # Reserve 25% of a CPU
CPU limit:         0.5     # Cap at 50% of a CPU

Memory reservation: 128m   # Reserve 128MB
Memory limit:       512m   # Cap at 512MB; OOM-killed if exceeded
```

4. Save/create the service

## Step 2: Configure Resources in a Compose File

```yaml
version: "3.8"

services:
  # High-traffic web service with generous limits
  frontend:
    image: nginx:alpine
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: "0.5"        # Max 0.5 CPU per replica
          memory: 256M       # Max 256MB RAM per replica
        reservations:
          cpus: "0.25"       # Guarantee 0.25 CPU per replica
          memory: 128M       # Guarantee 128MB RAM per replica

  # CPU-intensive API
  api:
    image: myapi:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "2.0"        # Can use up to 2 CPU cores
          memory: 1G         # Max 1GB RAM
        reservations:
          cpus: "1.0"        # Always get 1 CPU
          memory: 512M       # Always get 512MB

  # Memory-intensive database
  postgres:
    image: postgres:15
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: "4.0"        # Generous CPU for queries
          memory: 4G         # PostgreSQL uses lots of memory
        reservations:
          cpus: "2.0"
          memory: 2G

  # Background worker
  worker:
    image: myworker:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          cpus: "0.1"        # Low reservation for burst workloads
          memory: 256M
```

## Step 3: Understand the OOM Killer

When a container exceeds its memory limit, the Linux OOM (Out of Memory) killer terminates it:

```bash
# Check if a container was OOM-killed

docker inspect <container-id> --format '{{.State.OOMKilled}}'
# Returns: true or false

# Or check from service task history
docker service ps my-service --no-trunc | grep -i "oom\|killed"
```

In Portainer, an OOM-killed container often shows with exit code `137`, but `137` only means the container received `SIGKILL` and is not exclusive to OOM conditions. Use `.State.OOMKilled` to confirm the cause.

To prevent OOM kills, increase the memory limit or optimize the application's memory usage.

## Step 4: Right-Sizing Resource Limits

Determine appropriate limits by monitoring actual usage:

```bash
# Monitor real-time stats for a service's containers
docker stats $(docker ps -q --filter label=com.docker.swarm.service.name=my-service)

# Get a one-time snapshot
docker stats --no-stream --format "{{.Container}}: CPU={{.CPUPerc}}, Mem={{.MemUsage}}"
```

**Rule of thumb:**
- Set **limit** to 150-200% of normal peak usage
- Set **reservation** to 50-75% of normal average usage

```text
Example: API service normally uses 200MB, peaks at 350MB
  Memory limit:       512M    (50% above peak)
  Memory reservation: 128M    (~64% of normal usage)
```

## Step 5: Monitor Resource Usage in Portainer

1. Navigate to **Services**
2. Click on a service
3. Click on a running task to open its container details
4. Click **Stats**

The stats view shows:
- CPU usage percentage
- Memory usage and limit
- Network I/O
- Block I/O

## Step 6: Scheduler Behavior with Reservations

The Swarm scheduler uses reservations for bin-packing:

```text
Node worker-01: 4 CPU, 8GB RAM
  Existing reservations: 2 CPU, 4GB RAM used
  Available for scheduling: 2 CPU, 4GB RAM

Attempting to schedule:
  New task reservation: 3 CPU, 2GB RAM
  Result: DOES NOT FIT (3 CPU > 2 available, 2GB < 4GB available) → Pending
```

If no node has enough resources to satisfy reservations, tasks stay in `pending` state.

## Step 7: Adjust Limits on a Running Service

```bash
# Update resource limits for a running service
docker service update \
  --limit-cpu 1.0 \
  --limit-memory 1G \
  --reserve-cpu 0.5 \
  --reserve-memory 512M \
  my-api-service
```

Portainer applies the change as a rolling service update, replacing tasks gradually according to the update policy.

## Conclusion

Configuring resource limits and reservations is essential for running multiple services reliably on a shared Swarm cluster. Without limits, one misbehaving service can crash all containers on a node. Without reservations, the scheduler can over-commit resources leading to poor performance. Set both values based on observed usage patterns and adjust regularly as your application load changes.
