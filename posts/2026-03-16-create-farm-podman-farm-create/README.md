# How to Create a Farm with podman farm create

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Multi-Architecture, Build Farm

Description: Learn how to use the podman farm create command to define build farms that group remote machines for distributed multi-architecture container builds.

---

> The podman farm create command groups your system connections into a named farm, giving you a single target for multi-architecture builds.

Podman farms let you orchestrate builds across multiple machines from a single command. The `podman farm create` command is the first step in setting this up. It takes a name and a list of system connections, creating a farm definition you can use with `podman farm build`. This guide covers all the options and patterns.

---

## Prerequisites

Before creating a farm for builds, you need at least one system connection:

```bash
# List existing system connections

podman system connection list

# If you have no connections, add them first
podman system connection add amd64-builder \
    --identity ~/.ssh/podman_farm \
    --socket-path /run/user/1000/podman/podman.sock \
    user@amd64.example.com

podman system connection add arm64-builder \
    --identity ~/.ssh/podman_farm \
    --socket-path /run/user/1000/podman/podman.sock \
    user@arm64.example.com
```

## Basic Farm Creation

```bash
# Create a farm with two connections
podman farm create my-farm amd64-builder arm64-builder

# The command produces no output on success
# Verify the farm was created
podman farm list
```

Expected output:

```text
Name       Connections                    Default     ReadWrite
my-farm    [amd64-builder arm64-builder]  false       true
```

## Creating a Farm with a Single Node

You can create a farm with just one connection and add more later:

```bash
# Start with one connection
podman farm create dev-farm amd64-builder

# Later, add another connection using podman farm update
podman farm update --add arm64-builder dev-farm
```

## Creating Multiple Farms

You might want different farms for different purposes:

```bash
# A farm for development builds (fewer architectures)
podman farm create dev-farm amd64-builder

# A farm for production builds (all architectures)
podman farm create prod-farm amd64-builder arm64-builder ppc64le-builder s390x-builder

# A farm for testing on ARM only
podman farm create arm-test-farm arm64-builder

# List all farms
podman farm list
```

## Naming Conventions

Choose descriptive names for your farms:

```bash
# By environment
podman farm create staging-farm staging-amd64 staging-arm64
podman farm create production-farm prod-amd64 prod-arm64 prod-ppc64le

# By project
podman farm create webapp-farm web-amd64 web-arm64
podman farm create database-farm db-amd64 db-arm64

# By architecture scope
podman farm create x86-only-farm amd64-node1 amd64-node2
podman farm create full-arch-farm amd64-node arm64-node ppc64le-node s390x-node
```

## Using the Farm Immediately After Creation

```bash
# Create the farm and build in one workflow
podman farm create release-farm amd64-builder arm64-builder

# Build using the new farm
podman farm build --farm release-farm \
    -t registry.example.com/myapp:latest .
```

## Scripting Farm Creation

```bash
#!/bin/bash
# setup-farm.sh - Automated farm setup

FARM_NAME="${1:-default-farm}"
CONNECTIONS=("${@:2}")

if [ ${#CONNECTIONS[@]} -eq 0 ]; then
    echo "Usage: $0 <farm-name> <connection1> [connection2] ..."
    exit 1
fi

# Check if the farm already exists
if podman farm list --format '{{.Name}}' | grep -q "^${FARM_NAME}$"; then
    echo "Farm '${FARM_NAME}' already exists. Removing and recreating."
    podman farm remove "${FARM_NAME}"
fi

# Create the farm
podman farm create "${FARM_NAME}" "${CONNECTIONS[@]}"

echo "Farm '${FARM_NAME}' created with connections: ${CONNECTIONS[*]}"

# Verify all connections are reachable
for CONN in "${CONNECTIONS[@]}"; do
    echo -n "Testing ${CONN}... "
    if podman --connection "${CONN}" info >/dev/null 2>&1; then
        echo "OK"
    else
        echo "FAILED"
    fi
done
```

## Error Handling

```bash
# Creating a farm with a non-existent connection fails
podman farm create bad-farm nonexistent-connection
# Error: nonexistent-connection is not a system connection

# Creating a farm that already exists fails
podman farm create my-farm amd64-builder
podman farm create my-farm arm64-builder
# Error: farm "my-farm" already exists

# Check before creating
if ! podman farm list --format '{{.Name}}' | grep -q "^my-farm$"; then
    podman farm create my-farm amd64-builder arm64-builder
else
    echo "Farm already exists."
fi
```

## Where Farm Configuration is Stored

Farm definitions created with Podman commands are stored in the Podman connections configuration file:

```bash
# View the farm configuration
cat ~/.config/containers/podman-connections.json

# Or set a custom path for the connections configuration
echo "$PODMAN_CONNECTIONS_CONF"
```

Podman manages this file directly. To configure farms manually, use the `[farm]` section in `containers.conf`.

## Summary

The `podman farm create` command takes a farm name and optional system connection names to define a build farm. You can create multiple farms for different environments or architecture targets. Always verify that the underlying system connections are working before using the farm for builds.
