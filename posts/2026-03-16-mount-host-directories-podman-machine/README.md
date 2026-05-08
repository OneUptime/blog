# How to Mount Host Directories into a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, Volume Mounts

Description: Learn how to mount host directories into a Podman machine so containers can access and modify files on your local filesystem.

---

> Mounting host directories into a Podman machine bridges the gap between your local filesystem and containerized workloads.

On macOS and Windows, Podman runs inside a virtual machine. This means containers do not have direct access to your host filesystem. To share files between your host and containers, you need to configure directory mounts that pass through the VM layer. This guide covers all the methods for mounting host directories.

---

## Default Mounts

Podman machines come with certain host directories mounted by default. The exact default mounts depend on your platform and Podman version.

```bash
# Check current mounts on a machine

podman machine inspect my-machine

# Default volume mounts are defined in containers.conf
# Unless changed, the default volume mount is $HOME:$HOME
```

## Creating a Machine with Custom Mounts

Specify mounts during machine initialization using the `--volume` flag.

```bash
# Mount a specific directory
podman machine init my-machine --volume /Users/dev/projects:/projects

# Mount with read-only access
podman machine init my-machine --volume /Users/dev/data:/data:ro

# Mount multiple directories
podman machine init my-machine \
    --volume /Users/dev/projects:/projects \
    --volume /Users/dev/configs:/configs:ro
```

## Adding Mounts to an Existing Machine

To add a mount to an existing machine, remove it and reinitialize with the desired volumes:

```bash
# Stop and remove the machine
podman machine stop my-machine
podman machine rm my-machine

# Reinitialize with the new volume mount
podman machine init my-machine --volume /Users/dev/projects:/projects

# Start the machine
podman machine start my-machine
```

Note: The `podman machine set` command does not support adding volume mounts. To change mounts, you must recreate the machine with `podman machine init`.

## Verifying Mounts Inside the Machine

Check that the mount is accessible inside the VM:

```bash
# SSH into the machine and list the mount
podman machine ssh my-machine -- ls -la /projects

# Check mounted filesystems
podman machine ssh my-machine -- mount | grep -E 'virtiofs|9p'
```

## Using Mounted Directories in Containers

Once a directory is mounted into the machine, you can bind-mount it into containers:

```bash
# Mount a project directory into a container
podman run -it --rm \
    -v /projects/myapp:/app \
    -w /app \
    node:20 bash

# Inside the container:
# ls /app    - shows your project files
# npm install - writes to your host filesystem

# Mount with read-only access in the container
podman run -it --rm \
    -v /configs:/etc/myapp:ro \
    myapp:latest
```

## Development Workflow with Mounts

A common pattern is mounting source code for live development:

```bash
# Run a development server with live code reloading
podman run -d --name dev-server \
    -v /projects/webapp:/app \
    -w /app \
    -p 3000:3000 \
    node:20 npm run dev

# Changes to files in /Users/dev/projects/webapp on your host
# are immediately visible inside the container

# View logs to confirm hot reloading works
podman logs -f dev-server
```

## Mount Performance Considerations

Directory mounts through a VM have performance implications:

```bash
# VirtioFS (default on macOS with Apple Virtualization Framework)
# provides the best performance

# Check which VM type is used
podman machine ls --format 'table {{.Name}}\t{{.VMType}}'

# For best performance on macOS, ensure you are using applehv
# which uses VirtioFS for file sharing
```

For projects with many small files (like `node_modules`), consider keeping those inside the container:

```bash
# Use a named volume for node_modules to avoid slow host mounts
podman run -d --name dev \
    -v /projects/myapp:/app \
    -v node_modules:/app/node_modules \
    -w /app \
    -p 3000:3000 \
    node:20 sh -c "npm install && npm run dev"
```

## Mounting with Specific Permissions

Control how mounted directories behave with permission options:

```bash
# Read-write mount (default)
podman run -v /data:/data:rw myimage

# Read-only mount
podman run -v /configs:/configs:ro myimage

# Mount with SELinux labels (on Linux systems)
podman run -v /data:/data:Z myimage    # Private label
podman run -v /data:/data:z myimage    # Shared label
```

## Removing Mounts

To remove a volume mount from a machine, recreate it without the mount:

```bash
# Stop and remove the machine
podman machine stop my-machine
podman machine rm my-machine

# Reinitialize without the volume mount you want to remove
podman machine init my-machine

# Start the machine
podman machine start my-machine
```

## Troubleshooting Mount Issues

```bash
# Issue: Files not visible inside the container
# Check if the path is mounted in the machine first
podman machine ssh my-machine -- ls -la /projects

# Issue: Permission denied when writing
# Check mount options
podman machine inspect my-machine

# Issue: Slow file access
# Consider using named volumes for dependency directories
podman volume create deps
podman run -v deps:/app/node_modules myimage

# Issue: File changes not detected by watchers
# Some file watchers need polling mode for mounted volumes
podman run -e CHOKIDAR_USEPOLLING=true -v /projects/app:/app node:20 npm run dev
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine init --volume /host:/guest <name>` | Create machine with mount |
| `podman machine rm <name> && podman machine init --volume ... <name>` | Change mounts on existing machine |
| `podman run -v /machine-path:/container ...` | Mount into a container |

## Summary

Mounting host directories into a Podman machine is essential for development workflows on macOS and Windows. Use the `--volume` flag during `podman machine init` to configure mounts. To change mounts on an existing machine, remove and reinitialize it. For best performance, use VirtioFS through the Apple Virtualization Framework and keep large dependency trees in named volumes rather than host mounts. Always verify mounts are accessible inside the machine before attempting to use them in containers.
