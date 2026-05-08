# How to Remove a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to safely remove Podman machines, clean up associated resources, and handle edge cases when deleting machines from your system.

---

> Removing unused Podman machines frees up disk space and keeps your development environment clean.

Over time, you may accumulate Podman machines that are no longer needed. Old test environments, deprecated project setups, or machines created for experimentation all consume disk space and clutter your machine list. This guide walks you through safely removing Podman machines and cleaning up after them.

---

## Removing a Machine

The `podman machine rm` command removes a Podman machine and its associated resources.

```bash
# Remove a machine by name

podman machine rm my-machine
```

Podman will prompt you for confirmation before proceeding:

```text
The following files will be deleted:

/home/user/.config/containers/podman/machine/qemu/my-machine.json
/home/user/.config/containers/podman/machine/qemu/my-machine.ign
/home/user/.local/share/containers/podman/machine/qemu/my-machine_fedora-coreos.qcow2

Are you sure you want to continue? [y/N]
```

Type `y` to confirm the removal.

## Force Removal Without Confirmation

To skip the confirmation prompt, use the `--force` flag.

```bash
# Remove a machine without asking for confirmation
podman machine rm --force my-machine
```

This is useful in automation scripts where interactive prompts are not practical.

## Removing a Running Machine

If a machine is currently running, you must stop it first or use the `--force` flag.

```bash
# This will fail if the machine is running
podman machine rm my-machine

# Stop the machine first, then remove
podman machine stop my-machine
podman machine rm my-machine

# Or force-remove a running machine in one step
podman machine rm --force my-machine
```

The `--force` flag will stop a running machine before removing it.

## Removing the Default Machine

The default machine (named `podman-machine-default`) is removed the same way.

```bash
# Remove the default machine
podman machine rm podman-machine-default

# Or omit the name to remove podman-machine-default
podman machine rm --force
```

## Removing All Machines

Podman does not have a built-in command to remove all machines at once, but you can script it.

```bash
# Remove all Podman machines
podman machine ls --format "{{.Name}}" | while read -r machine; do
    echo "Removing machine: $machine"
    podman machine rm --force "$machine"
done
```

## Verifying Removal

After removing a machine, confirm it is gone.

```bash
# List remaining machines
podman machine ls

# Check that the specific machine no longer appears
podman machine ls --format "{{.Name}}" | grep -Fxq "my-machine" && echo "Still exists" || echo "Successfully removed"
```

## Cleaning Up Residual Files

In rare cases, some files may remain after removal. You can clean these up manually.

```bash
# Check for leftover machine configuration files
ls ~/.config/containers/podman/machine/

# Check for leftover machine image files
ls ~/.local/share/containers/podman/machine/

# Remove leftover socket files if they exist
rm -f /tmp/podman-machine-*.sock
```

## Removing a Machine and Its Associated Images

Removing a machine removes that VM and its image file. If you want to prune unused container images and other resources inside the machine before deleting it, do so while the machine is still running.

```bash
# Prune unused images and other unused resources on the machine first
podman --connection my-machine system prune --all --force

# Then remove the machine itself
podman machine rm --force my-machine
```

## Script for Safe Machine Removal

Here is a complete script that safely removes a machine with proper checks:

```bash
#!/bin/bash
# Safely remove a Podman machine

MACHINE_NAME="${1:?Usage: $0 <machine-name>}"

# Check if machine exists
if ! podman machine ls --format "{{.Name}}" | grep -Fxq "$MACHINE_NAME"; then
    echo "Error: Machine '$MACHINE_NAME' does not exist"
    podman machine ls
    exit 1
fi

# Check if machine is running
running=$(podman machine ls --format json | jq -r --arg name "$MACHINE_NAME" '.[] | select(.Name == $name) | .Running')

if [ "$running" = "true" ]; then
    echo "Stopping machine '$MACHINE_NAME'..."
    podman machine stop "$MACHINE_NAME"
fi

# Remove the machine
echo "Removing machine '$MACHINE_NAME'..."
podman machine rm --force "$MACHINE_NAME"

# Verify removal
if ! podman machine ls --format "{{.Name}}" | grep -Fxq "$MACHINE_NAME"; then
    echo "Machine '$MACHINE_NAME' successfully removed"
else
    echo "Warning: Machine '$MACHINE_NAME' may not have been fully removed"
    exit 1
fi
```

Save this script and run it:

```bash
chmod +x remove-machine.sh
./remove-machine.sh my-machine
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine rm <name>` | Remove a machine with confirmation |
| `podman machine rm --force <name>` | Remove without confirmation |
| `podman machine stop <name> && podman machine rm <name>` | Stop then remove |

## Summary

Removing Podman machines is straightforward with `podman machine rm`. Always verify the machine name before removal, use `--force` for automation, and check for any residual files if you need a completely clean slate. Regular cleanup of unused machines helps keep your system tidy and recovers valuable disk space.
