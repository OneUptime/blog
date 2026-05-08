# How to Run a Container with Init Process in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Init Process, Process Management

Description: Learn how to use an init process in Podman containers to properly handle signals, reap zombie processes, and ensure clean shutdowns.

---

> An init process inside your container ensures that zombie processes are reaped and signals are properly forwarded, preventing resource leaks.

In a traditional Linux system, PID 1 is the init process (systemd, sysvinit, etc.) that reaps orphaned zombie processes and handles signal forwarding. Inside a container, your application typically runs as PID 1, but most applications are not designed to handle these init responsibilities. This can lead to zombie process accumulation and improper shutdown behavior.

Podman's `--init` flag solves this by running a lightweight init process as PID 1, which then manages your application as a child process.

---

## The Problem: Zombie Processes

Without an init process, orphaned child processes become zombies:

```bash
# Demonstrate zombie process problem (without init)

podman run --rm alpine sh -c "
  # Spawn a child process that creates an orphan
  sh -c 'sleep 1 &' &
  sleep 3
  echo 'Process list without init:'
  ps aux
"
```

## Using the --init Flag

The `--init` flag injects a lightweight init process, typically catatonit, as PID 1:

```bash
# Run a container with an init process
podman run --rm --init alpine sh -c "
  echo 'Process tree with init:'
  ps aux
  echo ''
  echo 'PID 1 is the init process, not our shell'
"

# Compare with a container without init
podman run --rm alpine sh -c "
  echo 'Process tree without init:'
  ps aux
  echo ''
  echo 'PID 1 is our shell directly'
"
```

## How Init Helps with Signal Handling

The init process properly forwards signals to child processes:

```bash
# Without init: SIGTERM is delivered to PID 1, so the application must handle it itself
podman run -d --name no-init alpine sh -c "
  trap 'echo SIGTERM received; exit 0' TERM
  echo 'Running without init...'
  while true; do sleep 1; done
"

# With init: SIGTERM is forwarded by the init process to the application
podman run -d --name with-init --init alpine sh -c "
  trap 'echo SIGTERM received; exit 0' TERM
  echo 'Running with init...'
  while true; do sleep 1; done
"

# Stop both and check logs
podman stop --time 5 no-init 2>/dev/null
podman stop --time 5 with-init

podman logs no-init 2>&1 | tail -3
echo "---"
podman logs with-init 2>&1 | tail -3

podman rm no-init with-init
```

## Init with Long-Running Services

```bash
# Run a web server with init for proper process management
podman run -d --name web-with-init \
  --init \
  -p 8080:80 \
  nginx:latest

# Check the process tree
podman exec web-with-init ps aux

# The init process is PID 1 and nginx is a child process
# This ensures proper signal handling when stopping the container
podman stop web-with-init && podman rm web-with-init
```

## Init with Multi-Process Containers

Init is especially important when running multiple processes:

```bash
# Multi-process container with init
podman run -d --name multi-proc --init alpine sh -c "
  # Start multiple background processes
  sleep 1000 &
  sleep 1000 &
  sleep 1000 &

  echo 'Started background processes'

  # The init process will reap any zombies from these
  while true; do sleep 10; done
"

# Check the process tree
podman exec multi-proc ps aux

# All processes are properly managed under init
podman stop multi-proc && podman rm multi-proc
```

## Custom Init Binary

You can specify a custom init binary with `--init-path`:

```bash
# Use a custom init binary (if you have one)
# podman run --init --init-path /path/to/custom-init alpine sh

# Check what init binary Podman uses by default
# The default init binary is usually catatonit, and Podman mounts it
# inside the container at /run/podman-init when --init is used
```

## Init with Shell Scripts

When running shell scripts as the container command, init prevents common issues:

```bash
# Create a script that spawns children
cat > /tmp/app.sh << 'SCRIPT'
#!/bin/sh

cleanup() {
    echo "Cleaning up..."
    kill $WORKER_PID 2>/dev/null
    exit 0
}

trap cleanup TERM INT

echo "Starting application..."

# Background worker
while true; do
    echo "Worker tick $(date)"
    sleep 5
done &
WORKER_PID=$!

# Wait for signal
wait $WORKER_PID
SCRIPT

chmod +x /tmp/app.sh

# Run with init for proper signal handling
podman run -d --name scripted-app \
  --init \
  -v /tmp/app.sh:/app.sh:Z \
  alpine /app.sh

# Verify it runs
sleep 2
podman logs scripted-app

# Clean stop with init properly forwarding SIGTERM
podman stop scripted-app && podman rm scripted-app
```

## When to Use Init

Use `--init` when:

```bash
# 1. Your application is not designed to run as PID 1
podman run -d --init --name app1 python:3.12-slim python3 -c "
import time
while True:
    time.sleep(1)
"

# 2. You run shell scripts that spawn child processes
podman run -d --init --name app2 alpine sh -c "
  sleep 1000 &
  sleep 1000 &
  wait
"

# 3. You need reliable signal handling for graceful shutdown
podman run -d --init --name app3 node:20-slim node -e "
process.on('SIGTERM', () => { console.log('Graceful shutdown'); process.exit(0); });
setInterval(() => {}, 1000);
"

# Clean up
podman stop app1 app2 app3 2>/dev/null
podman rm app1 app2 app3 2>/dev/null
```

## When Init Is Not Needed

Some applications handle PID 1 responsibilities themselves:

```bash
# Applications with built-in process management (like nginx or systemd-based images)
# These handle their child processes and shutdown signals internally
podman run -d --name nginx-no-init nginx:latest

# Containers with a single process and no children
podman run -d --name simple alpine sleep infinity

podman stop nginx-no-init simple 2>/dev/null
podman rm nginx-no-init simple 2>/dev/null
```

## Verifying Init Is Active

```bash
# Check if init is configured
podman run -d --init --name check-init alpine sleep infinity

podman inspect check-init --format '{{.HostConfig.Init}}'
# Output: true

# Check PID 1 inside the container
podman exec check-init cat /proc/1/cmdline | tr '\0' ' '
# Should show the init binary, not your command

podman stop check-init && podman rm check-init
```

## Summary

The `--init` flag in Podman adds a proper init process as PID 1 inside your container:

- Reaps zombie processes automatically
- Forwards signals (SIGTERM, SIGINT) to child processes
- Ensures clean container shutdown
- Essential for multi-process containers and shell scripts
- Minimal overhead (the init binary is tiny)
- Use `--init` unless your application is specifically designed to run as PID 1

Adding `--init` is a simple best practice that prevents subtle process management issues in production containers.
