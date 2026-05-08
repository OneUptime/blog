# How to Detach from a Container Without Stopping It in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Attach, Detach Keys

Description: Learn how to safely detach from an attached Podman container without stopping its main process using the detach key sequence.

---

> Knowing how to detach without stopping is essential to avoid accidentally killing your container's main process.

When you attach to a running container, pressing Ctrl+C sends a signal that can stop the container's main process. To safely disconnect your terminal while leaving the container running, you need to use the proper detach key sequence. This guide covers all the ways to detach safely.

---

## The Default Detach Key Sequence

Podman uses `Ctrl+P, Ctrl+Q` as the default detach key sequence:

```bash
# Start and attach to a container

podman run -dit --name my-app alpine /bin/sh
podman attach my-app

# To detach without stopping:
# Press Ctrl+P, then Ctrl+Q (in sequence, not simultaneously)
# You will see: "Read escape sequence"
# The container continues running
```

After detaching, verify the container is still running:

```bash
podman ps --filter name=my-app
# Should show the container with "Up" status
```

## Why Ctrl+C Is Dangerous

Understanding why you should not use Ctrl+C when attached:

```bash
# Start a container with a simple process
podman run -d --name logger alpine /bin/sh -c "while true; do date; sleep 1; done"

# Attach to it
podman attach logger
# You see dates printing...

# If you press Ctrl+C here, it sends SIGINT to the main process
# The process terminates and the container stops!

# Instead, use Ctrl+P, Ctrl+Q to safely detach
```

## Using --sig-proxy=false

An alternative approach is to disable signal proxying when attaching:

```bash
# Start a container
podman run -d --name my-server nginx:latest

# Attach with signal proxy disabled
podman attach --sig-proxy=false my-server

# Now Ctrl+C exits the attach session WITHOUT stopping the container
# This is because SIGINT is not forwarded to the container process
```

This is simpler to remember than the detach key sequence, but it also means proxied signals are not forwarded to the container process while attached.

## Custom Detach Keys

You can specify custom detach keys when attaching:

```bash
# Use Ctrl+X as the detach key
podman attach --detach-keys="ctrl-x" my-server

# Use Ctrl+A, Ctrl+D as the sequence
podman attach --detach-keys="ctrl-a,ctrl-d" my-server

# Use Ctrl+Q as the detach key
podman attach --detach-keys="ctrl-q" my-server
```

## Detaching from podman run

When you start a container with `podman run` in interactive mode, the same detach keys work:

```bash
# Start an interactive container
podman run -it --name temp-shell alpine /bin/sh

# Inside the shell, press Ctrl+P then Ctrl+Q to detach
# The container keeps running in the background

# Verify it is still running
podman ps --filter name=temp-shell

# Reattach when needed
podman attach temp-shell
```

## Practical Workflow

Here is a typical workflow using attach and detach:

```bash
# Step 1: Start a long-running container
podman run -dit --name dev-env ubuntu:latest /bin/bash

# Step 2: Attach and do some work
podman attach dev-env
# root@container:/# apt-get update
# root@container:/# apt-get install -y python3
# Press Ctrl+P, Ctrl+Q to detach

# Step 3: Container is still running
podman ps --filter name=dev-env

# Step 4: Reattach later to continue work
podman attach dev-env
# root@container:/# python3 --version
# Press Ctrl+P, Ctrl+Q to detach again

# Step 5: Container is still running with all your changes
podman ps --filter name=dev-env
```

## Troubleshooting

### Detach Keys Not Working

If the detach sequence does not work, it could be because your terminal is intercepting the key combination:

```bash
# Check if your terminal uses Ctrl+P for something else
# (e.g., some terminals use it for "print")

# Try a different detach key
podman attach --detach-keys="ctrl-_" my-server

# Or use --sig-proxy=false and Ctrl+C
podman attach --sig-proxy=false my-server
```

### Verifying Container State After Detach

```bash
# Check the container is still running
podman ps --filter name=my-app --format "{{.Names}}: {{.Status}}"

# Check the main process is still alive
podman top my-app
```

## Cleanup

```bash
podman stop my-app logger my-server temp-shell dev-env 2>/dev/null
podman rm my-app logger my-server temp-shell dev-env 2>/dev/null
```

## Summary

Always use `Ctrl+P, Ctrl+Q` to detach from an attached container without stopping it. Alternatively, attach with `--sig-proxy=false` to make Ctrl+C safe. You can customize the detach keys with `--detach-keys` for convenience. The key point is to never press Ctrl+C on an attached container with signal proxying enabled, as it will terminate the main process.
