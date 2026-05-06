# How to Configure Container Cgroup Limits in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Cgroups, Resource Limit, CPU, Memory, Performance

Description: Configure Linux cgroup resource limits for Docker containers in Portainer to enforce CPU quotas, memory limits, and I/O bandwidth controls to ensure fair resource sharing on shared hosts.

---

Linux control groups (cgroups) are the kernel mechanism that enforces resource limits on containers. Docker exposes cgroup controls through configuration options that you can set in Portainer stacks on Docker Standalone environments or the container creation form.

## CPU Limits

### CPU Shares (Relative Priority)

```yaml
services:
  high-priority:
    image: myapp:1.2.3
    cpu_shares: 1024    # Default is 1024; higher = higher priority

  low-priority:
    image: batch-job:1.0
    cpu_shares: 256     # Gets 1/4 of the CPU relative to high-priority
```

CPU shares are relative - they only matter when the CPU is contended.

### CPU Quota (Hard Limit)

```yaml
services:
  webapp:
    image: myapp:1.2.3
    cpus: "1.5"         # Hard limit: max 1.5 CPU cores

  # Equivalent to:
  # cpu_quota: 150000   (150% of 100ms period = 1.5 CPUs)
  # cpu_period: 100000  (100ms scheduling period)
```

### CPU Pinning (CPU Sets)

Restrict a container to specific CPU cores:

```yaml
services:
  latency-sensitive:
    image: myapp:1.2.3
    cpuset: "0,1"       # Only use CPU cores 0 and 1
    # Useful for NUMA-aware applications and isolating noisy neighbors
```

## Memory Limits

```yaml
services:
  webapp:
    image: myapp:1.2.3
    mem_limit: 512m         # Hard limit - container is OOMKilled if exceeded
    mem_reservation: 128m   # Soft limit - applied under contention
    memswap_limit: 512m     # Same as mem_limit = no swap (recommended)
    # oom_kill_disable: false  # Allow OOM killer (default and recommended)
```

Memory limit best practices:
- Set `mem_limit` to prevent runaway memory consumption
- Set `memswap_limit` equal to `mem_limit` to disable swap (prevents slow OOM behavior)
- Set `mem_reservation` to the expected steady-state usage

## I/O Limits

```yaml
services:
  backup-job:
    image: backup-tool:1.0
    blkio_config:
      weight: 100           # Default 500; lower = lower I/O priority
      device_read_bps:
        - path: /dev/sda
          rate: "50mb"      # Max read rate from /dev/sda
      device_write_bps:
        - path: /dev/sda
          rate: "50mb"      # Max write rate to /dev/sda
      device_read_iops:
        - path: /dev/sda
          rate: 1000        # Max 1000 read IOPS
      device_write_iops:
        - path: /dev/sda
          rate: 1000        # Max 1000 write IOPS
```

## Complete Production Resource Configuration

```yaml
services:
  production-api:
    image: myapi:1.2.3
    # CPU: max 2 cores, restrict execution to cores 0-3
    cpus: "2.0"
    cpu_shares: 1024
    cpuset: "0-3"
    # Memory: 1GB limit, no swap, 256MB soft reservation
    mem_limit: 1g
    memswap_limit: 1g
    mem_reservation: 256m
    # I/O: lower priority than OLTP
    blkio_config:
      weight: 400
    restart: unless-stopped

  database:
    image: postgres:16
    # Databases get higher I/O priority
    blkio_config:
      weight: 1000
    mem_limit: 4g
    memswap_limit: 4g
    mem_reservation: 2g
    restart: always
```

## Monitoring Cgroup Limits

View current cgroup limits for a running container:

```bash
# Check memory limit

docker inspect container_name --format "{{.HostConfig.Memory}}"

# Check CPU quota
docker inspect container_name --format "{{.HostConfig.CpuQuota}} {{.HostConfig.CpuPeriod}}"

# Real-time resource usage
docker stats container_name
```

## Portainer UI Resource Limits

In Portainer's container creation form (not stacks), go to **Runtime & Resources** to set:
- Memory reservation
- Memory limit
- Maximum CPU usage

For Docker Standalone stack deployments, the additional cgroup settings shown above are configured in the Compose YAML. On Docker Swarm, use `deploy.resources` for CPU and memory limits.

## Summary

Cgroup limits in Portainer on Docker Standalone hosts protect shared hosts from resource exhaustion by any single container. Set CPU and memory limits on all production services, use I/O throttling for background jobs, and disable swap on memory-limited containers to get deterministic OOM behavior rather than slow swap-induced degradation.
