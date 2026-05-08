# How to Run a Container with PID Limits in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, PID Limits, Security, Resource Limit

Description: Learn how to set PID limits on Podman containers to prevent fork bombs and runaway process creation from exhausting system resources.

---

> PID limits are your defense against fork bombs and runaway process creation that could bring down your entire host.

Every process on a Linux system uses a PID (Process ID). The host has a finite number of PIDs available, and if a container creates processes without limit, it can exhaust the PID space and prevent any new process from starting on the entire host. This includes critical system processes.

Podman's `--pids-limit` flag caps the number of processes a container can create, providing an essential safety net against both malicious and accidental process exhaustion.

---

## Setting a PID Limit

Use the `--pids-limit` flag to restrict the number of processes:

```bash
# Limit container to 50 processes

podman run -d --name limited --pids-limit 50 alpine sleep 1000000

# Check the current number of processes
podman exec limited sh -c "ls /proc/*/status 2>/dev/null | wc -l"

# Verify the limit
podman inspect limited --format '{{.HostConfig.PidsLimit}}'
```

## Demonstrating PID Limits

```bash
# Set a low PID limit and try to exceed it
podman run --rm --pids-limit 20 alpine sh -c "
  echo 'PID limit: 20'
  echo 'Spawning processes...'
  for i in \$(seq 1 30); do
    sleep 100 &
    if [ \$? -ne 0 ]; then
      echo \"Failed to spawn process \$i - PID limit reached\"
      break
    fi
  done
  echo 'Active processes:'
  ps aux | wc -l
"
```

## Preventing Fork Bombs

A fork bomb is a process that continuously replicates itself:

```bash
# Without PID limits, a fork bomb can crash the host
# WITH PID limits, it is safely contained

# Safe demonstration with a strict limit
podman run --rm --pids-limit 10 alpine sh -c "
  echo 'Attempting controlled fork bomb with PID limit of 10...'
  # This will be stopped by the PID limit
  sh -c 'while true; do sh -c \"sleep 100\" & done' 2>&1 | head -5
  echo 'Fork bomb was contained by PID limit'
  echo 'Process count:'
  ps aux | wc -l
"
```

## Default PID Limits

Check the default PID limit configuration:

```bash
# The default PID limit in Podman is 2048 on systems with the pids cgroup controller
# Check cgroup controllers available on your system
podman info --format '{{.Host.CgroupControllers}}'

# Run a container and check its default limit
podman run --rm alpine sh -c "cat /sys/fs/cgroup/pids.max 2>/dev/null || echo 'No cgroup pids limit file'"
```

## Recommended PID Limits by Workload Type

```bash
# Simple web server (nginx, caddy)
podman run -d --name web --pids-limit 100 -p 8080:80 nginx:latest

# Application server (Node.js, Python)
podman run -d --name app --pids-limit 200 node:20-slim sleep infinity

# Database (PostgreSQL - needs more for connection handling)
podman run -d --name db --pids-limit 500 \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# CI/CD build container (may spawn many processes)
podman run -d --name builder --pids-limit 1000 alpine sleep 1000000

# Minimal single-process container
podman run -d --name minimal --pids-limit 30 alpine sleep 1000000
```

## Monitoring PID Usage

```bash
# Check how many PIDs a container is using
podman run -d --name monitor-test --pids-limit 100 alpine sh -c "
  # Start some background processes
  for i in \$(seq 1 10); do sleep 1000 & done
  sleep 1000000
"

# View PID usage in stats
podman stats --no-stream --format "table {{.Name}}\t{{.PIDs}}" monitor-test

# Read cgroup PID counter directly
podman exec monitor-test sh -c "
  echo 'Current PIDs:'
  cat /sys/fs/cgroup/pids.current 2>/dev/null
  echo 'PID Limit:'
  cat /sys/fs/cgroup/pids.max 2>/dev/null
"

podman stop monitor-test && podman rm monitor-test
```

## Combining PID Limits with Other Resource Limits

```bash
# Comprehensive resource limiting
podman run -d --name hardened \
  --pids-limit 100 \
  --memory 256m \
  --cpus 1 \
  --read-only \
  --tmpfs /tmp:size=32m \
  nginx:latest

# Verify all limits
podman inspect hardened --format '
  PIDs Limit: {{.HostConfig.PidsLimit}}
  Memory: {{.HostConfig.Memory}}
  CPUs: {{.HostConfig.NanoCpus}}
  ReadOnly: {{.HostConfig.ReadonlyRootfs}}
'

podman stop hardened && podman rm hardened
```

## Updating PID Limits at Runtime

```bash
# Start a container
podman run -d --name update-test --pids-limit 50 alpine sleep 1000000

# Update the PID limit
podman update --pids-limit 200 update-test

# Verify the update
podman inspect update-test --format '{{.HostConfig.PidsLimit}}'

podman stop update-test && podman rm update-test
```

## PID Limits in Pods

```bash
# Each container in a pod has its own PID limit
podman pod create --name pid-pod

podman run -d --pod pid-pod --name pod-web --pids-limit 100 nginx:latest
podman run -d --pod pid-pod --name pod-worker --pids-limit 50 alpine sleep 1000000

# Check PID usage for each container in the pod
podman stats --no-stream --format "table {{.Name}}\t{{.PIDs}}" pod-web pod-worker

podman pod stop pid-pod && podman pod rm pid-pod
```

## Troubleshooting PID Limit Issues

```bash
# If a container is hitting its PID limit, you will see errors like:
# "Resource temporarily unavailable" or "Cannot fork"

# Check if a container has hit its PID limit
podman run -d --name trouble --pids-limit 20 alpine sh -c "
  for i in \$(seq 1 30); do sleep 100 & done 2>&1
  sleep 1000000
"

# Check cgroup events for PID limit hits
podman exec trouble sh -c "cat /sys/fs/cgroup/pids.events.local 2>/dev/null || cat /sys/fs/cgroup/pids.events 2>/dev/null"

# Increase the limit if needed
podman update --pids-limit 100 trouble

podman stop trouble && podman rm trouble
```

## Summary

PID limits in Podman are a critical security and stability measure:

- Use `--pids-limit N` to cap the number of processes in a container
- Prevents fork bombs from exhausting host PID space
- Set limits based on your application's actual process needs plus headroom
- Monitor PID usage with `podman stats` and cgroup files
- Combine with memory and CPU limits for comprehensive resource control
- Use `podman update` to adjust limits on running containers

Always set PID limits in production. The small configuration effort prevents catastrophic process exhaustion scenarios.
