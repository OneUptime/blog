# How to Create a Named Volume with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Storage

Description: Learn how to create and use named volumes in Podman for persistent container data storage that survives container restarts and removals.

---

> Named volumes provide persistent storage managed by Podman, keeping your data safe even when containers are removed and recreated.

Containers are ephemeral by design. When a container is removed, its writable layer disappears along with any data stored inside it. Named volumes solve this by providing persistent storage that exists independently of any container. This guide shows you how to create and use them with Podman.

---

## Creating a Named Volume

```bash
# Create a named volume

podman volume create mydata

# The command outputs the volume name
# mydata
```

That is all it takes. Podman creates a volume in its default storage location.

## Verifying the Volume Was Created

```bash
# List all volumes
podman volume ls

# Example output:
# DRIVER    VOLUME NAME
# local     mydata

# Get detailed information
podman volume inspect mydata
```

## Using a Named Volume with a Container

Mount the volume into a container using the `-v` flag:

```bash
# Run a container with the named volume mounted at /data
podman run -d --name myapp \
    -v mydata:/data \
    alpine:latest \
    sh -c "echo 'Hello from container' > /data/test.txt && sleep 3600"

# Verify the data was written
podman exec myapp cat /data/test.txt
# Output: Hello from container
```

## Data Persists Across Container Restarts

```bash
# Stop and remove the container
podman stop myapp
podman rm myapp

# Create a new container with the same volume
podman run --rm \
    -v mydata:/data \
    alpine:latest \
    cat /data/test.txt
# Output: Hello from container
# The data persisted even after the original container was removed
```

## Creating Volumes with Labels

Labels help you organize and identify volumes:

```bash
# Create a volume with labels
podman volume create --label project=webapp --label env=production appdata

# Filter volumes by label
podman volume ls --filter label=project=webapp

# Inspect labels
podman volume inspect appdata --format '{{.Labels}}'
```

## Creating Volumes with Specific Options

```bash
# Create a volume with specific driver options
# These local driver mount options require root privileges
podman volume create --opt type=tmpfs --opt device=tmpfs --opt o=size=100m tmpvol

# Create a volume backed by a specific directory
podman volume create --opt type=none --opt device=/srv/data --opt o=bind srvdata
```

## Using Volumes Inline (Auto-Creation)

Podman automatically creates a volume if it does not exist when you reference it:

```bash
# This creates the volume 'newdata' automatically if it does not exist
podman run --rm \
    -v newdata:/app/data \
    alpine:latest \
    sh -c "echo 'auto-created' > /app/data/status.txt"

# Verify the volume was created
podman volume ls | grep newdata
```

## Practical Example: Database Storage

```bash
# Create a volume for PostgreSQL data
podman volume create pgdata

# Run PostgreSQL with persistent storage
podman run -d --name postgres \
    -v pgdata:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -p 5432:5432 \
    postgres:16

# The database files persist in the 'pgdata' volume
# Even if the container is recreated, data remains

# Stop and recreate - data is preserved
podman stop postgres && podman rm postgres
podman run -d --name postgres \
    -v pgdata:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -p 5432:5432 \
    postgres:16
```

## Where Volumes Are Stored

```bash
# Find the mount point of a volume
podman volume inspect mydata --format '{{.Mountpoint}}'
# Typical output: /home/user/.local/share/containers/storage/volumes/mydata/_data

# For rootful Podman:
# /var/lib/containers/storage/volumes/mydata/_data
```

## Creating Volumes in Scripts

```bash
#!/bin/bash
# setup-volumes.sh - Create required volumes for an application

VOLUMES=("app-data" "app-logs" "app-config" "app-cache")

for VOL in "${VOLUMES[@]}"; do
    if podman volume exists "${VOL}" 2>/dev/null; then
        echo "Volume '${VOL}' already exists."
    else
        podman volume create "${VOL}"
        echo "Created volume: ${VOL}"
    fi
done

echo ""
echo "All volumes:"
podman volume ls
```

## Summary

Named volumes in Podman provide persistent storage that outlives containers. Create them with `podman volume create`, mount them with `-v volumename:/path`, and they automatically preserve data across container restarts and removals. Use labels for organization and `podman volume inspect` to check storage details.
