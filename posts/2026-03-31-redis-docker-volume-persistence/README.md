# How to Configure Redis Docker Volume Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Persistence

Description: Learn how to configure Docker volumes for Redis data persistence, covering named volumes, bind mounts, backup strategies, and persistence configuration options.

---

By default, Redis data in a Docker container is lost when the container is removed. Configuring proper volume persistence ensures your data survives container restarts, upgrades, and re-deployments.

## Understanding Redis Persistence in Docker

Redis stores data in two locations:
- `/data/dump.rdb` - RDB snapshot file
- `/data/appendonlydir/` - AOF directory (Redis 7+ uses Multi Part AOF with manifest, base, and incremental files)

The official Redis image sets `dir /data` and exposes `/data` as a volume.

## Named Volumes (Recommended)

Named volumes are managed by Docker and survive container removal:

```yaml
# docker-compose.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --save "900 1" --save "300 10"
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  redis-data:
    driver: local
```

```bash
# List volumes
docker volume ls | grep redis

# Inspect volume location on host
docker volume inspect redis_redis-data

# Output shows actual path:
# "Mountpoint": "/var/lib/docker/volumes/redis_redis-data/_data"
```

## Bind Mounts (Direct Host Path)

For direct access to files on the host:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - /opt/redis/data:/data
    user: "999:999"  # redis user UID in the container
```

Ensure the host directory has correct permissions:

```bash
mkdir -p /opt/redis/data
chown 999:999 /opt/redis/data
chmod 750 /opt/redis/data
```

## Persistence Configuration

Enable both RDB and AOF:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis-data:/data
```

Verify persistence is active:

```bash
docker exec redis redis-cli CONFIG GET appendonly
docker exec redis redis-cli CONFIG GET save
docker exec redis redis-cli INFO persistence
```

## Backup Named Volume Contents

```bash
#!/bin/bash
# backup-redis-volume.sh
VOLUME_NAME="redis_redis-data"
BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Trigger Redis save before backup
docker exec redis redis-cli BGSAVE
sleep 5  # wait for save to complete

# Copy data from volume
docker run --rm \
  -v "$VOLUME_NAME:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf "/backup/redis-data-$DATE.tar.gz" -C /data .

echo "Backup created: $BACKUP_DIR/redis-data-$DATE.tar.gz"
```

## Restore from Backup

```bash
#!/bin/bash
# restore-redis-volume.sh
BACKUP_FILE="$1"
VOLUME_NAME="redis_redis-data"

# Stop Redis
docker compose stop redis

# Restore to volume
docker run --rm \
  -v "$VOLUME_NAME:/data" \
  -v "$(dirname "$BACKUP_FILE"):/backup:ro" \
  alpine \
  tar xzf "/backup/$(basename "$BACKUP_FILE")" -C /data

# Restart Redis
docker compose start redis
echo "Restore complete from $BACKUP_FILE"
```

## Volume for Kubernetes (PVC)

When migrating to Kubernetes, data from Docker volumes can be used with PersistentVolumeClaims:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

## Summary

Redis Docker volume persistence is best achieved with named volumes rather than bind mounts for portability. Enable both RDB and AOF persistence in the Redis command configuration, automate volume backups using a container-based backup script, and test your restore procedure to confirm data survives container recreation. Named volumes persist independently of container lifecycle and are easy to inspect and manage.
