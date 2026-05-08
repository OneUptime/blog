# How to Start and Stop a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to manage the Podman machine lifecycle including starting, stopping, restarting, and managing multiple machines for different workloads.

---

> Managing the Podman machine lifecycle efficiently saves system resources and ensures your containers are available when you need them.

On macOS and Windows, every Podman container runs inside a lightweight Linux virtual machine. Knowing how to start, stop, restart, and manage these machines is fundamental to working with Podman on non-Linux systems. This guide covers all aspects of Podman machine lifecycle management.

---

## Prerequisites

- Podman installed on macOS or Windows
- At least one Podman machine initialized

## Checking Machine Status

Before starting or stopping, check the current state:

```bash
# List all machines and their status

podman machine list

# Example output:
# NAME                    VM TYPE     CREATED      LAST UP      CPUS  MEMORY   DISK SIZE
# podman-machine-default  qemu        2 days ago   1 hour ago   4     8.59GB   107GB

# Get detailed information about a machine
podman machine inspect
```

## Starting a Podman Machine

### Start the Default Machine

```bash
# Start the default machine
podman machine start

# Verify it is running
podman machine list
```

### Start a Named Machine

```bash
# Start a specific named machine
podman machine start dev-heavy

# Verify
podman machine list
```

### What Happens During Start

When you start a machine, Podman:

```bash
# 1. Boots the Linux VM
# 2. Sets up networking between host and VM
# 3. Starts the container runtime
# 4. Exposes the Podman API socket

# After starting, verify the connection
podman info --format '{{.Host.RemoteSocket.Path}}'

# Confirm containers can run
podman run --rm docker.io/library/alpine:latest echo "Machine is running"
```

## Stopping a Podman Machine

### Graceful Stop

```bash
# Stop the default machine gracefully
podman machine stop

# This allows containers to shut down cleanly
# and shuts down the VM
```

### Stop a Named Machine

```bash
# Stop a specific machine
podman machine stop dev-heavy
```

### Unresponsive Machine

If the machine is unresponsive, you may need to stop it and then remove and recreate it:

```bash
# Attempt to stop the machine
podman machine stop

# If you need to remove an unresponsive machine, force removal stops and deletes it
podman machine rm -f podman-machine-default
```

### What Happens During Stop

```bash
# When you stop a machine:
# 1. Running containers are stopped
# 2. The Linux VM shuts down
# 3. System resources (CPU, memory) are freed
# 4. Container data persists on disk

# Verify the machine stopped
podman machine list
```

## Restarting a Machine

There is no built-in restart command, so stop and start:

```bash
# Restart the default machine
podman machine stop && podman machine start

# Verify it came back up
podman machine list
podman run --rm docker.io/library/alpine:latest echo "Restart successful"
```

## Managing Multiple Machines

### Create Multiple Machines

```bash
# Create machines for different purposes
podman machine init --cpus 2 --memory 4096 dev-light
podman machine init --cpus 8 --memory 16384 dev-heavy
podman machine init --cpus 4 --memory 8192 testing

# List all machines
podman machine list
```

### Switch Between Machines

Only one Podman-managed machine can be running at a time:

```bash
# Start the testing machine
podman machine start testing

# When you want to switch, stop the current and start another
podman machine stop testing
podman machine start dev-heavy

# Set a machine as the default connection
podman system connection default dev-heavy
```

### Check Active Connections

```bash
# List all configured connections
podman system connection list

# See which connection is currently active
podman system connection list | grep '*'
```

## Automating Machine Management

### Start Machine on Login (macOS)

Create a Launch Agent to auto-start the Podman machine:

```bash
# Create a Launch Agent plist
mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/com.podman.machine.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.podman.machine</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/podman</string>
        <string>machine</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Load the Launch Agent
launchctl load ~/Library/LaunchAgents/com.podman.machine.plist
```

### Create a Stop Script for Sleep Automation (macOS)

```bash
# Create a script you can call from a sleep-management tool
cat > ~/podman-sleep-hook.sh <<'EOF'
#!/bin/bash
podman machine stop 2>/dev/null
EOF
chmod +x ~/podman-sleep-hook.sh
```

## Checking Container State After Start/Stop

```bash
# Start the machine
podman machine start

# Check which containers survived the restart
podman ps -a

# Containers with restart policy will auto-start
podman ps --filter "status=running"

# Manually restart containers that should be running
podman start my-web-app my-database

# Containers created with --restart=always restart automatically
podman run -d --restart=always --name persistent-nginx -p 8080:80 docker.io/library/nginx:latest
```

## Running a Practical Workflow

A typical daily workflow:

```bash
# Morning: Start the machine
podman machine start

# Check container status
podman ps -a

# Start your development containers
podman start dev-db dev-redis dev-app

# Verify everything is running
podman ps

# ... work through the day ...

# View resource usage
podman stats --no-stream

# Evening: Stop the machine to free resources
podman machine stop

# Verify it stopped
podman machine list
```

## Machine Health Checks

```bash
# Check if the machine is responsive
podman machine ssh -- echo "Machine is healthy"

# Check system resources inside the machine
podman machine ssh -- uptime
podman machine ssh -- free -h
podman machine ssh -- df -h /

# Check the container runtime status
podman info --format '{{.Host.OCIRuntime.Name}}'
```

## Troubleshooting

If the machine fails to start:

```bash
# Check for error messages
podman machine start 2>&1

# Try removing and recreating
podman machine rm
podman machine init --cpus 4 --memory 8192
podman machine start
```

If the machine hangs during stop:

```bash
# On macOS, kill the VM process
pkill -f "applehv\|qemu" 2>/dev/null

# On Windows, use Task Manager to end the podman/wsl processes
```

If containers do not restart after machine start:

```bash
# Check container restart policies
podman inspect my-container --format '{{.HostConfig.RestartPolicy.Name}}'

# Update a container to use restart=always
podman update --restart=always my-container

# Or recreate with the restart policy
podman stop my-container && podman rm my-container
podman run -d --restart=always --name my-container ...
```

If the machine starts but Podman commands timeout:

```bash
# The machine may be slow to initialize
# Wait a few seconds and retry
sleep 5
podman ps

# Or check the machine logs
podman machine ssh -- journalctl -xe --no-pager | tail -20
```

## Summary

Managing the Podman machine lifecycle is essential for non-Linux users. Start machines when you need containers, stop them to free system resources, and use multiple named machines for different workloads. Set restart policies on important containers so they automatically recover after machine restarts. For the smoothest experience, automate machine startup on login.
