# How to Migrate Docker Containers from One Server to Another

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, migration, server migration, containers, volumes, docker save, docker load

Description: Migrate Docker containers, images, and volumes from one server to another with minimal downtime using practical step-by-step procedures.

---

Migrating Docker containers between servers comes up more often than you might expect. Hardware upgrades, data center changes, cloud provider switches, or simply moving from a staging server to production. The good news is that Docker's design makes containers portable. The challenge is doing it cleanly, without losing data or accumulating excessive downtime.

This guide covers the complete process: migrating images, container configurations, volumes, and networks from one server to another.

## Migration Planning

Before touching any containers, plan the migration:

1. **Inventory running containers** - Know what you are moving
2. **Identify data volumes** - These contain your persistent data
3. **Document networks** - Custom networks need recreation
4. **Estimate downtime** - Some downtime is usually unavoidable for stateful containers
5. **Test the process** - Always do a dry run

Start with an inventory:

```bash
# Generate a complete inventory of the source server
echo "=== Docker Migration Inventory ==="
echo "Source server: $(hostname)"
echo "Date: $(date)"
echo ""

echo "--- Running Containers ---"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"

echo ""
echo "--- All Containers ---"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "--- Volumes ---"
docker volume ls

echo ""
echo "--- Networks ---"
docker network ls --filter type=custom

echo ""
echo "--- Images ---"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## Method 1: Docker Save and Load (Images)

The simplest migration method transfers images as tar archives.

```bash
# On the source server: save images to tar files

# Save a single image
docker save myapp:latest > myapp.tar

# Save multiple images into one archive
docker save myapp:latest nginx:alpine redis:7 > all-images.tar

# Compress during save for faster transfer
docker save myapp:latest | gzip > myapp.tar.gz
```

Transfer to the destination server:

```bash
# Transfer using scp
scp myapp.tar.gz user@new-server:/tmp/

# Or use rsync for resumable transfers (better for large files)
rsync -avz --progress myapp.tar.gz user@new-server:/tmp/

# For very large transfers, pipe directly over SSH to avoid disk space on source
docker save myapp:latest | gzip | ssh user@new-server "gunzip | docker load"
```

Load images on the destination:

```bash
# On the destination server: load images from tar files
docker load < /tmp/myapp.tar

# Or from compressed archive
gunzip -c /tmp/myapp.tar.gz | docker load
```

## Method 2: Docker Export and Import (Container Filesystem)

If you need to capture the current state of a container's filesystem (including modifications made since it started), use export/import.

```bash
# Export a running container's filesystem
docker export my_container > my_container_fs.tar

# Transfer to the destination
scp my_container_fs.tar user@new-server:/tmp/

# Import as a new image on the destination
# Note: export/import loses CMD, ENTRYPOINT, ENV, and other metadata
docker import /tmp/my_container_fs.tar my_container_migrated:latest
```

## Method 3: Push/Pull Through a Registry

If both servers can reach a shared registry, this is the cleanest approach.

```bash
# On the source server: tag and push images to a shared registry
docker tag myapp:latest registry.example.com/migration/myapp:latest
docker push registry.example.com/migration/myapp:latest

# On the destination server: pull the images
docker pull registry.example.com/migration/myapp:latest
docker tag registry.example.com/migration/myapp:latest myapp:latest
```

## Migrating Volumes

Volume migration is the most critical part. This is where your data lives.

```bash
#!/bin/bash
# migrate-volume.sh
# Migrates a Docker volume from the source server to a destination server

VOLUME_NAME="$1"
DEST_SERVER="$2"
DEST_USER="${3:-root}"

if [ -z "$VOLUME_NAME" ] || [ -z "$DEST_SERVER" ]; then
    echo "Usage: migrate-volume.sh <volume_name> <destination_server> [user]"
    exit 1
fi

echo "Migrating volume: $VOLUME_NAME to $DEST_SERVER"

# Step 1: Create a compressed archive from the volume
echo "Creating archive..."
docker run --rm \
    -v "${VOLUME_NAME}:/source:ro" \
    -v /tmp:/backup \
    alpine tar czf "/backup/${VOLUME_NAME}.tar.gz" -C /source .

