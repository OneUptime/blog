# How to Backup Podman Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Backup, DevOps, Disaster Recovery

Description: A practical guide to backing up Podman containers, covering export methods, metadata preservation, and strategies for reliable container recovery.

---

> Containers are ephemeral by design, but the work inside them does not have to be. Learn how to back up your Podman containers so you can recover from failures without losing state.

Running containers in production without a backup plan is a gamble. Podman makes it straightforward to create, run, and manage containers, but it does not automatically preserve their state when things go wrong. A host crash, a bad deployment, or an accidental `podman rm` can wipe out hours of work. This guide walks through the practical steps for backing up Podman containers so you always have a recovery path.

---

## Understanding What a Container Backup Includes

A container is more than just a running process. It consists of several layers:

- **The base image** from which the container was created.
- **The writable layer** that holds all changes made since the container started.
- **Container metadata** including environment variables, port mappings, volume mounts, and restart policies.
- **Mounted volumes** that hold persistent data outside the container filesystem.

A complete backup strategy addresses all of these. This post focuses on backing up the container filesystem and metadata. Volume backups and image backups are covered in separate guides.

## Listing Containers Before Backup

Before creating backups, identify what you need to protect. List all containers, including stopped ones:

```bash
podman ps -a --format "{{.ID}} {{.Names}} {{.Status}} {{.Image}}"
```

This gives you a clear picture of every container on the system. You might see output like:

```text
a1b2c3d4e5f6 web-app Up 3 hours docker.io/library/nginx:latest
f6e5d4c3b2a1 redis-cache Up 3 hours docker.io/library/redis:7
b2c3d4e5f6a1 postgres-db Exited (0) 1 hour ago docker.io/library/postgres:16
```

## Exporting a Container to a Tar Archive

The most direct way to back up a container is to export its filesystem to a tar archive. This captures the merged container filesystem, including files from the base image and changes in the writable layer, but it does not preserve the original image layer history:

```bash
podman export web-app -o /backups/web-app-$(date +%Y%m%d-%H%M%S).tar
```

This works on both running and stopped containers. For running containers, Podman exports the filesystem as it exists during the export; stop or quiesce containers first when you need an application-consistent backup.

You can also pipe the output to compress it:

```bash
podman export web-app | gzip > /backups/web-app-$(date +%Y%m%d-%H%M%S).tar.gz
```

A compressed backup of a typical web application container might shrink from 500 MB to under 150 MB, saving significant storage space when you keep multiple backups.

## Preserving Container Metadata

The `podman export` command captures the filesystem but not the container configuration. You need to save metadata separately so you can recreate the container with the same settings:

```bash
podman inspect web-app > /backups/web-app-inspect-$(date +%Y%m%d-%H%M%S).json
```

The inspect output contains the low-level container configuration, including environment variables, port bindings, volume mounts, network settings, resource limits, and entrypoint configuration. To extract just the essential run parameters:

```bash
podman inspect web-app --format '
Name: {{.Name}}
Image: {{.ImageName}}
Command: {{.Config.Cmd}}
Env: {{range .Config.Env}}{{.}} {{end}}
Ports: {{range $k, $v := .HostConfig.PortBindings}}{{$k}}->{{range $v}}{{.HostPort}}{{end}} {{end}}
Mounts: {{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}
RestartPolicy: {{.HostConfig.RestartPolicy.Name}}
'
```

## Creating a Backup Script

Manually running export and inspect for each container is tedious. Here is a script that backs up all containers:

```bash
#!/bin/bash

BACKUP_DIR="/backups/podman/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

for container in $(podman ps -a --format "{{.Names}}"); do
    echo "Backing up container: $container"

    # Export filesystem
    podman export "$container" | gzip > "$BACKUP_DIR/${container}-filesystem.tar.gz"

    # Save metadata
    podman inspect "$container" > "$BACKUP_DIR/${container}-metadata.json"

    # Save the image reference
    podman inspect "$container" --format '{{.ImageName}}' > "$BACKUP_DIR/${container}-image.txt"

    echo "  Done: $BACKUP_DIR/${container}-*"
done

echo "Backup complete: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

Save this as `/usr/local/bin/podman-backup-containers.sh` and make it executable:

```bash
chmod +x /usr/local/bin/podman-backup-containers.sh
```

## Restoring a Container from Backup

To restore a container from an exported tar archive, first import it as a new image:

```bash
podman import /backups/web-app-20260318-120000.tar.gz web-app-restored:latest
```

Then recreate the container using the metadata you saved. Read the JSON inspect file to get the original configuration, and reconstruct the `podman run` command:

```bash
podman run -d \
    --name web-app \
    -p 8080:80 \
    -e APP_ENV=production \
    -v /data/web-app:/var/www/html \
    --restart unless-stopped \
    web-app-restored:latest \
    nginx -g "daemon off;"
