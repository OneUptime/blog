# How to Rename a Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to rename containers in Podman to improve organization, fix naming mistakes, and manage container identification.

---

> Renaming containers helps you maintain clear, descriptive names as your container environment evolves.

Container names serve as human-readable identifiers that make management easier than using container IDs. The `podman rename` command lets you change a container's name without stopping or recreating it, though running containers may not fully reflect the new name until they are restarted. This guide covers how to rename containers and best practices for container naming.

---

## Basic Container Rename

```bash
# Create a container with a generic name

podman run -d --name old-name docker.io/library/nginx:latest

# Rename it
podman rename old-name new-name

# Verify the rename
podman ps --format "{{.Names}}"
```

## Renaming a Stopped Container

Rename works on containers in any state.

```bash
# Create and stop a container
podman run --name temp-container docker.io/library/alpine:latest echo "done"

# Rename the stopped container
podman rename temp-container processed-container

# Verify
podman ps -a --filter name=processed-container --format "{{.Names}} {{.Status}}"

# Clean up
podman rm processed-container
```

## Renaming by Container ID

You can use the container ID instead of the name.

```bash
# Create a container and capture its ID
CONTAINER_ID=$(podman run -d docker.io/library/alpine:latest sleep 300)

# Rename using the ID
podman rename "$CONTAINER_ID" my-worker

# Verify
podman ps --format "{{.ID}}\t{{.Names}}"

# Clean up
podman rm -f my-worker
```

## Fixing Naming Mistakes

A common use case is correcting typos or standardizing naming conventions.

```bash
# Oops, typo in the name
podman run -d --name ngixn-server docker.io/library/nginx:latest

# Fix the typo
podman rename ngixn-server nginx-server

# Verify
podman ps --filter name=nginx-server

# Clean up
podman rm -f nginx-server
```

## Renaming for Environment Promotion

Rename containers as they move through stages.

```bash
# Container initially for testing
podman run -d --name webapp-staging -p 8080:80 docker.io/library/nginx:latest

# After testing, rename for production
podman rename webapp-staging webapp-production

# Verify
podman ps --format "{{.Names}}\t{{.Ports}}"

# Clean up
podman rm -f webapp-production
```

## Renaming Constraints

There are a few rules to keep in mind.

```bash
# Names must be unique - this will fail if "existing-name" is taken
podman run -d --name existing-name docker.io/library/alpine:latest sleep 300
podman run -d --name to-rename docker.io/library/alpine:latest sleep 300

# This will fail because "existing-name" is already in use
podman rename to-rename existing-name 2>&1 || echo "Error: Name already in use"

# Clean up
podman rm -f existing-name to-rename
```

## Batch Renaming with Scripts

```bash
#!/bin/bash
# rename-prefix.sh - Add a prefix to all container names

PREFIX="prod"

for name in $(podman ps --format "{{.Names}}"); do
  # Skip if already prefixed
  if [[ ! "$name" == "${PREFIX}-"* ]]; then
    NEW_NAME="${PREFIX}-${name}"
    podman rename "$name" "$NEW_NAME"
    echo "Renamed: $name -> $NEW_NAME"
  fi
done
```

## Renaming with Pattern Replacement

```bash
#!/bin/bash
# rename-pattern.sh - Replace a pattern in container names

OLD_PATTERN="staging"
NEW_PATTERN="production"

for name in $(podman ps -a --format "{{.Names}}"); do
  if [[ "$name" == *"$OLD_PATTERN"* ]]; then
    NEW_NAME="${name/$OLD_PATTERN/$NEW_PATTERN}"
    podman rename "$name" "$NEW_NAME"
    echo "Renamed: $name -> $NEW_NAME"
  fi
done
```

## Naming Conventions

Follow consistent naming patterns for easier management.

```bash
# Convention: <project>-<service>-<instance>
podman run -d --name myapp-web-1 docker.io/library/nginx:latest
podman run -d --name myapp-web-2 docker.io/library/nginx:latest
podman run -d --name myapp-db-1 -e POSTGRES_PASSWORD=example docker.io/library/postgres:16

# Convention: <environment>-<service>
podman run -d --name dev-api docker.io/library/alpine:latest sleep 300
podman run -d --name dev-worker docker.io/library/alpine:latest sleep 300

# List all with organized names
podman ps --format "{{.Names}}" --sort names
```

## Verifying a Rename

```bash
# Check container details after rename
podman inspect my-container --format '{{.Name}}'

# Confirm old name no longer exists
podman ps -a --filter name=old-name --format "{{.Names}}" | grep -q old-name && \
  echo "Old name still exists" || echo "Old name successfully removed"
```

## Summary

The `podman rename` command lets you change container names without stopping or recreating the container. Use it to fix naming mistakes, standardize naming conventions, and organize your container environment. Names must be unique across all containers, and renaming works on both running and stopped containers.
