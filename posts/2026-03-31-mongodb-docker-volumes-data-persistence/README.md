# How to Use Docker Volumes for MongoDB Data Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Volume, Persistence, Storage

Description: Configure named Docker volumes and bind mounts for MongoDB data persistence, backups, and safe container restarts without losing data.

---

## Overview

By default, data stored inside a MongoDB container is lost when the container is removed. Docker volumes solve this by storing the database files on the host filesystem or a managed volume driver, independent of the container lifecycle. Understanding the difference between named volumes and bind mounts is essential for running reliable MongoDB containers.

## Named Volume (Recommended)

Named volumes are managed by Docker and stored in a Docker-managed directory on the host. They are the preferred approach for production and development.

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
      - mongo_config:/data/configdb
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret

volumes:
  mongo_data:
    driver: local
  mongo_config:
    driver: local
```

## Bind Mount for Direct File Access

Bind mounts map a host directory directly to the container path. Useful when you want to inspect or back up MongoDB data files directly from the host.

```yaml
volumes:
  - /opt/mongo/data:/data/db
  - /opt/mongo/config:/data/configdb
```

```bash
# Ensure correct ownership before starting
sudo mkdir -p /opt/mongo/data /opt/mongo/config
sudo chown -R 999:999 /opt/mongo/data /opt/mongo/config
```

## Backing Up a Named Volume

Use a temporary container to copy volume contents to a tar archive.

```bash
docker run --rm \
  -v mongo_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine \
  tar czf /backup/mongo-backup-$(date +%Y%m%d).tar.gz -C /source .
```

## Restoring from Backup

```bash
# Stop MongoDB first
docker compose stop mongo

# Restore into the volume
docker run --rm \
  -v mongo_data:/target \
  -v $(pwd)/backups:/backup:ro \
  alpine \
  sh -c "cd /target && tar xzf /backup/mongo-backup-20260315.tar.gz"

# Restart
docker compose start mongo
```

## Using mongodump Inside the Container

Take a logical backup using `mongodump` for a portable, version-independent backup.

```bash
docker exec mongo-dev mongodump \
  --username admin \
  --password secret \
  --authenticationDatabase admin \
  --out /tmp/dump

docker cp mongo-dev:/tmp/dump ./backups/mongo-logical-$(date +%Y%m%d)
```

## Volume Inspection and Cleanup

```bash
# Inspect volume details and mount path on host
docker volume inspect mongo_data

# List all MongoDB-related volumes
docker volume ls --filter name=mongo

# Remove a volume (WARNING: deletes all data)
docker volume rm mongo_data
```

## Shared Volume with Multiple Services

If multiple application containers need read access to MongoDB backup files, mount a shared volume.

```yaml
volumes:
  mongo_data:
  shared_exports:

services:
  mongo:
    volumes:
      - mongo_data:/data/db
      - shared_exports:/exports

  backup:
    image: mongo:7.0
    volumes:
      - shared_exports:/exports
    command: >
      sh -c "mongodump --uri mongodb://admin:secret@mongo:27017 --out /exports/$$(date +%Y%m%d)"
```

## Summary

Named Docker volumes are the recommended way to persist MongoDB data across container restarts and removals. Use bind mounts when you need direct host access to files for debugging or backup scripts. Always back up volumes regularly with either `mongodump` for logical backups or volume tar archives for physical backups, and verify the `mongodb` user owns the data directory when using bind mounts.
