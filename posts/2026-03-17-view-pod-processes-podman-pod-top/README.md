# How to View Pod Processes with podman pod top

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Monitoring, Process

Description: Learn how to use podman pod top to view running processes across all containers in a pod.

---

> The podman pod top command shows processes from all containers in a pod in a single unified view.

When debugging a pod, you need to see what processes are running across all containers. The `podman pod top` command gives you a ps-like view of every process in every container within the pod, making it easy to spot runaway processes, zombie processes, or unexpected workloads.

---

## Viewing Processes in a Pod

```bash
# Create a pod with containers

podman pod create --name app-pod
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name worker docker.io/library/alpine \
  sh -c "while true; do sleep 10; done"

# View all processes across the pod
podman pod top app-pod
```

## Understanding the Output

```bash
# Default output is similar to ps -ef
podman pod top app-pod

# Example output:
# USER    PID   PPID  %CPU   ELAPSED  TTY  TIME  COMMAND
# root    1     0     0.000  20s      ?    0s    nginx: master process
# nginx   29    1     0.000  20s      ?    0s    nginx: worker process
# root    1     0     0.000  18s      ?    0s    sleep 10
```

## Custom Format Descriptors

```bash
# Show specific columns
podman pod top app-pod pid user comm vsz

# Show process hierarchy with arguments
podman pod top app-pod pid ppid args

# Include CPU and virtual memory size
podman pod top app-pod pid user pcpu vsz comm
```

## Available Format Descriptors

```bash
# Common descriptors for podman pod top:
# pid    - Process ID
# ppid   - Parent process ID
# user   - Username
# comm   - Command name
# args   - Full command with arguments
# pcpu   - CPU percentage
# vsz    - Virtual memory size
# etime  - Elapsed time
# state  - Process state
```

## Comparing with Individual Container Top

```bash
# View processes in a specific container
podman top web

# View processes in another container
podman top worker

# Pod top combines both into a single view
podman pod top app-pod
```

## Watching Processes Over Time

```bash
# Use watch to continuously monitor pod processes
watch -n 2 podman pod top app-pod pid user pcpu vsz comm

# This refreshes every 2 seconds
```

## Identifying Resource-Heavy Processes

```bash
# Sort output by CPU usage (using shell tools)
podman pod top app-pod pid user pcpu vsz comm | head -1
podman pod top app-pod pid user pcpu vsz comm | tail -n +2 | sort -k3 -rn
```

## Summary

Use `podman pod top` to get a unified view of all processes running across every container in a pod. Customize the output with format descriptors to show CPU, virtual memory size, and other process details. Combine with `watch` for continuous monitoring during debugging.
