# How to List All Podman Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to list all Podman machines on your system, understand the output fields, and filter results for effective machine management.

---

> Knowing what machines exist and their current state is the first step to managing your Podman environment effectively.

Podman machines are lightweight virtual machines that provide a Linux environment for running containers, especially on macOS and Windows. As you work with multiple machines for different projects or configurations, keeping track of them becomes essential. This guide covers everything you need to know about listing and understanding your Podman machines.

---

## Basic Machine Listing

The simplest way to see all your Podman machines is with the `podman machine list` command.

```bash
# List all Podman machines

podman machine list
```

This produces output similar to:

```text
NAME                     VM TYPE     CREATED        LAST UP            CPUS        MEMORY      DISK SIZE
podman-machine-default   qemu        2 days ago     Currently running  2           2.147GB     107.4GB
dev-machine              qemu        5 days ago     3 hours ago        4           4.295GB     214.7GB
test-env                 applehv     1 week ago     Yesterday          1           1.074GB     53.69GB
```

To identify the default machine, include the `Default` field in JSON or custom formatted output.

## Understanding Output Columns

Each column in the listing provides important information:

- **NAME** - The machine name.
- **VM TYPE** - The virtualization backend (qemu, applehv, hyperv, wsl).
- **CREATED** - When the machine was first initialized.
- **LAST UP** - When the machine was last running or if it is currently running.
- **CPUS** - Number of CPU cores allocated to the machine.
- **MEMORY** - Amount of RAM allocated.
- **DISK SIZE** - Virtual disk size allocated to the machine.

## Using the Short Alias

Podman provides a shorter alias for convenience.

```bash
# Short alias for listing machines
podman machine ls
```

Both `list` and `ls` produce identical output.

## Formatting Output as JSON

For scripting and automation, JSON output is far more useful than the default table format.

```bash
# Get machine list in JSON format
podman machine ls --format json
```

This returns structured data you can parse with tools like `jq`:

```bash
# Extract just the names of all machines
podman machine ls --format json | jq -r '.[].Name'

# Find machines that are currently running
podman machine ls --format json | jq -r '.[] | select(.Running == true) | .Name'

# Find the default machine
podman machine ls --format json | jq -r '.[] | select(.Default == true) | .Name'

# Get memory allocation for each machine
podman machine ls --format json | jq -r '.[] | "\(.Name): \(.Memory)"'
```

## Custom Format Strings

You can use Go template syntax to customize the output columns.

```bash
# Show only name and running status
podman machine ls --format "{{.Name}}\t{{.Running}}"

# Show name and default status
podman machine ls --format "{{.Name}}\t{{.Default}}"

# Show name, CPUs, memory, and disk size
podman machine ls --format "table {{.Name}}\t{{.CPUs}}\t{{.Memory}}\t{{.DiskSize}}"

# Show name and last up time
podman machine ls --format "{{.Name}} - Last up: {{.LastUp}}"
```

Available template fields include `Name`, `Default`, `VMType`, `Created`, `Running`, `LastUp`, `Stream`, `CPUs`, `Memory`, and `DiskSize`.

## Checking If Any Machines Exist

You can use the list command in scripts to check whether any machines have been initialized.

```bash
# Check if any machines exist
if podman machine ls --format json | jq -e 'length > 0' > /dev/null 2>&1; then
    echo "Podman machines found"
else
    echo "No Podman machines found"
fi
```

## Checking Machine Status in Scripts

Here is a practical script that checks the status of all machines:

```bash
#!/bin/bash
# List all Podman machines with their status

echo "=== Podman Machine Status ==="
echo ""

# Iterate over each machine
podman machine ls --format json | jq -r '.[] | .Name' | while read -r machine; do
    # Get running status
    running=$(podman machine ls --format json | jq -r --arg name "$machine" '.[] | select(.Name == $name) | .Running')

    if [ "$running" = "true" ]; then
        echo "[RUNNING] $machine"
    else
        echo "[STOPPED] $machine"
    fi
done
```

## Filtering the No-Header Output

When you need clean output without the header row, use the `--noheading` flag.

```bash
# List machines without table headers
podman machine ls --noheading

# Combine with format for script-friendly output
podman machine ls --noheading --format "{{.Name}}"
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine ls` | List all machines in table format |
| `podman machine ls --format json` | List machines as JSON |
| `podman machine ls --noheading` | List without header row |
| `podman machine ls --format "{{.Name}}"` | List only machine names |

## Summary

The `podman machine list` command is your primary tool for discovering and monitoring Podman machines. Use the default table output for quick visual checks, JSON output for automation, and custom format strings when you need specific fields. Combined with tools like `jq`, you can build powerful scripts to manage your Podman machine fleet.
