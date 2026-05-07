# How to Migrate Docker Containers to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Migration, Container Management

Description: Learn how to migrate your running Docker containers, images, and configurations to Podman with minimal downtime and disruption.

---

> Migrating from Docker to Podman does not require rebuilding your images - you can move images directly, then recreate containers from their inspected configuration.

Moving from Docker to Podman is a common step for teams seeking a daemonless, rootless container runtime. The good news is that Podman uses the same OCI image format as Docker, so your images are fully compatible. This guide walks through a practical migration process for moving your Docker containers, images, and configurations to Podman.

---

## Pre-Migration Assessment

Before migrating, inventory your current Docker setup.

```bash
# List all running Docker containers

docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"

# List all containers including stopped ones
docker ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"

# List all Docker images
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# List Docker volumes
docker volume ls

# List Docker networks
docker network ls

# Export the full list for reference
docker ps -a --format json > /tmp/docker-containers.json
docker images --format json > /tmp/docker-images.json
```

## Migrating Images from Docker to Podman

The most reliable way to transfer images is through save/load or a registry.

```bash
# Method 1: Save and Load (recommended for bulk transfers)
# Save a Docker image to a tar file
docker save -o /tmp/myapp.tar myapp:latest

# Load the image into Podman
podman load -i /tmp/myapp.tar

# Verify the image is in Podman
podman images | grep myapp

# Method 2: Transfer multiple images at once
docker images --format '{{.Repository}}:{{.Tag}}' | \
  grep -v '<none>' | while read IMG; do
    echo "Saving ${IMG}..."
    docker save -o "/tmp/$(echo $IMG | tr '/:' '_').tar" "$IMG"
done

# Load all saved images into Podman
for TAR in /tmp/*.tar; do
  echo "Loading ${TAR}..."
  podman load -i "$TAR"
done
```

```bash
# Method 3: Use Skopeo to copy from Docker daemon storage
# Skopeo can read directly from the Docker daemon
skopeo copy \
  docker-daemon:myapp:latest \
  containers-storage:myapp:latest

# Bulk transfer using Skopeo
docker images --format '{{.Repository}}:{{.Tag}}' | \
  grep -v '<none>' | while read IMG; do
    echo "Copying ${IMG} to Podman..."
    skopeo copy "docker-daemon:${IMG}" "containers-storage:${IMG}"
done
```

## Migrating Container Configurations

Export your Docker container run configurations so you can recreate them in Podman.

```bash
# Inspect a Docker container to get its full configuration
docker inspect mycontainer > /tmp/mycontainer-config.json

# Extract key run parameters from the inspection
docker inspect mycontainer | jq '.[0] | {
  Image: .Config.Image,
  Cmd: .Config.Cmd,
  Env: .Config.Env,
  Ports: .NetworkSettings.Ports,
  Mounts: .Mounts,
  RestartPolicy: .HostConfig.RestartPolicy,
  Labels: .Config.Labels
}'
```

## Recreating Containers in Podman

Use the extracted configuration to create equivalent Podman containers.

```bash
#!/bin/bash
# migrate-container.sh - Recreate a Docker container in Podman

CONTAINER_NAME="myapp"

# Extract the original Docker run parameters
IMAGE=$(docker inspect "$CONTAINER_NAME" | jq -r '.[0].Config.Image')
PORTS=$(docker inspect "$CONTAINER_NAME" | \
  jq -r '.[0].HostConfig.PortBindings // {} | to_entries[] |
    "-p " + .value[0].HostPort + ":" + (.key | split("/")[0])')
ENVS=$(docker inspect "$CONTAINER_NAME" | \
  jq -r '.[0].Config.Env // [] | .[] | "-e " + .')
VOLUMES=$(docker inspect "$CONTAINER_NAME" | \
  jq -r '.[0].Mounts // [] | .[] | "-v " + .Source + ":" + .Destination')

echo "Recreating container: ${CONTAINER_NAME}"
echo "Image: ${IMAGE}"
echo "Ports: ${PORTS}"

# Stop the Docker container
docker stop "$CONTAINER_NAME"

# Create the equivalent Podman container
eval podman run -d \
  --name "${CONTAINER_NAME}" \
  $PORTS \
  $ENVS \
  $VOLUMES \
  "$IMAGE"

# Verify the container is running
podman ps | grep "$CONTAINER_NAME"
```

## Migrating Container Data

If containers have data in their writable layers, export and import them. This captures the container filesystem, but not Docker volumes or the original image metadata such as `CMD` and `ENTRYPOINT`.

```bash
# Export a running container (includes filesystem changes)
docker export -o /tmp/mycontainer-export.tar mycontainer

# Import the container filesystem as a Podman image
podman import \
  --change 'CMD ["/path/to/start-command"]' \
  /tmp/mycontainer-export.tar \
  mycontainer-migrated:latest

# Run the imported container
podman run -d --name mycontainer mycontainer-migrated:latest
```

## Batch Migration Script

Automate the migration of all Docker containers to Podman.

```bash
#!/bin/bash
# batch-migrate.sh - Migrate all Docker containers to Podman

echo "Starting batch migration from Docker to Podman..."

# Step 1: Transfer all images
echo "=== Migrating images ==="
docker images --format '{{.Repository}}:{{.Tag}}' | \
  grep -v '<none>' | while read IMG; do
    if podman image exists "$IMG" 2>/dev/null; then
      echo "SKIP (exists): ${IMG}"
    else
      echo "Transferring: ${IMG}"
      skopeo copy "docker-daemon:${IMG}" "containers-storage:${IMG}"
    fi
done

# Step 2: Stop Docker containers and recreate in Podman
echo "=== Migrating containers ==="
docker ps --format '{{.Names}}' | while read NAME; do
  echo "Migrating container: ${NAME}"

  # Get the image
  IMAGE=$(docker inspect "$NAME" | jq -r '.[0].Config.Image')

  # Stop Docker container
  docker stop "$NAME"

  # Start equivalent in Podman (basic recreation)
  podman run -d --name "$NAME" "$IMAGE"
  echo "Migrated: ${NAME}"
done

echo "Migration complete. Verify with: podman ps"
```

## Post-Migration Verification

After migration, verify everything is working correctly.

```bash
# Check all Podman containers are running
podman ps

# Compare image counts
echo "Docker images: $(docker images -q | wc -l)"
echo "Podman images: $(podman images -q | wc -l)"

# Test container connectivity
podman exec myapp curl -s localhost:8080

# Check container logs
podman logs myapp

# Verify resource usage
podman stats --no-stream
```

## Summary

Migrating Docker containers to Podman is straightforward because both tools use the same OCI image format. Transfer images using `docker save` and `podman load`, or use Skopeo for direct daemon-to-storage copies. Extract container configurations with `docker inspect` and recreate them with equivalent `podman run` commands. For large environments, script the migration to handle all containers and images in batch. After migration, verify that containers, networking, and storage are all functioning correctly before decommissioning Docker.
