# How to Set Up Stack-Level Resource Constraints in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Resource Limit, Stack, CPU, Memory, Performance

Description: Apply CPU, memory, and I/O resource constraints across all services in a Portainer stack to ensure fair resource sharing between applications on shared Docker hosts.

---

Per-service resource management in a stack helps ensure that no single service can monopolize host resources, making multi-application hosts stable and predictable.

## Per-Service Resource Limits

Set limits on each service in the stack:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    deploy:
      resources:
        limits:
          cpus: "1.0"      # Max 1 CPU core
          memory: 512M     # Max 512MB RAM
        reservations:
          cpus: "0.25"
          memory: 128M

  database:
    image: postgres:16-alpine
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 1G

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
        reservations:
          cpus: "0.1"
          memory: 64M
```

## Total Stack Budget

Plan your stack's resource budget before deployment:

| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|-------------|--------------|-----------------|
| webapp | 1.0 | 512M | 0.25 | 128M |
| database | 2.0 | 2G | 0.5 | 1G |
| redis | 0.5 | 256M | 0.1 | 64M |
| **Total** | **3.5** | **2.75G** | **0.85** | **1.19G** |

Ensure the host has sufficient capacity for all stacks running on it.

## Memory Limits with Swap Control

For predictable OOM behavior, disable swap:

```yaml
services:
  app:
    image: myapp:1.2.3
    mem_limit: 512m
    memswap_limit: 512m   # Equal = no swap; prevents slow swap-induced degradation
```

## CPU Throttling for Background Jobs

Give background services lower CPU priority:

```yaml
services:
  api:
    image: myapi:1.2.3
    cpu_shares: 1024    # Normal priority

  backup-job:
    image: backup:1.0
    cpu_shares: 256     # 1/4 the priority of api when CPU is contended
    cpus: "0.5"         # Hard limit: max 0.5 cores
```

## Monitoring Resource Consumption

Use the Portainer stats view or Docker stats to verify containers stay within their limits:

```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

## Summary

Per-service resource constraints in Portainer stacks protect host stability by preventing any service from consuming unbounded CPU or memory. Set limits (hard caps) and reservations where your deployment mode supports them, and plan your total stack resource budget against available host capacity.
