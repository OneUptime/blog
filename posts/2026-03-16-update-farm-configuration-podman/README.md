# How to Update a Farm Configuration with podman farm update

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Multi-Architecture, Build Farm

Description: Learn how to use podman farm update to add or remove system connections from an existing Podman build farm configuration.

---

> The podman farm update command lets you dynamically adjust your build farm by adding or removing connections without recreating the entire farm.

As your infrastructure evolves, you need to modify build farms. New machines come online, old ones get decommissioned, or you want to adjust which architectures a farm targets. The `podman farm update` command handles this without requiring you to delete and recreate the farm. This guide covers all update operations.

---

## Adding a Connection to a Farm

Use the `--add` flag to add a new system connection to an existing farm:

```bash
# Add an arm64 builder to an existing farm

podman farm update --add arm64-builder my-farm

# Verify the change
podman farm list
```

## Removing a Connection from a Farm

Use the `--remove` flag to remove a connection:

```bash
# Remove a connection that is being decommissioned
podman farm update --remove old-amd64-builder my-farm

# Verify the removal
podman farm list
```

## Adding Multiple Connections

You can add several connections in one command:

```bash
# Add multiple connections at once (comma-separated)
podman farm update --add arm64-builder,ppc64le-builder my-farm

# Or add them one at a time
podman farm update --add s390x-builder my-farm
```

## Replacing a Connection

To swap one machine for another, remove the old and add the new:

```bash
# Replace amd64-node-1 with amd64-node-2
podman farm update --remove amd64-node-1 --add amd64-node-2 prod-farm
```

## Setting the Default Farm

You can set a farm as the default so you do not need to specify `--farm` on every build:

```bash
# Set prod-farm as the default
podman farm update --default prod-farm

# Now builds use prod-farm by default
podman farm build -t registry.example.com/team/myapp:latest .
```

## Practical Workflow: Scaling Up a Farm

```bash
#!/bin/bash
# scale-farm.sh - Add new nodes to a farm

FARM_NAME="prod-farm"
NEW_NODES=("arm64-node-3" "amd64-node-5")

for NODE in "${NEW_NODES[@]}"; do
    # First, ensure the system connection exists
    if podman system connection list --format '{{.Name}}' | grep -q "^${NODE}$"; then
        echo "Adding ${NODE} to ${FARM_NAME}..."
        podman farm update --add "${NODE}" "${FARM_NAME}"
    else
        echo "WARNING: System connection '${NODE}' does not exist. Skipping."
    fi
done

echo "Updated farm configuration:"
podman farm list
```

## Practical Workflow: Removing Unhealthy Nodes

```bash
#!/bin/bash
# remove-unhealthy.sh - Remove unreachable nodes from a farm

FARM_NAME="prod-farm"

# Get current connections
CONNECTIONS=$(podman farm list --format '{{if eq .Name "'"${FARM_NAME}"'"}}{{range .Connections}}{{.}}{{"\n"}}{{end}}{{end}}')

for CONN in ${CONNECTIONS}; do
    if ! podman --connection "${CONN}" info >/dev/null 2>&1; then
        echo "Removing unreachable node: ${CONN}"
        podman farm update --remove "${CONN}" "${FARM_NAME}"
    else
        echo "Node healthy: ${CONN}"
    fi
done

echo "Updated farm:"
podman farm list
```

## Handling Errors

```bash
# Trying to add a non-existent connection
podman farm update --add nonexistent-node my-farm
# Error: cannot add to farm, "nonexistent-node" is not a system connection

# Trying to update a non-existent farm
podman farm update --add arm64-builder nonexistent-farm
# Error: cannot update farm, "nonexistent-farm" farm doesn't exist

# Trying to remove a connection not in the farm
podman farm update --remove not-in-farm my-farm
# Error: cannot remove from farm, "not-in-farm" is not a connection in the farm
```

## Verifying Updates

Always verify your changes after updating:

```bash
# Check the farm configuration
podman farm list

# Test all connections in the updated farm
CONNECTIONS=$(podman farm list --format '{{if eq .Name "my-farm"}}{{range .Connections}}{{.}}{{"\n"}}{{end}}{{end}}')

for CONN in ${CONNECTIONS}; do
    echo -n "${CONN}: "
    podman --connection "${CONN}" info --format '{{.Host.Arch}}' 2>/dev/null || echo "UNREACHABLE"
done
```

## Summary

The `podman farm update` command modifies existing farm configurations using `--add` and `--remove` flags for connections. Use `--default` to set a farm as the default build target. Combine updates with health checks to keep your farms clean and operational. Always verify changes with `podman farm list` after making updates.
