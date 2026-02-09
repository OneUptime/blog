# How to Copy a Docker Volume to Another Host

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Migration, Storage, DevOps, Backup

Description: Learn how to copy Docker volumes between hosts using tar archives, rsync, SSH, and other methods for data migration and backup.

---

Docker volumes do not have a built-in command for copying between hosts. When you need to migrate a database, move application data, or replicate a volume for disaster recovery, you need to extract the data, transfer it, and import it on the destination. This guide covers every practical method to get the job done.

## Method 1: Export and Import with tar over SSH

The most common approach is to create a tar archive of the volume contents, transfer it over SSH, and extract it on the destination host. You can do this in a single pipeline without storing the archive on disk.

### Step-by-Step Approach

First, create a tar archive from the source volume:

```bash
# On the source host: export the volume to a tar file
docker run --rm -v mydata:/data -v $(pwd):/backup alpine \
  tar czf /backup/mydata-volume.tar.gz -C /data .
```

Transfer the archive to the destination host:

```bash
# Copy the archive to the remote host
scp mydata-volume.tar.gz user@destination:/tmp/
```

Import the archive into a new volume on the destination:

```bash
# On the destination host: create the volume and import data
docker volume create mydata
docker run --rm -v mydata:/data -v /tmp:/backup alpine \
  tar xzf /backup/mydata-volume.tar.gz -C /data
```

### One-Line Pipeline (No Intermediate File)

For large volumes, avoid writing the archive to disk by piping directly over SSH:

```bash
# Stream the volume directly from source to destination
docker run --rm -v mydata:/data alpine tar czf - -C /data . | \
  ssh user@destination 'docker run --rm -i -v mydata:/data alpine tar xzf - -C /data'
```

This command:
1. Creates a tar archive from the source volume and writes it to stdout
2. Pipes the data over SSH to the destination host
3. On the destination, reads the tar from stdin and extracts it into a new volume

The volume data never touches disk as an intermediate file, which saves time and disk space.

## Method 2: Using rsync

For incremental transfers (copying only changed files), rsync is more efficient than tar. This requires mounting the volume and running rsync over SSH.

First, find the volume's mountpoint on the source host:

```bash
# Get the volume mountpoint on the source host
docker volume inspect mydata --format '{{.Mountpoint}}'
# Output: /var/lib/docker/volumes/mydata/_data
```

Use rsync to synchronize to the destination:

```bash
# Sync the volume data to the destination host using rsync
sudo rsync -avz --progress \
  /var/lib/docker/volumes/mydata/_data/ \
  user@destination:/var/lib/docker/volumes/mydata/_data/
```

On the destination host, create the volume first so Docker tracks it:

```bash
# On destination: create the volume before rsync
docker volume create mydata
```

The rsync approach is ideal for large volumes where you need regular synchronization. After the initial full sync, subsequent runs only transfer changed files.

## Method 3: Using Docker Save/Load (for Volume Data Bundled in Images)

If you want to bundle volume data into a Docker image for transfer, you can create a temporary image:

```bash
# On source: create a container with the volume data, commit it as an image
docker run --name temp-export -v mydata:/data alpine true
docker commit temp-export mydata-snapshot
docker rm temp-export

# Save the image to a tar file
docker save mydata-snapshot > mydata-snapshot.tar

# Transfer to destination
scp mydata-snapshot.tar user@destination:/tmp/
```

On the destination:

```bash
# Load the image
docker load < /tmp/mydata-snapshot.tar

# Create the volume and copy data from the image
docker volume create mydata
docker run --rm -v mydata:/data mydata-snapshot sh -c "cp -a /data/. /dest/"
# This won't work as-is because the data is at /data in the snapshot
# Better approach: extract from the committed container
docker run --rm -v mydata:/dest mydata-snapshot sh -c "cp -a /data/. /dest/"
```

This method is useful when you want to version your volume data or store it in a registry.

## Method 4: Using a Docker Registry

Push the volume data as a Docker image to a registry, then pull it on the destination:

```bash
# On source: package volume data into an image
docker run --name vol-copy -v mydata:/source alpine sh -c "mkdir /export && cp -a /source/. /export/"
docker commit vol-copy registry.example.com/mydata-backup:latest
docker rm vol-copy

# Push to a registry
docker push registry.example.com/mydata-backup:latest
```

On the destination:

```bash
# Pull and extract
docker pull registry.example.com/mydata-backup:latest
docker volume create mydata
docker run --rm -v mydata:/data registry.example.com/mydata-backup:latest \
  sh -c "cp -a /export/. /data/"
```