```

One important caveat: when you import a container filesystem as an image, it becomes a flat, single-layer image. The original image layer history is lost. This can make the restored image use more storage than a layered image that shares base layers with other images on the system.

## Generating a Restore Script Automatically

You can take the backup process further by generating a restore script alongside each backup:

```bash
#!/bin/bash

CONTAINER_NAME="$1"
BACKUP_DIR="$2"

# Read metadata

IMAGE=$(podman inspect "$CONTAINER_NAME" --format '{{.ImageName}}')
PORTS=$(podman inspect "$CONTAINER_NAME" --format '{{range $k, $v := .HostConfig.PortBindings}}-p {{range $v}}{{.HostPort}}:{{end}}{{$k}} {{end}}')
ENV_VARS=$(podman inspect "$CONTAINER_NAME" --format '{{range .Config.Env}}-e "{{.}}" {{end}}')
RESTART=$(podman inspect "$CONTAINER_NAME" --format '{{.HostConfig.RestartPolicy.Name}}')
CMD=$(podman inspect "$CONTAINER_NAME" --format '{{join .Config.Cmd " "}}')

cat > "$BACKUP_DIR/${CONTAINER_NAME}-restore.sh" << EOF
#!/bin/bash
# Restore script for $CONTAINER_NAME
# Generated on $(date)

# Import the filesystem as an image
podman import "$BACKUP_DIR/${CONTAINER_NAME}-filesystem.tar.gz" ${CONTAINER_NAME}-restored:latest

# Recreate the container
podman run -d \\
    --name $CONTAINER_NAME \\
    $PORTS \\
    $ENV_VARS \\
    --restart $RESTART \\
    ${CONTAINER_NAME}-restored:latest \\
    $CMD
EOF

chmod +x "$BACKUP_DIR/${CONTAINER_NAME}-restore.sh"
```

This gives each backup a restore starting point. Review the generated script before relying on it, especially for mounts, networks, users, labels, host IP bindings, entrypoints, and arguments that need shell quoting.

## Backup Retention and Storage

Backups are only useful if you can find them and they are not consuming all your disk space. Implement a retention policy:

```bash
# Remove timestamped backup directories older than 30 days
find /backups/podman -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +

# Keep only the last 10 backups
ls -dt /backups/podman/*/ | tail -n +11 | xargs rm -rf
```

For off-site storage, push your backups to an object store or remote server:

```bash
# Sync backups to a remote server
rsync -avz /backups/podman/ backup-server:/backups/podman/

# Or upload to S3-compatible storage
aws s3 sync /backups/podman/ s3://my-backups/podman/
```

## Verifying Backup Integrity

A backup you cannot restore is not a backup. Periodically test your backups:

```bash
#!/bin/bash

BACKUP_FILE="$1"

# Test that the compressed archive is valid
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "Archive integrity: OK"
else
    echo "Archive integrity: FAILED"
    exit 1
fi

# Test import
podman import "$BACKUP_FILE" backup-test:latest
if [ $? -eq 0 ]; then
    echo "Import test: OK"
    podman rmi backup-test:latest
else
    echo "Import test: FAILED"
    exit 1
fi
```

## Conclusion

Backing up Podman containers requires capturing both the filesystem state and the container configuration. The `podman export` command handles the filesystem, while `podman inspect` preserves the metadata you need for reconstruction. Automate the process with scripts, implement retention policies to manage storage, and test your backups regularly. A backup strategy that is not tested is just a hope, and hope is not an operations strategy.
