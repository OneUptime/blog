# How to Remove a Farm with podman farm remove

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Multi-Architecture, Build Farm

Description: Learn how to use podman farm remove to delete build farm configurations, including cleanup patterns and scripting examples.

---

> Removing unused Podman farms keeps your configuration clean and prevents accidental builds against decommissioned infrastructure.

When a build farm is no longer needed, whether the machines have been decommissioned, the project has ended, or you are restructuring your build infrastructure, you should remove the farm definition. The `podman farm remove` command handles this cleanly.

---

## Basic Removal

```bash
# Remove a farm by name

podman farm remove my-farm

# Verify it was removed
podman farm list
```

The command removes only the farm definition. It does not affect the underlying system connections or any images built by the farm.

## Removing Multiple Farms

```bash
# Remove several farms at once
podman farm remove dev-farm staging-farm old-prod-farm
```

## Checking Before Removing

```bash
# Inspect the farm before removing it
podman farm list --format '{{.Name}} -> {{.Connections}}'

# Confirm the farm exists, then remove
FARM="old-farm"
if podman farm list --format '{{.Name}}' | grep -q "^${FARM}$"; then
    podman farm remove "${FARM}"
    echo "Removed farm: ${FARM}"
else
    echo "Farm '${FARM}' does not exist."
fi
```

## Handling Errors

```bash
# Trying to remove a non-existent farm
podman farm remove nonexistent-farm
# Error: farm "nonexistent-farm" does not exist

# Safe removal in scripts
podman farm remove my-farm 2>/dev/null || echo "Farm not found, skipping."
```

## Cleaning Up System Connections After Removing a Farm

Removing a farm does not remove the system connections it used. If you also want to clean up the connections:

```bash
#!/bin/bash
# cleanup-farm-and-connections.sh

FARM_NAME="decomm-farm"

# Get connections before removing the farm
CONNECTIONS=$(podman farm list --format '{{if eq .Name "'"${FARM_NAME}"'"}}{{range .Connections}}{{.}} {{end}}{{end}}')

# Remove the farm
podman farm remove "${FARM_NAME}" 2>/dev/null || {
    echo "Farm '${FARM_NAME}' not found."
    exit 0
}
echo "Removed farm: ${FARM_NAME}"

# Check if any connection is still used by another farm
ALL_FARM_CONNECTIONS=$(podman farm list --format '{{range .Connections}}{{.}}{{"\n"}}{{end}}' | sort -u)

for CONN in ${CONNECTIONS}; do
    if echo "${ALL_FARM_CONNECTIONS}" | grep -Fxq -- "${CONN}"; then
        echo "Connection '${CONN}' is used by another farm, keeping it."
    else
        echo "Removing unused connection: ${CONN}"
        podman system connection remove "${CONN}"
    fi
done
```

## Scripting Farm Lifecycle

```bash
#!/bin/bash
# farm-lifecycle.sh - Create, use, and remove a temporary farm

FARM_NAME="temp-build-farm"
IMAGE="registry.example.com/myapp"
TAG="test-$(date +%s)"

# Create a temporary farm
podman farm create "${FARM_NAME}" amd64-builder arm64-builder

# Build with the farm
podman farm build --farm "${FARM_NAME}" -t "${IMAGE}:${TAG}" .

# The farm build pushes the image instances and manifest list to the registry

# Clean up the temporary farm
podman farm remove "${FARM_NAME}"
echo "Temporary farm removed."
```

## Removing All Farms

Use the `--all` flag to remove all farms at once:

```bash
# Remove all farms
podman farm remove --all

# Verify
podman farm list
```

## What Removal Does Not Do

It is important to understand what `podman farm remove` does NOT do:

```bash
# Does NOT remove system connections
podman system connection list  # Connections still exist

# Does NOT remove images built by the farm
podman images  # Images still exist

# Does NOT stop running builds
# If a farm build is in progress, removing the farm does not cancel it

# Does NOT affect remote machines
# The remote Podman instances continue running
```

## Summary

Use `podman farm remove` to delete farm definitions you no longer need. The command only removes the farm configuration, not the underlying system connections, images, or remote Podman instances. In scripts, wrap the command with existence checks or error suppression for idempotent behavior. Clean up related system connections separately if they are no longer needed.