This method leverages existing Docker infrastructure and works well when hosts cannot reach each other directly.

## Method 5: Using a Shared NFS Volume

If both hosts can access an NFS share, use it as an intermediate:

```bash
# On source: copy volume data to NFS share
docker run --rm \
  -v mydata:/source \
  -v /mnt/nfs-share:/dest \
  alpine cp -a /source/. /dest/mydata-backup/
```

On the destination:

```bash
# On destination: copy from NFS to a new volume
docker volume create mydata
docker run --rm \
  -v /mnt/nfs-share:/source \
  -v mydata:/dest \
  alpine cp -a /source/mydata-backup/. /dest/
```

## Handling Database Volumes

Database volumes require special care. Copying the raw files of a running database can result in corrupted data. Always stop the database or use the database's backup tools.

### PostgreSQL Volume Migration

```bash
# On source: dump the database (while it's running)
docker exec postgres-container pg_dumpall -U postgres > /tmp/db-backup.sql

# Transfer the dump
scp /tmp/db-backup.sql user@destination:/tmp/

# On destination: start a fresh PostgreSQL container
docker run -d --name postgres-new -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret postgres:16

# Wait for PostgreSQL to be ready, then restore
docker exec -i postgres-new psql -U postgres < /tmp/db-backup.sql
```

### File-Level Volume Copy (Database Stopped)

If you prefer copying raw files, stop the database first:

```bash
# Stop the database container
docker stop postgres-container

# Now safely copy the volume
docker run --rm -v pgdata:/data alpine tar czf - -C /data . | \
  ssh user@destination 'docker volume create pgdata && docker run --rm -i -v pgdata:/data alpine tar xzf - -C /data'

# Start the database on the destination
ssh user@destination 'docker run -d --name postgres -v pgdata:/var/lib/postgresql/data postgres:16'
```

## Automating Volume Backups

Create a script for regular volume backups to a remote host:

```bash
#!/bin/bash
# backup-volumes.sh - Backup all Docker volumes to a remote host

REMOTE_HOST="user@backup-server"
REMOTE_DIR="/backups/docker-volumes"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Get all volume names
VOLUMES=$(docker volume ls -q)

for VOL in $VOLUMES; do
    echo "Backing up volume: $VOL"

    # Create a compressed archive and stream it to the remote host
    docker run --rm -v "$VOL":/data alpine tar czf - -C /data . | \
      ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DIR/$VOL && cat > $REMOTE_DIR/$VOL/${TIMESTAMP}.tar.gz"

    echo "Done: $VOL"
done

echo "All volumes backed up."
```

## Verifying the Copy

After copying a volume, verify the data is intact:

```bash
# On source: generate checksums
docker run --rm -v mydata:/data alpine \
  find /data -type f -exec md5sum {} + | sort > /tmp/source-checksums.txt

# On destination: generate checksums
docker run --rm -v mydata:/data alpine \
  find /data -type f -exec md5sum {} + | sort > /tmp/dest-checksums.txt

# Compare (transfer one file to the other host first)
diff /tmp/source-checksums.txt /tmp/dest-checksums.txt
```

If the diff output is empty, the copy is identical.

## Copying Volumes Between Docker Contexts

If you use Docker contexts to manage multiple hosts, you can switch contexts for the copy:

```bash
# List available contexts
docker context ls

# Export from the source context
docker --context source-host run --rm -v mydata:/data alpine tar czf - -C /data . > mydata.tar.gz

# Import to the destination context
docker --context dest-host volume create mydata
cat mydata.tar.gz | docker --context dest-host run --rm -i -v mydata:/data alpine tar xzf - -C /data
```

## Performance Tips

For large volumes, consider these optimizations:

```bash
# Use pigz for parallel compression (faster than gzip)
docker run --rm -v mydata:/data alpine sh -c "apk add --no-cache pigz && tar cf - -C /data . | pigz" | \
  ssh user@destination 'docker run --rm -i -v mydata:/data alpine sh -c "apk add --no-cache pigz && pigz -d | tar xf - -C /data"'

# Skip compression for already-compressed data (like images or compressed databases)
docker run --rm -v mydata:/data alpine tar cf - -C /data . | \
  ssh user@destination 'docker run --rm -i -v mydata:/data alpine tar xf - -C /data'
```

## Summary

Copying Docker volumes between hosts boils down to three steps: export, transfer, import. The tar-over-SSH pipeline is the most versatile method and works for any volume size. Use rsync for incremental transfers of large volumes that change frequently. For databases, always use the database's own backup tools or stop the service before copying raw files. Verify your copies with checksums, and automate regular backups with a simple shell script.
