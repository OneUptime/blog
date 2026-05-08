# How to View Container Processes with podman top

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Process Management, Monitoring

Description: Learn how to view and analyze running processes inside Podman containers using podman top with various output formats and custom descriptors.

---

> podman top gives you visibility into every process running inside a container, essential for debugging and security auditing.

Understanding what processes are running inside a container is critical for debugging application issues, verifying that services started correctly, and ensuring no unexpected processes are present. The `podman top` command displays process information similar to `ps` but is scoped to a specific container. This guide covers its common capabilities.

---

## Basic Usage

View processes in a running container:

```bash
# Start a test container

podman run -d --name my-app nginx:latest

# View processes in the container
podman top my-app
```

This shows a table similar to `ps` output with USER, PID, PPID, and other columns.

## Default Output Columns

The default output includes:

```bash
# Default columns
podman top my-app
# USER    PID   PPID   %CPU   ELAPSED   TTY   TIME   COMMAND
# root    1     0      0.0    2m30s     ?     0s     nginx: master process
# nginx   29    1      0.0    2m30s     ?     0s     nginx: worker process
```

## Custom Process Descriptors

Podman supports many ps-compatible descriptors:

```bash
# Show specific columns
podman top my-app user pid ppid pcpu pmem vsz rss comm

# Show PID, command, and CPU/memory usage
podman top my-app pid pcpu pmem vsz rss args

# Show user and group information
podman top my-app user group uid gid pid comm
```

## Common Descriptor Options

```bash
# Process identity
podman top my-app pid ppid pgid sid comm
# pid   - Process ID
# ppid  - Parent process ID
# pgid  - Process group ID
# sid   - Session ID
# comm  - Command name

# Resource usage
podman top my-app pid pcpu pmem vsz rss etime comm
# pcpu  - CPU percentage
# pmem  - Memory percentage
# vsz   - Virtual memory size
# rss   - Resident set size
# etime - Elapsed time

# Full command line
podman top my-app pid args
# args  - Full command with arguments
```

## Practical Debugging Examples

### Checking if a Service Started

```bash
# Verify nginx master and worker processes are running
podman top my-app pid ppid comm args

# Look for specific processes
podman top my-app pid args | grep nginx
```

### Identifying Resource-Heavy Processes

```bash
# Show CPU and memory usage
podman top my-app pid pcpu pmem rss comm

# Check for processes consuming excessive memory
podman top my-app pid rss comm | sort -k2 -n -r
```

### Finding Zombie or Orphan Processes

```bash
# Check process states
podman top my-app pid ppid state comm

# Look for zombie processes (state = Z)
podman top my-app pid state comm | grep Z
```

### Checking Process Ownership

```bash
# View which user each process runs as
podman top my-app user uid pid comm

# Verify no processes are running as root when they should not be
podman top my-app user pid comm | grep root
```

## Comparing with exec ps

You can also use `ps` inside the container, but `podman top` has advantages:

```bash
# Using podman top (works with supported descriptors even if ps is not installed in the container)
podman top my-app

# Using exec ps (requires ps to be installed in the container)
podman exec my-app ps aux

# podman top shows host PIDs AND container PIDs
podman top my-app pid hpid comm
# pid  = PID inside the container
# hpid = PID on the host
```

## Monitoring Multiple Containers

```bash
# Check processes across all running containers
for name in $(podman ps --format '{{.Names}}'); do
    echo "=== $name ==="
    podman top "$name" pid pcpu pmem comm 2>/dev/null
    echo ""
done
```

## Security Auditing

Use `podman top` to verify container security:

```bash
# Check for unexpected processes
podman top my-app pid user comm args

# Verify process count is as expected
PROC_COUNT=$(podman top my-app pid | wc -l)
echo "Processes running: $((PROC_COUNT - 1))"  # Subtract header line

# Check for shell processes (possible unauthorized access)
podman top my-app pid comm | grep -E "bash|sh|ash" && echo "WARNING: Shell process found" || echo "OK: No shell processes"
```

## Scripting with podman top

```bash
# Count processes per container
echo "Process count by container:"
podman ps --format '{{.Names}}' | while read name; do
    count=$(podman top "$name" pid 2>/dev/null | tail -n +2 | wc -l)
    printf "  %-20s %d processes\n" "$name" "$count"
done
```

## Cleanup

```bash
podman stop my-app && podman rm my-app
```

## Summary

The `podman top` command shows running processes inside a container without requiring `ps` to be installed in the container image when using supported descriptors. Use custom descriptors to focus on specific attributes like CPU usage, memory, or user ownership. It can be more reliable than `podman exec ps` and can show both container and host PIDs, making it useful for debugging and security auditing.
