# How to Migrate Podman Volumes Between Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Migration, Storage

Description: Learn how to migrate Podman volumes from one host to another using export, transfer, and import workflows.

---

> Migrating volumes between hosts is a common task when scaling infrastructure, replacing hardware, or moving workloads between environments.

Podman volumes can be migrated between hosts by exporting them as archives, transferring the files, and importing them on the destination. This guide covers multiple migration strategies.

---

## Basic Export-Transfer-Import Workflow

The standard approach involves three steps:

```bash
# On the source host: export the volume

podman volume export mydata --output /tmp/mydata-backup.tar

# Transfer to the destination host
scp /tmp/mydata-backup.tar user@destination:/tmp/

# On the destination host: create and import the volume
podman volume create mydata
podman volume import mydata /tmp/mydata-backup.tar
```

## Streaming Migration with SSH

Skip the intermediate file by piping directly over SSH:

```bash
# Stream the volume from source to destination in one command
podman volume export mydata | \
  ssh user@destination "podman volume create mydata && podman volume import mydata -"

# With compression for faster transfer over slow links
podman volume export mydata | gzip | \
  ssh user@destination "podman volume create mydata && gunzip | podman volume import mydata -"
```

## Migrating Multiple Volumes

```bash
# On the source host: export all volumes to a directory
EXPORT_DIR="/tmp/volume-exports"
mkdir -p "$EXPORT_DIR"

for vol in $(podman volume ls --format '{{ .Name }}'); do
  echo "Exporting: $vol"
  podman volume export "$vol" | gzip > "$EXPORT_DIR/${vol}.tar.gz"
done

# Transfer the entire directory
rsync -avz "$EXPORT_DIR/" user@destination:/tmp/volume-exports/

# On the destination host: import all volumes
for archive in /tmp/volume-exports/*.tar.gz; do
  vol_name=$(basename "$archive" .tar.gz)
  echo "Importing: $vol_name"
  podman volume create "$vol_name"
  gunzip -c "$archive" | podman volume import "$vol_name" -
done
```

## Migrating with rsync for Large Volumes

For very large volumes, rsync provides incremental transfers:

```bash
# Get the volume mountpoint on the source
SRC_PATH=$(podman volume inspect mydata --format '{{ .Mountpoint }}')

# Rsync the volume data to the destination
sudo rsync -avz --progress "$SRC_PATH/" user@destination:/tmp/mydata-sync/

# On the destination: create volume and copy data in
podman volume create mydata
DEST_PATH=$(podman volume inspect mydata --format '{{ .Mountpoint }}')
sudo rsync -avz /tmp/mydata-sync/ "$DEST_PATH/"
```

## Migrating Containers with Their Volumes

```bash
# On the source: stop the container and note its configuration
podman stop myapp
podman inspect myapp --format '{{ json .Config }}' > /tmp/myapp-config.json

# Export the volume
podman volume export appdata | gzip > /tmp/appdata.tar.gz

# Transfer both files
scp /tmp/appdata.tar.gz /tmp/myapp-config.json user@destination:/tmp/

# On the destination: recreate the volume and container
podman volume create appdata
gunzip -c /tmp/appdata.tar.gz | podman volume import appdata -

podman run -d --name myapp \
  -v appdata:/app/data \
  docker.io/library/node:20
```

## Verifying Migration Integrity

```bash
# On source: generate checksums
podman run --rm -v mydata:/data:ro \
  docker.io/library/alpine:latest \
  sh -c "find /data -type f -exec md5sum {} +" > /tmp/source-checksums.txt

# On destination: generate checksums and compare
podman run --rm -v mydata:/data:ro \
  docker.io/library/alpine:latest \
  sh -c "find /data -type f -exec md5sum {} +" > /tmp/dest-checksums.txt

diff /tmp/source-checksums.txt /tmp/dest-checksums.txt
```

## Summary

Migrate Podman volumes between hosts by exporting to tar, transferring via scp or rsync, and importing on the destination. For efficiency, stream directly over SSH with compression. Always verify migration integrity by comparing checksums on both hosts. Stop containers before exporting to ensure data consistency.
