# How to View Docker Container Processes with docker top

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Monitoring, Processes, DevOps, Docker CLI

Description: Learn how to inspect running processes inside Docker containers using docker top and related diagnostic commands.

---

When a container misbehaves, your first instinct might be to exec into it and run `ps`. That works, but Docker provides a faster, less invasive way to peek at running processes: the `docker top` command. It shows you what is running inside a container without entering it, and it works even when the container does not have `ps` installed.

## Basic Usage

The syntax is straightforward. Pass the container name or ID to `docker top`:

```bash
# View all processes running inside a container named "web-server"
docker top web-server
```

The output looks similar to a standard `ps` listing:

```
UID    PID    PPID   C  STIME  TTY   TIME      CMD
root   1234   1233   0  10:05  ?     00:00:01  nginx: master process
www    1250   1234   0  10:05  ?     00:00:00  nginx: worker process
www    1251   1234   0  10:05  ?     00:00:00  nginx: worker process
```

Note that the PIDs shown are from the host's perspective, not the container's. Inside the container, the main process runs as PID 1, but from the host it has a different PID. This distinction matters when you need to send signals or trace processes.

## Customizing the Output with ps Options

The `docker top` command accepts the same arguments as the Linux `ps` command. This lets you customize which columns appear and how processes are sorted.

Show processes with full command arguments and resource usage:

```bash
# Display extended process info including CPU and memory
docker top web-server -aux
```

Show only specific columns using the `-o` format option:

```bash
# Show PID, CPU percentage, memory percentage, and command
docker top web-server -o pid,pcpu,pmem,cmd
```

Sort processes by memory usage to find the hungriest process:

```bash
# Sort container processes by memory consumption (descending)
docker top web-server -o pid,pmem,cmd --sort=-pmem
```

Show the process tree to understand parent-child relationships:

```bash
# Display processes in tree format to see how they relate
docker top web-server -ef --forest
```

## docker top vs docker exec ps

You might wonder why you would use `docker top` instead of just running `ps` inside the container. There are several good reasons.

First, many minimal container images do not include `ps`. If you are running a distroless image or a scratch-based Go binary, there is no shell and no `ps` binary. `docker top` works regardless because it reads process information from the host kernel.

```bash
# This fails on minimal images that don't include ps
docker exec my-go-app ps aux
# Error: ps: not found

# This always works because it runs on the host
docker top my-go-app
```

Second, `docker exec` creates a new process inside the container, which can interfere with resource limits and process counts. `docker top` reads process data from `/proc` on the host without adding any processes to the container.

Third, security. In hardened environments, you might disable `docker exec` through authorization plugins. `docker top` gives you visibility without granting shell access.

## Practical Debugging Scenarios

### Finding Zombie Processes

Zombie processes can accumulate inside containers when child processes are not properly reaped. Check for them with:

```bash
# Look for zombie processes (state = Z) inside a container
docker top my-app -o pid,stat,cmd | grep Z
```

If you see zombies, your container's init process is not handling SIGCHLD signals correctly. Consider using the `--init` flag when starting containers:

```bash
# Use tini as init process to properly reap child processes
docker run --rm --init my-app-image
```

### Checking If a Process Is Running

Sometimes you need to verify that a specific process started inside a container. Rather than exec-ing in, use docker top with grep:

```bash
# Check if the redis-server process is running inside the container
docker top redis-container | grep redis-server
```

### Counting Worker Processes

For web servers like Nginx or Gunicorn, you often want to verify the correct number of worker processes launched:

```bash
# Count the number of Nginx worker processes
docker top web-server | grep "worker process" | wc -l
```

### Monitoring Process Startup Order

When debugging containers that run multiple processes (through a supervisor or entrypoint script), check the STIME column to see when each process started:

```bash
# View process start times to understand startup order
docker top multi-service -o pid,stime,cmd
```

## Viewing Processes Across All Containers

Docker does not have a built-in command to show processes across all running containers at once, but you can script it:

```bash
# Show processes for every running container
for container in $(docker ps -q); do
    echo "=== $(docker inspect --format='{{.Name}}' $container) ==="
    docker top $container
    echo ""
done
```

This gives you a bird's-eye view of every process running in every container on the host. It is useful for auditing what is actually running on a Docker host.

## Understanding PID Namespaces

Docker containers use Linux PID namespaces to isolate processes. Each container gets its own PID namespace where the main process is PID 1. But `docker top` shows host PIDs because it reads from the host's `/proc` filesystem.

You can see both perspectives by comparing:

```bash
# Host PID as shown by docker top
docker top my-container -o pid,cmd

# Container PID as shown from inside the container
docker exec my-container ps -o pid,cmd
```

The host PID is what you need if you want to use host-level tools like `strace`, `perf`, or `gdb` to debug a process running inside a container:

```bash
# Get the host PID of a process inside a container
HOST_PID=$(docker top my-container -o pid,cmd | grep "my-process" | awk '{print $1}')

# Now you can use strace from the host to trace system calls
sudo strace -p $HOST_PID
```

## Using docker top in Scripts and Monitoring

You can integrate `docker top` into monitoring scripts that watch for unexpected processes or detect anomalies.

Here is a simple script that alerts when an unexpected process appears in a container:

```bash
#!/bin/bash
# alert-unexpected-process.sh
# Monitor a container for unexpected processes

CONTAINER="web-server"
EXPECTED_PROCESSES="nginx|sh"

# Get current processes and check for unexpected ones
UNEXPECTED=$(docker top "$CONTAINER" -o cmd | tail -n +2 | grep -vE "$EXPECTED_PROCESSES")

if [ -n "$UNEXPECTED" ]; then
    echo "WARNING: Unexpected processes found in $CONTAINER:"
    echo "$UNEXPECTED"
    # Send alert to your monitoring system here
fi
```

## docker top with Docker Compose

When using Docker Compose, you can target specific services:

```bash
# View processes in the "web" service container
docker compose top web

# View processes for all services at once
docker compose top
```

The `docker compose top` command (with no service name) shows processes for every service defined in the compose file. This is one of the quickest ways to get a full picture of your application stack.

## Alternatives and Related Commands

While `docker top` shows you running processes, other commands give complementary information:

```bash
# View real-time resource usage (CPU, memory, network, disk I/O)
docker stats my-container

# Get the main process PID directly from container metadata
docker inspect --format='{{.State.Pid}}' my-container

# View all events related to a container (start, stop, kill, etc.)
docker events --filter container=my-container
```

## Summary

The `docker top` command is a quick, non-intrusive way to see what is running inside a container. It works on minimal images, does not add processes to the container, and accepts standard `ps` formatting options. Use it for quick checks during debugging, in monitoring scripts, or whenever you need to audit processes without entering the container. Combined with `docker stats` for resource usage and `docker inspect` for container metadata, it forms a solid foundation for container observability.
