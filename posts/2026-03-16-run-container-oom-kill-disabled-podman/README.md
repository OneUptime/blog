# How to Run a Container with OOM Kill Disabled in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OOM Kill, Memory, Resource Limit

Description: Learn how to disable the OOM killer for Podman containers to prevent critical processes from being terminated, and understand when this is appropriate.

---

> Disabling the OOM killer keeps your critical container alive when memory is tight, but it shifts the risk from process death to system hang.

The Linux Out-Of-Memory (OOM) killer is a kernel mechanism that terminates processes when the system runs critically low on memory. By default, when a container exceeds its memory limit, the OOM killer terminates a process inside it. Disabling the OOM killer prevents this termination, but the container may hang or cause system-wide memory pressure instead.

This guide explains how to disable OOM kill, when it makes sense, and what safeguards to put in place.

**Important:** The `--oom-kill-disable` flag is not supported on cgroups v2 systems. Check your cgroup version with `podman info --format '{{.Host.CgroupVersion}}'`.

---

## How the OOM Killer Works with Containers

When a container exceeds its memory limit:

1. The kernel detects that the cgroup memory limit is reached
2. The OOM killer selects a process inside the container to terminate
3. The selected process is killed with SIGKILL (cannot be caught)
4. The container may stop if PID 1 is killed

```bash
# Demonstrate OOM kill behavior (default)

podman run --rm --memory 32m --shm-size 128m alpine sh -c "
  echo 'Attempting to exceed 32MB memory limit...'
  dd if=/dev/zero of=/dev/shm/fill bs=1M count=64 2>&1 || echo 'Process was killed or hit limit'
"

# Check if a container was OOM-killed
podman run -d --name oom-test --memory 32m --shm-size 128m alpine sh -c "
  dd if=/dev/zero of=/dev/shm/fill bs=1M count=64 2>&1
  sleep 10
"
sleep 5
podman inspect oom-test --format '{{.State.OOMKilled}}'
podman rm -f oom-test
```

## Disabling the OOM Killer

Use `--oom-kill-disable` to prevent the OOM killer from terminating container processes:

```bash
# Disable OOM kill - ALWAYS set a memory limit with this flag
podman run -d --name no-oom-kill \
  --memory 256m \
  --oom-kill-disable \
  alpine sleep infinity

# Verify the setting
podman inspect no-oom-kill --format '{{.HostConfig.OomKillDisable}}'
# Output: true

podman stop no-oom-kill && podman rm no-oom-kill
```

## Why You Must Set a Memory Limit

Never disable OOM kill without setting a memory limit:

```bash
# DANGEROUS: OOM kill disabled without memory limit
# The container could consume ALL host memory and freeze the system
# podman run --oom-kill-disable alpine sleep infinity  # DO NOT DO THIS

# SAFE: OOM kill disabled WITH a memory limit
# The container is capped; if it cannot reclaim memory, tasks may block
podman run -d --name safe-no-oom \
  --memory 512m \
  --memory-swap 1g \
  --oom-kill-disable \
  alpine sleep infinity

podman stop safe-no-oom && podman rm safe-no-oom
```

## What Happens When Memory Is Exhausted

With OOM kill disabled, when a container hits its memory limit:

```bash
# The container's processes may hang/sleep waiting for memory to be freed
podman run --rm --memory 64m --shm-size 256m --oom-kill-disable alpine sh -c "
  echo 'Allocating memory with OOM kill disabled...'
  # This may block instead of being killed when the cgroup is under OOM
  timeout 10s dd if=/dev/zero of=/dev/shm/fill bs=1M count=128 2>&1
  code=\$?
  echo 'Process was not killed by the cgroup OOM killer'
  echo \"Exit code: \$code\"
"
```

## Setting OOM Score Adjustment

Instead of disabling OOM kill entirely, you can adjust the OOM priority:

