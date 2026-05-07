# How to Export and Import Podman Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Export, Import, Migration

Description: A detailed guide to exporting Podman container filesystems and importing them as images, including practical use cases for migration, debugging, and environment replication.

---

> Moving containers between hosts does not require a registry. Learn how to export and import Podman containers using simple tar archives for fast, flexible container migration.

There are times when you need to move a container's filesystem from one machine to another without going through a registry. Maybe you are debugging an issue and want to capture the exact filesystem state of a production container. Maybe you are migrating workloads to new hardware. Or maybe you are working in an air-gapped environment with no registry access. Podman's export and import commands handle all of these scenarios.

---

## Export vs Save: Understanding the Difference

Podman has two commands that produce tar archives, and they are not interchangeable:

- **`podman export`** captures a container's filesystem as a flat tar archive. It flattens all layers into a single filesystem snapshot. It works on containers (running or stopped).
- **`podman save`** captures an image with all its layers, metadata, tags, and history intact. It works on images, not containers.

When you export a container and import it, you get a single-layer image with no history. When you save an image and load it, you get the exact image back with all layers preserved.

Use `export`/`import` when you need the current state of a container. Use `save`/`load` when you need to preserve an image exactly.

## Exporting a Container

The basic export command writes the container filesystem to a tar file:

```bash
podman export my-container -o /tmp/my-container.tar
```

You can also pipe to stdout for compression or streaming:

```bash
# Compress with gzip

podman export my-container | gzip > /tmp/my-container.tar.gz

# Compress with zstd for better compression ratios
podman export my-container | zstd > /tmp/my-container.tar.zst

# Stream directly to another host via SSH
podman export my-container | ssh user@remote-host 'cat > /tmp/my-container.tar'
```

### Exporting a Running Container

You can export a running container without stopping it. Podman captures a snapshot of the filesystem at the moment of export:

```bash
podman export web-server -o /tmp/web-server-snapshot.tar
```

Be aware that if the container is actively writing files during export, you may get an inconsistent snapshot. For data-sensitive containers (databases, for example), stop or pause the container first:

```bash
podman pause web-server
podman export web-server -o /tmp/web-server-snapshot.tar
podman unpause web-server
```

## Importing a Container Filesystem as an Image

The `podman import` command takes a tar archive and creates a new image from it:

```bash
podman import /tmp/my-container.tar my-app-snapshot:latest
```

You can set additional image properties during import:

```bash
# Set a custom commit message
podman import --message "Snapshot from production 2026-03-18" \
    /tmp/my-container.tar my-app-snapshot:v1

# Set the default command for containers created from this image
podman import --change 'CMD ["/usr/sbin/nginx", "-g", "daemon off;"]' \
    /tmp/my-container.tar my-nginx-snapshot:latest

# Set multiple properties
podman import \
    --change 'ENV APP_ENV=production' \
    --change 'EXPOSE 8080' \
    --change 'WORKDIR /app' \
    --change 'CMD ["./start.sh"]' \
    /tmp/my-container.tar my-app:restored
```

The `--change` flag accepts Dockerfile instructions including `CMD`, `ENTRYPOINT`, `ENV`, `EXPOSE`, `LABEL`, `USER`, `VOLUME`, and `WORKDIR`.

## Importing from a URL

Podman can import directly from a URL:

```bash
podman import https://example.com/backups/my-container.tar my-app:latest
```

This is useful when backups are stored on a web server or object storage with HTTP access.

## Importing from stdin

You can pipe a tar archive directly into the import command:

```bash
# From a compressed file
gunzip -c /tmp/my-container.tar.gz | podman import - my-app:latest

# From a remote host via SSH
ssh user@remote-host 'cat /tmp/my-container.tar' | podman import - my-app:latest

# From zstd compressed file
zstd -d /tmp/my-container.tar.zst --stdout | podman import - my-app:latest
```

## Practical Use Case: Migrating a Container Between Hosts

Here is a complete workflow for moving a container from one host to another:

### On the source host