# Step 2: Transfer the archive to the destination
echo "Transferring archive..."
rsync -avz --progress "/tmp/${VOLUME_NAME}.tar.gz" \
    "${DEST_USER}@${DEST_SERVER}:/tmp/"

# Step 3: Create the volume and restore data on the destination
echo "Restoring on destination..."
ssh "${DEST_USER}@${DEST_SERVER}" bash -s << EOF
    # Create the volume on the destination
    docker volume create "${VOLUME_NAME}"

    # Restore the archive into the volume
    docker run --rm \
        -v "${VOLUME_NAME}:/target" \
        -v /tmp:/backup:ro \
        alpine sh -c "tar xzf /backup/${VOLUME_NAME}.tar.gz -C /target"

    echo "Volume restored: ${VOLUME_NAME}"
    rm /tmp/${VOLUME_NAME}.tar.gz
EOF

# Clean up the local archive
rm "/tmp/${VOLUME_NAME}.tar.gz"

echo "Volume migration complete: $VOLUME_NAME"
```

## Migrating Container Configuration

Save complete container configurations so you can recreate them exactly on the new server.

```bash
#!/bin/bash
# export-configs.sh
# Exports container configurations in a format suitable for recreation

OUTPUT_DIR="/tmp/migration-configs"
mkdir -p "$OUTPUT_DIR"

