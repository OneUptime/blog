# How to Reset a Podman Machine to Default Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to reset a Podman machine to its default settings by removing and reinitializing it, and how to back up important data before resetting.

---

> When a Podman machine becomes misconfigured, a clean reset is often the fastest path back to a working state.

Sometimes a Podman machine ends up in a broken or heavily customized state that is difficult to repair. Whether you changed too many settings, installed conflicting packages inside the VM, or encountered corruption, resetting to defaults can save significant debugging time. This guide shows you how to safely reset a Podman machine.

---

## Understanding the Reset Process

Podman does not have a dedicated `reset` command for machines. The standard approach is to remove the machine and reinitialize it with default settings. This is a clean, reliable method that gives you a fresh machine.

```bash
# The reset process in three steps

podman machine stop my-machine
podman machine rm --force my-machine
podman machine init my-machine
```

## Backing Up Before Reset

Before resetting, you should save any important data from the machine.

```bash
# List containers running on the machine to document them
podman --connection my-machine ps -a

# List images you may want to pull again
podman --connection my-machine images --format "{{.Repository}}:{{.Tag}}"

# Save the list of images to a file for reference
podman --connection my-machine images --format "{{.Repository}}:{{.Tag}}" > saved-images.txt

# Export any container filesystems with important data
podman --connection my-machine export my-container > my-container-backup.tar

# Export named volumes separately if they contain important data
podman --connection my-machine volume export my-volume --output my-volume-backup.tar
```

## Recording Current Configuration

Document the current configuration so you can selectively reapply settings you want to keep.

```bash
# Save the current machine configuration
podman machine inspect my-machine > machine-config-backup.json

# Extract key settings
podman machine inspect my-machine | jq '.[0] | {
    cpus: .Resources.CPUs,
    memory: .Resources.Memory,
    disk: .Resources.DiskSize,
    rootful: .Rootful
}'
```

## Performing the Reset

Now execute the reset by removing and reinitializing the machine.

```bash
# Stop the machine if it is running
podman machine stop my-machine

# Remove the machine completely
podman machine rm --force my-machine

# Reinitialize with default settings
podman machine init my-machine

# Start the fresh machine
podman machine start my-machine
```

The default settings for a new machine vary by platform, provider, Podman version, and any `[machine]` settings in `containers.conf`. Check the fresh machine with `podman machine inspect my-machine` or `podman machine ls`.

## Resetting the Default Machine

To reset the default machine specifically:

```bash
# Stop and remove the default machine
podman machine stop podman-machine-default
podman machine rm --force podman-machine-default

# Reinitialize the default machine
podman machine init

# Start it
podman machine start
```

When you run `podman machine init` without a name, it creates the default machine.

## Resetting with Custom Resource Allocations

If you want default settings except for specific resource allocations:

```bash
# Reset with custom CPUs and memory
podman machine stop my-machine
podman machine rm --force my-machine
podman machine init my-machine --cpus 4 --memory 4096 --disk-size 200

# Start the machine
podman machine start my-machine
```

## Resetting the Entire Podman System

For a complete reset of all Podman machines and system state:

```bash
# Remove all machines
podman machine ls --format "{{.Name}}" | while read -r machine; do
    podman machine stop "$machine" 2>/dev/null
    podman machine rm --force "$machine"
done

# Reset the Podman system configuration
podman system reset --force

# Reinitialize a fresh default machine
podman machine init
podman machine start
```

The `podman system reset` command removes all containers, images, volumes, and machine data. Use it with caution.

## Complete Reset Script

Here is a reusable script for resetting a machine:

```bash
#!/bin/bash
# Reset a Podman machine to default settings

MACHINE="${1:-podman-machine-default}"
BACKUP_DIR="./podman-backup-$(date +%Y%m%d-%H%M%S)"

echo "=== Resetting Podman Machine: $MACHINE ==="

# Check if machine exists
if ! podman machine ls --format "{{.Name}}" | grep -q "^${MACHINE}$"; then
    echo "Machine '$MACHINE' does not exist. Creating fresh machine."
    podman machine init "$MACHINE"
    podman machine start "$MACHINE"
    exit 0
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Back up configuration
echo "Backing up configuration to $BACKUP_DIR..."
podman machine inspect "$MACHINE" > "$BACKUP_DIR/machine-config.json"

# Back up image list
podman --connection "$MACHINE" images --format "{{.Repository}}:{{.Tag}}" > "$BACKUP_DIR/images.txt" 2>/dev/null

echo "Backup complete."

# Stop the machine
echo "Stopping machine..."
podman machine stop "$MACHINE" 2>/dev/null

# Remove the machine
echo "Removing machine..."
podman machine rm --force "$MACHINE"

# Reinitialize with defaults
echo "Reinitializing machine with default settings..."
podman machine init "$MACHINE"

# Start the machine
echo "Starting machine..."
podman machine start "$MACHINE"

echo ""
echo "Machine '$MACHINE' has been reset to default settings."
echo "Backup saved to: $BACKUP_DIR"
echo ""
echo "To restore previous images, run:"
echo "  cat $BACKUP_DIR/images.txt | xargs -I {} podman pull {}"
```

Save and run:

```bash
chmod +x reset-machine.sh
./reset-machine.sh my-machine
```

## Restoring Images After Reset

After resetting, you can pull back the images you had before.

```bash
# Pull images from the saved list
while read -r image; do
    podman pull "$image"
done < saved-images.txt
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine rm --force <name> && podman machine init <name>` | Reset a specific machine |
| `podman system reset --force` | Reset all Podman data |
| `podman machine inspect <name>` | Back up configuration before reset |

## Summary

Resetting a Podman machine involves removing it and creating a fresh instance. Always back up your configuration and image list before resetting so you can quickly restore your environment. For a complete system reset, use `podman system reset`, but be aware that it removes everything including images and volumes across all machines.