```bash
# Lower OOM score means less likely to be killed (-1000 to 1000)
# -1000 = never kill, 1000 = kill first
# In rootless mode, Podman may clamp negative values to the user's current oom_score_adj
podman run -d --name low-oom-priority \
  --memory 256m \
  --oom-score-adj -500 \
  alpine sleep infinity

# High OOM score - kill this container first under pressure
podman run -d --name expendable \
  --memory 256m \
  --oom-score-adj 500 \
  alpine sleep infinity

# Check OOM score
podman inspect low-oom-priority --format '{{.HostConfig.OomScoreAdj}}'
podman inspect expendable --format '{{.HostConfig.OomScoreAdj}}'

podman stop low-oom-priority expendable && podman rm low-oom-priority expendable
```

## When to Disable OOM Kill

Appropriate scenarios:

```bash
# 1. Critical database that must not be interrupted
podman run -d --name critical-db \
  --memory 4g \
  --memory-swap 8g \
  --oom-kill-disable \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# 2. Stateful application where data loss is worse than a hang
podman run -d --name stateful-app \
  --memory 2g \
  --memory-swap 4g \
  --oom-kill-disable \
  alpine sleep infinity

# Clean up
podman stop critical-db stateful-app 2>/dev/null
podman rm critical-db stateful-app 2>/dev/null
```

## When NOT to Disable OOM Kill

```bash
# Stateless web servers - better to let OOM kill and restart
podman run -d --name web \
  --memory 256m \
  --restart on-failure:5 \
  nginx:latest

# Batch jobs - better to fail and retry
podman run -d --name batch \
  --memory 512m \
  --restart on-failure:3 \
  alpine sh -c "echo 'Processing...'; sleep 60"

# Worker processes - easily replaceable
podman run -d --name worker \
  --memory 256m \
  --restart always \
  alpine sleep infinity

podman stop web batch worker 2>/dev/null
podman rm web batch worker 2>/dev/null
```

## Monitoring OOM Events

```bash
# Check if any container has been OOM-killed
podman ps -a --format "table {{.Names}}\t{{.Status}}" | head -10

# Inspect a specific container for OOM status
podman run -d --name oom-monitor --memory 64m --shm-size 256m alpine sh -c "
  dd if=/dev/zero of=/dev/shm/fill bs=1M count=128 2>&1
  sleep 10
"
sleep 3

podman inspect oom-monitor --format '
  OOM Killed: {{.State.OOMKilled}}
  Exit Code: {{.State.ExitCode}}
  Status: {{.State.Status}}
'

# Check system logs for OOM events
# dmesg | grep -i "oom\|out of memory" | tail -5

podman rm -f oom-monitor
```

## Combining OOM Kill Disable with Other Safeguards

```bash
# If you disable OOM kill, add other protections
podman run -d --name protected-service \
  --memory 1g \
  --memory-swap 2g \
  --memory-reservation 512m \
  --oom-kill-disable \
  --pids-limit 200 \
  --cpus 2 \
  --restart on-failure:3 \
  alpine sleep infinity

# Memory reservation helps the kernel reclaim memory before hitting the hard limit
# PID limits prevent process proliferation from consuming memory
# CPU limits prevent runaway computation
# Restart policy handles cases where the service does eventually fail

podman stop protected-service && podman rm protected-service
```

## Summary

Disabling the OOM killer in Podman is a specialized option for critical workloads:

- Use `--oom-kill-disable` only with `--memory` (never without a limit)
- Also set an explicit `--memory-swap` limit if you need to cap total memory plus swap usage
- Consider `--oom-score-adj` as a less extreme alternative
- Appropriate for databases and stateful services where data integrity is paramount
- Not appropriate for stateless, easily replaceable workloads
- Monitor containers for OOM events with `podman inspect`
- Combine with other resource limits and restart policies for defense in depth

The default OOM behavior (kill the process) is correct for most workloads. Disable it only when you have a specific, well-understood need.