for CONTAINER_ID in $(docker ps -q); do
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
    echo "Exporting config for: $NAME"

    # Save the full inspection output
    docker inspect "$CONTAINER_ID" > "${OUTPUT_DIR}/${NAME}_inspect.json"

    # Extract a Docker run command equivalent
    # This creates a script that can recreate the container
    IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_ID")
    ENV_VARS=$(docker inspect --format '{{range .Config.Env}}--env "{{.}}" {{end}}' "$CONTAINER_ID")
    PORTS=$(docker inspect --format '{{range $p, $conf := .NetworkSettings.Ports}}{{if $conf}}-p {{(index $conf 0).HostPort}}:{{$p}} {{end}}{{end}}' "$CONTAINER_ID")
    VOLUMES=$(docker inspect --format '{{range .Mounts}}{{if eq .Type "volume"}}-v {{.Name}}:{{.Destination}} {{end}}{{end}}' "$CONTAINER_ID")
    NETWORK=$(docker inspect --format '{{range $net, $conf := .NetworkSettings.Networks}}--network {{$net}} {{end}}' "$CONTAINER_ID")
    RESTART=$(docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$CONTAINER_ID")

    # Write the recreation script
    cat > "${OUTPUT_DIR}/${NAME}_run.sh" << EOF
#!/bin/bash
# Recreation script for container: $NAME
docker run -d \\
    --name $NAME \\
    $ENV_VARS \\
    $PORTS \\
    $VOLUMES \\
    $NETWORK \\
    --restart $RESTART \\
    $IMAGE
EOF

    chmod +x "${OUTPUT_DIR}/${NAME}_run.sh"
done

echo "Configs exported to $OUTPUT_DIR"
```

## Full Migration Script

Combine everything into one comprehensive migration script:

```bash
#!/bin/bash
# full-migration.sh
# Performs a complete Docker migration from source to destination server

set -euo pipefail

DEST_SERVER="$1"
DEST_USER="${2:-root}"
COMPOSE_FILE="${3:-docker-compose.yml}"

if [ -z "$DEST_SERVER" ]; then
    echo "Usage: full-migration.sh <destination_server> [user] [compose_file]"
    exit 1
fi

echo "=== Docker Migration ==="
echo "Source: $(hostname)"
echo "Destination: $DEST_SERVER"
echo ""

# Step 1: Export all images needed by running containers
echo "--- Step 1: Exporting images ---"
IMAGES=$(docker ps --format '{{.Image}}' | sort -u)
docker save $IMAGES | gzip > /tmp/migration-images.tar.gz
echo "Images archived: $(echo $IMAGES | wc -w) images"

# Step 2: Archive all volumes used by running containers
echo "--- Step 2: Archiving volumes ---"
VOLUMES=$(docker volume ls -q)
for VOL in $VOLUMES; do
    echo "  Archiving volume: $VOL"
    docker run --rm \
        -v "${VOL}:/source:ro" \
        -v /tmp/migration-volumes:/backup \
        alpine tar czf "/backup/${VOL}.tar.gz" -C /source .
done

# Step 3: Stop running containers for consistent state
echo "--- Step 3: Stopping containers ---"
docker compose -f "$COMPOSE_FILE" down 2>/dev/null || docker stop $(docker ps -q) 2>/dev/null

# Step 4: Transfer everything to the destination
echo "--- Step 4: Transferring files ---"
rsync -avz --progress /tmp/migration-images.tar.gz "${DEST_USER}@${DEST_SERVER}:/tmp/"
rsync -avz --progress /tmp/migration-volumes/ "${DEST_USER}@${DEST_SERVER}:/tmp/migration-volumes/"

if [ -f "$COMPOSE_FILE" ]; then
    rsync -avz "$COMPOSE_FILE" "${DEST_USER}@${DEST_SERVER}:/opt/app/"
fi

# Step 5: Restore on the destination
echo "--- Step 5: Restoring on destination ---"
ssh "${DEST_USER}@${DEST_SERVER}" bash << 'REMOTE_EOF'
    # Load images
    echo "Loading images..."
    gunzip -c /tmp/migration-images.tar.gz | docker load

    # Restore volumes
    echo "Restoring volumes..."
    for ARCHIVE in /tmp/migration-volumes/*.tar.gz; do
        VOL_NAME=$(basename "$ARCHIVE" .tar.gz)
        echo "  Restoring volume: $VOL_NAME"
        docker volume create "$VOL_NAME"
        docker run --rm \
            -v "${VOL_NAME}:/target" \
            -v /tmp/migration-volumes:/backup:ro \
            alpine tar xzf "/backup/${VOL_NAME}.tar.gz" -C /target
    done

    # Start containers with Docker Compose
    if [ -f /opt/app/docker-compose.yml ]; then
        cd /opt/app
        docker compose up -d
    fi

    echo "Migration restore complete"
REMOTE_EOF

# Clean up temporary files
rm -f /tmp/migration-images.tar.gz
rm -rf /tmp/migration-volumes

echo "=== Migration Complete ==="
echo "Verify services on $DEST_SERVER before decommissioning this server."
```

## Migrating Docker Compose Applications

If you use Docker Compose, the migration is simpler:

```bash
# On the source: copy the compose file and any related configs
scp docker-compose.yml .env user@new-server:/opt/app/

# Migrate volumes (see volume migration script above)

# On the destination: pull images and start
cd /opt/app
docker compose pull
docker compose up -d
```

## Post-Migration Verification

Always verify the migration was successful:

```bash
#!/bin/bash
# verify-migration.sh
# Validates that containers are running correctly after migration

echo "=== Migration Verification ==="

# Check that all expected containers are running
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verify health checks pass
echo ""
echo "Health checks:"
for CID in $(docker ps -q); do
    NAME=$(docker inspect --format '{{.Name}}' "$CID" | sed 's/^\//')
    HEALTH=$(docker inspect --format '{{.State.Health.Status}}' "$CID" 2>/dev/null || echo "no healthcheck")
    echo "  $NAME: $HEALTH"
done

# Check for recent error logs
echo ""
echo "Recent errors (if any):"
for CID in $(docker ps -q); do
    NAME=$(docker inspect --format '{{.Name}}' "$CID" | sed 's/^\//')
    ERRORS=$(docker logs --tail 20 "$CID" 2>&1 | grep -i "error\|fatal\|panic" | head -3)
    if [ -n "$ERRORS" ]; then
        echo "  $NAME: $ERRORS"
    fi
done
```

## Summary

Migrating Docker containers between servers is a multi-step process that requires careful planning. Export images with `docker save`, migrate volumes with tar archives and helper containers, transfer configurations to recreate containers accurately, and verify everything after the move. For Docker Compose applications, the compose file captures most of the configuration, making migration straightforward. Always test the full migration process on a non-production system before migrating production workloads.
