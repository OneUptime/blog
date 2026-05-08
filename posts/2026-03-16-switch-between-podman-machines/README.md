# How to Switch Between Podman Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to switch between multiple Podman machines by changing the default connection and targeting specific machines for container operations.

---

> Switching between Podman machines lets you direct container commands to the right environment without confusion.

When you have multiple Podman machines, you need a way to control which machine receives your container commands. Podman uses a connection system that determines where commands are executed. This guide covers how to switch between machines effectively.

---

## Understanding the Default Connection

The default connection is the Podman service destination that receives remote Podman commands when no specific connection is specified. For Podman machines, you can see which machine is associated with the default connection by checking the `Default` field.

```bash
# See which machine is associated with the default connection
podman machine ls --format "table {{.Name}}\t{{.VMType}}\t{{.Created}}\t{{.LastUp}}\t{{.CPUs}}\t{{.Memory}}\t{{.DiskSize}}\t{{.Default}}"
```

```text
NAME        VM TYPE     CREATED        LAST UP            CPUS    MEMORY      DISK SIZE    DEFAULT
dev         qemu        2 days ago     Currently running  2       4.295GB     107.4GB      true
staging     qemu        5 days ago     Currently running  4       8.59GB      214.7GB      false
```

## Setting the Default Connection

Use `podman system connection default` to change which machine receives commands by default.

```bash
# Set the staging machine as the default
podman system connection default staging

# Verify the change
podman system connection ls
```

Now all Podman commands will target the `staging` machine unless you specify otherwise.

```bash
# This now runs on staging
podman ps
podman images
```

## Targeting a Specific Machine

Use the `--connection` flag to send a command to a specific machine without changing the default.

```bash
# Run a command on a specific machine
podman --connection dev ps
podman --connection staging images

# Run a container on a specific machine
podman --connection dev run -d --name web nginx
podman --connection staging run -d --name api node:20
```

## Using the CONTAINER_HOST Environment Variable

You can set an environment variable to temporarily redirect all commands.

```bash
# Get the socket path for a machine and set the environment variable
export CONTAINER_HOST="unix://$(podman machine inspect dev | jq -r '.[0].ConnectionInfo.PodmanSocket.Path')"

# Or set it manually after inspecting the socket path
export CONTAINER_HOST="unix:///path/to/dev-api.sock"

# All commands now go to this machine
podman ps
podman images
```

## Listing All Available Connections

View all connections and identify which is the default:

```bash
# List connections with their details
podman system connection ls

# Show only connection names
podman system connection ls --format "{{.Name}}"
```

Output:

```text
Name        URI                                                     Identity                    Default
dev         ssh://core@localhost:54321/run/podman/podman.sock       /home/user/.ssh/podman-rsa  false
staging     ssh://core@localhost:54322/run/podman/podman.sock       /home/user/.ssh/podman-rsa  true
```

## Switching with a Shell Function

Create a shell function for quick switching:

```bash
# Add to your ~/.bashrc or ~/.zshrc
switch-podman() {
    local machine="$1"
    if [ -z "$machine" ]; then
        echo "Current connections:"
        podman system connection ls
        return
    fi

    podman system connection default "$machine"
    echo "Switched to: $machine"
    podman machine ls
}

# Usage
switch-podman staging
switch-podman dev
switch-podman           # Show current connections
```

Reload your shell configuration:

```bash
source ~/.bashrc   # or source ~/.zshrc
```

## Switching with Shell Aliases

Set up aliases for frequently used machines:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias pdev='podman --connection dev'
alias pstaging='podman --connection staging'
alias pprod='podman --connection prod'

# Usage
pdev ps           # List containers on dev
pstaging images   # List images on staging
pprod logs web    # View logs on prod
```

## Verifying the Active Machine

Always confirm which machine you are targeting before running important commands:

```bash
# Check the default connection
podman system connection ls --format "{{.Name}} {{.Default}}" | grep true

# Check machine info
podman info --format "{{.Host.Hostname}}"

# Quick check: which machine is associated with the default connection?
podman machine ls --format "{{.Name}} {{.Default}}" | grep true
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman system connection default <name>` | Set the default connection |
| `podman --connection <name> <cmd>` | Target a specific machine |
| `podman system connection ls` | List all connections |
| `podman machine ls` | List Podman machines |

## Summary

Switching between Podman machines is managed through the connection system. Use `podman system connection default` to change the default target, `--connection` for one-off commands to specific machines, and shell aliases for frequently accessed machines. Always verify your active connection before running commands that modify containers or images to avoid targeting the wrong environment.
