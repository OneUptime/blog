# How to Inspect a Podman Machine Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to inspect and examine Podman machine configurations including resource allocations, network settings, and runtime parameters.

---

> Understanding your machine configuration is essential for debugging issues and optimizing resource allocation.

Podman machines are virtual machines with specific resource allocations, networking configurations, and runtime settings. Inspecting these details helps you understand how your machine is configured, troubleshoot problems, and plan resource adjustments. This guide covers every method for examining your Podman machine configuration.

---

## Basic Machine Inspection

The `podman machine inspect` command provides detailed configuration information about a machine.

```bash
# Inspect the default machine

podman machine inspect

# Inspect a specific machine by name
podman machine inspect my-machine
```

This returns a JSON array with the full machine configuration:

```json
[
    {
        "ConfigDir": {
            "Path": "/home/user/.config/containers/podman/machine/qemu"
        },
        "ConnectionInfo": {
            "PodmanSocket": {
                "Path": "/run/user/1000/podman/podman.sock"
            },
            "PodmanPipe": null
        },
        "Created": "2026-03-10T14:30:00Z",
        "LastUp": "2026-03-16T09:00:00Z",
        "Name": "my-machine",
        "Resources": {
            "CPUs": 2,
            "DiskSize": 100,
            "Memory": 2048
        },
        "State": "running",
        "UserModeNetworking": false,
        "Rootful": false
    }
]
```

## Extracting Specific Fields

Use `jq` to extract specific configuration values from the inspection output.

```bash
# Get the number of CPUs allocated
podman machine inspect my-machine | jq '.[0].Resources.CPUs'

# Get memory allocation in MiB
podman machine inspect my-machine | jq '.[0].Resources.Memory'

# Get disk size in GiB
podman machine inspect my-machine | jq '.[0].Resources.DiskSize'

# Check if the machine is running in rootful mode
podman machine inspect my-machine | jq '.[0].Rootful'

# Get the machine state
podman machine inspect my-machine | jq -r '.[0].State'
```

## Inspecting Multiple Machines

You can inspect multiple machines in a single command.

```bash
# Inspect two machines at once
podman machine inspect machine-a machine-b

# Compare CPUs across multiple machines
podman machine inspect machine-a machine-b | jq '.[].Resources.CPUs'
```

When inspecting one or multiple machines, the output is a JSON array.

## Checking Resource Allocations

Understanding resource allocations helps you tune machine performance.

```bash
# Get a summary of resource allocations
podman machine inspect my-machine | jq '{
    name: .[0].Name,
    cpus: .[0].Resources.CPUs,
    memory_mib: .[0].Resources.Memory,
    disk_gib: .[0].Resources.DiskSize
}'

# Check all machines resource usage
podman machine ls --format json | jq -r '.[] | .Name' | while read -r machine; do
    echo "=== $machine ==="
    podman machine inspect "$machine" | jq '.[0] | {cpus: .Resources.CPUs, memory_mib: .Resources.Memory, disk_gib: .Resources.DiskSize}'
done
```

## Checking Connection Information

The socket path and connection details are critical for remote Podman connections.

```bash
# Get the Podman socket path
podman machine inspect my-machine | jq -r '.[0].ConnectionInfo.PodmanSocket.Path'

# Get the SSH connection details
podman machine inspect my-machine | jq '.[0].SSHConfig'
```

## Viewing the Machine Configuration File Directly

You can also examine the raw configuration file on disk.

```bash
# Find the configuration directory
podman machine inspect my-machine | jq -r '.[0].ConfigDir.Path'

# List configuration files for the machine (macOS)
ls ~/.config/containers/podman/machine/

# List configuration files for the machine (Linux)
ls ~/.config/containers/podman/machine/
```

## Checking Networking Configuration

Network settings affect how containers communicate with the host and external networks.

```bash
# Check if user mode networking is enabled
podman machine inspect my-machine | jq '.[0].UserModeNetworking'

# Get all network-related configuration
podman machine inspect my-machine | jq '.[0] | {
    user_mode_networking: .UserModeNetworking,
    connection: .ConnectionInfo
}'
```

## Checking Mount Configurations

Volume mounts allow the machine to access host directories.

```bash
# Check configured mounts
podman machine inspect my-machine | jq '.[0].Mounts'

# List mount source and target paths
podman machine inspect my-machine | jq -r '.[0].Mounts[]? | "\(.Source) -> \(.Target)"'
```

## Monitoring Script

Here is a script that provides a comprehensive overview of a machine:

```bash
#!/bin/bash
# Display a comprehensive Podman machine configuration report

MACHINE="${1:-podman-machine-default}"

echo "=== Podman Machine Configuration Report ==="
echo "Machine: $MACHINE"
echo ""

# Get full inspection data
data=$(podman machine inspect "$MACHINE" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Could not inspect machine '$MACHINE'"
    exit 1
fi

echo "State:    $(echo "$data" | jq -r '.[0].State')"
echo "Created:  $(echo "$data" | jq -r '.[0].Created')"
echo "Last Up:  $(echo "$data" | jq -r '.[0].LastUp')"
echo ""
echo "--- Resources ---"
echo "CPUs:     $(echo "$data" | jq '.[0].Resources.CPUs')"
echo "Memory:   $(echo "$data" | jq '.[0].Resources.Memory') MiB"
echo "Disk:     $(echo "$data" | jq '.[0].Resources.DiskSize') GiB"
echo ""
echo "--- Configuration ---"
echo "Rootful:  $(echo "$data" | jq '.[0].Rootful')"
echo "User Net: $(echo "$data" | jq '.[0].UserModeNetworking')"
echo ""
echo "--- Connection ---"
echo "Socket:   $(echo "$data" | jq -r '.[0].ConnectionInfo.PodmanSocket.Path')"
```

Run the script:

```bash
chmod +x inspect-machine.sh
./inspect-machine.sh my-machine
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine inspect` | Inspect the default machine |
| `podman machine inspect <name>` | Inspect a specific machine |
| `podman machine inspect <name> \| jq '.[0].Resources'` | View resource allocations |
| `podman machine inspect <name> \| jq '.[0].State'` | Check machine state |

## Summary

The `podman machine inspect` command gives you full visibility into how a Podman machine is configured. Use it to check resource allocations, verify networking settings, find socket paths, and debug configuration issues. Combined with `jq`, you can extract exactly the information you need for monitoring and automation.