```bash
# Step 1: Save container metadata
podman inspect web-app > /tmp/web-app-metadata.json

# Step 2: Export the container filesystem
podman export web-app | gzip > /tmp/web-app.tar.gz

# Step 3: Export any associated volumes
podman run --rm \
    -v web-app-data:/source:ro \
    -v /tmp:/backup \
    alpine tar czf /backup/web-app-data.tar.gz -C /source .

# Step 4: Transfer everything to the destination
scp /tmp/web-app.tar.gz /tmp/web-app-metadata.json /tmp/web-app-data.tar.gz \
    user@new-host:/tmp/
```

### On the destination host

```bash
# Step 1: Import the container filesystem as an image
gunzip -c /tmp/web-app.tar.gz | podman import \
    --change 'CMD ["nginx", "-g", "daemon off;"]' \
    - web-app:migrated

# Step 2: Create and restore the volume
podman volume create web-app-data
podman run --rm \
    -v web-app-data:/target \
    -v /tmp:/backup:ro \
    alpine tar xzf /backup/web-app-data.tar.gz -C /target

# Step 3: Recreate the container with original settings
podman run -d \
    --name web-app \
    -p 8080:80 \
    -v web-app-data:/var/www/html \
    --restart unless-stopped \
    web-app:migrated
```

## Practical Use Case: Debugging a Production Container

When a production container is misbehaving, you can capture its exact filesystem state for debugging on a development machine:

```bash
# On production
podman export troubled-app | gzip > /tmp/troubled-app-debug.tar.gz
podman logs troubled-app > /tmp/troubled-app-logs.txt 2>&1
podman inspect troubled-app > /tmp/troubled-app-inspect.json

# Transfer to dev machine
scp /tmp/troubled-app-* dev-machine:/tmp/

# On dev machine
gunzip -c /tmp/troubled-app-debug.tar.gz | podman import - troubled-app:debug

# Start an interactive shell to investigate
podman run -it --name debug-session troubled-app:debug /bin/bash
```

This gives you a complete copy of the container filesystem to explore without affecting the production environment.

## Automating Export and Import

For regular migrations, automate the process:

```bash
#!/bin/bash
# migrate-container.sh - Export from local and import on remote host

CONTAINER="$1"
REMOTE_HOST="$2"
REMOTE_USER="${3:-root}"

if [ -z "$CONTAINER" ] || [ -z "$REMOTE_HOST" ]; then
    echo "Usage: $0 <container-name> <remote-host> [remote-user]"
    exit 1
fi

echo "Migrating container '$CONTAINER' to $REMOTE_HOST"

# Get the container's CMD as a JSON array so argument boundaries are preserved
CMD_JSON=$(podman inspect "$CONTAINER" --format '{{json .Config.Cmd}}')
CMD_CHANGE=$(printf 'CMD %s' "$CMD_JSON" | base64 | tr -d '\n')

# Stream export directly to remote host and import
podman export "$CONTAINER" | \
    ssh "$REMOTE_USER@$REMOTE_HOST" \
    "podman import --change \"\$(printf '%s' '$CMD_CHANGE' | base64 -d)\" - '${CONTAINER}:migrated'"

if [ $? -eq 0 ]; then
    echo "Migration successful. Image '${CONTAINER}:migrated' created on $REMOTE_HOST"
else
    echo "Migration failed"
    exit 1
fi
```

This streams the export directly over SSH without creating intermediate files, which is faster and uses less disk space.

## Limitations of Export/Import

There are important limitations to be aware of:

1. **No layer history**: Imported images are single-layer. You lose the build history and cannot see which Dockerfile instructions created which files.
2. **No metadata preservation**: Environment variables, exposed ports, volumes, entrypoint, and CMD from the original image are not carried over. You must specify them with `--change` during import or in the `podman run` command.
3. **No volume data**: `podman export` captures only the container filesystem, not mounted volumes. Back up volumes separately.
4. **Larger images**: Because the import creates a single flat layer, it cannot share base layers with other images, resulting in more disk usage.

## Conclusion

The export/import workflow is the simplest way to move container state between hosts. It does not require a registry, works in air-gapped environments, and can stream directly over SSH. Use it for migrations, debugging, and environment replication. For preserving full image structure with layers and history, use `podman save` and `podman load` instead. Choose the right tool based on whether you need the container's current state or the image's build history.
