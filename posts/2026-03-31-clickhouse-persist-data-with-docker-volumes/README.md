# How to Persist ClickHouse Data with Docker Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker, Volume, Data Persistence, Storage, Self-Hosted

Description: Learn how to use Docker volumes and bind mounts to persist ClickHouse data, logs, and configuration across container restarts and upgrades.

---

By default, data inside a Docker container is ephemeral - it disappears when the container is removed. For ClickHouse, persisting data requires explicitly mounting Docker volumes or host directories. This guide covers both approaches and best practices.

## Why Data Persistence Matters

ClickHouse stores table data, metadata, and logs under `/var/lib/clickhouse` and `/var/log/clickhouse-server`. Without persistent storage, restarting or upgrading a container erases all your data.

## Option 1 - Named Docker Volumes (Recommended)

Named volumes are managed by Docker and survive container removal. They are the recommended approach for production and development:

```yaml
version: "3.8"

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    container_name: clickhouse
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - clickhouse_logs:/var/log/clickhouse-server
    environment:
      CLICKHOUSE_USER: admin
      CLICKHOUSE_PASSWORD: secret

volumes:
  clickhouse_data:
    driver: local
  clickhouse_logs:
    driver: local
```

Start and verify data persists after removing and recreating the container:

```bash
docker compose up -d

# Insert some data
docker exec -it clickhouse clickhouse-client --user admin --password secret \
  --query "CREATE TABLE test (id UInt32) ENGINE=MergeTree() ORDER BY id; INSERT INTO test VALUES (1),(2),(3);"

# Remove and recreate the container (data volume is preserved)
docker compose down
docker compose up -d
docker exec -it clickhouse clickhouse-client --user admin --password secret \
  --query "SELECT count() FROM test;"
```

## Option 2 - Bind Mounts

Bind mounts map a host directory directly into the container. This is useful when you need direct access to files from the host:

```yaml
volumes:
  - /data/clickhouse:/var/lib/clickhouse
  - /data/clickhouse-logs:/var/log/clickhouse-server
  - ./config:/etc/clickhouse-server/config.d
```

Set correct permissions on the host directory:

```bash
sudo mkdir -p /data/clickhouse /data/clickhouse-logs
sudo chown -R 101:101 /data/clickhouse /data/clickhouse-logs
```

The ClickHouse container runs as UID 101 by default.

## Inspecting Volume Contents

```bash
# List volumes
docker volume ls

# Inspect a named volume
docker volume inspect clickhouse-single_clickhouse_data

# Check volume usage
docker system df -v
```

## Backing Up Volume Data

Use `docker run` with a temporary container to create a tarball backup:

```bash
docker run --rm \
  -v clickhouse-single_clickhouse_data:/source:ro \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/clickhouse_data_$(date +%Y%m%d).tar.gz -C /source .
```

## Upgrading ClickHouse with Persistent Data

Because data is stored in the volume and not in the container, upgrading is safe:

```bash
# Pull new image
docker compose pull

# Recreate container with new image (data volume is preserved)
docker compose up -d --force-recreate
```

ClickHouse will run any necessary data format migrations on startup automatically.

## Separating Data and Logs

It is a good practice to use separate volumes for data and logs to allow independent size management:

```sql
-- Check current disk usage from inside ClickHouse
SELECT
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total
FROM system.disks;
```

## Summary

Persisting ClickHouse data with Docker volumes ensures your data survives container restarts and upgrades. Named volumes managed by Docker are the recommended approach, offering portability and easy backup. Bind mounts are a good choice when you need direct host filesystem access or are running on a specific storage path.
