# How to Run MongoDB in Docker with Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Persistent Volume, Container, DevOps

Description: Learn how to run MongoDB in Docker with named volumes and bind mounts to ensure your data persists across container restarts and upgrades.

---

## Overview

Running MongoDB in Docker is convenient for development and production, but data is lost when a container is removed unless you configure persistent storage. Docker named volumes and bind mounts both solve this problem. This guide covers both approaches along with authentication, initialization scripts, and Docker Compose setup.

## Why Persistent Volumes Matter

By default, Docker containers use an ephemeral writable layer that disappears when the container is removed. For a database like MongoDB, this means all data is lost on `docker rm`. Persistent volumes decouple data from the container lifecycle.

## Option 1 - Named Volume (Recommended)

```bash
# Create a named volume
docker volume create mongodb_data

# Run MongoDB with the named volume
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret123 \
  -v mongodb_data:/data/db \
  mongo:7.0
```

Verify the volume is mounted:

```bash
docker inspect mongodb | python3 -c "
import sys, json
data = json.load(sys.stdin)
mounts = data[0].get('Mounts', [])
for m in mounts:
    print(m)
"
```

## Option 2 - Bind Mount

```bash
# Create a local directory
mkdir -p ~/mongodb/data ~/mongodb/config ~/mongodb/logs

# Run with bind mount
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret123 \
  -v ~/mongodb/data:/data/db \
  -v ~/mongodb/config:/etc/mongo \
  mongo:7.0
```

## Using Docker Compose

```yaml
services:
  mongodb:
    image: mongo:7.0
    container_name: mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret123
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    networks:
      - app-network

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local

networks:
  app-network:
    driver: bridge
```

Start the stack:

```bash
docker compose up -d
docker compose logs -f mongodb
```

## Initialization Scripts

Scripts placed in `/docker-entrypoint-initdb.d/` run once when the container starts for the first time. They must be `.sh` or `.js` files.

```javascript
// init-scripts/01-create-user.js
db = db.getSiblingDB("myapp")

db.createUser({
  user: "appuser",
  pwd: "apppassword",
  roles: [{ role: "readWrite", db: "myapp" }]
})

db.products.insertMany([
  { name: "Widget A", price: 9.99, stock: 100 },
  { name: "Widget B", price: 14.99, stock: 50 }
])
```

## Configure mongod.conf via Docker

Mount a custom configuration file:

```yaml
# docker-compose.yml addition
volumes:
  - ./mongod.conf:/etc/mongod.conf:ro
command: ["mongod", "--config", "/etc/mongod.conf"]
```

```yaml
# mongod.conf
storage:
  dbPath: /data/db
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1

net:
  port: 27017
  bindIp: 0.0.0.0

security:
  authorization: enabled
```

## Backup from a Running Container

```bash
# Dump to the host
docker exec mongodb mongodump \
  --username admin \
  --password secret123 \
  --authenticationDatabase admin \
  --out /tmp/backup

# Copy backup from container to host
docker cp mongodb:/tmp/backup ./mongo-backup
```

## Upgrade MongoDB Version with Persistent Volume

Because data lives on the volume, you can replace the container with a newer image version:

```bash
# Stop the old container
docker stop mongodb && docker rm mongodb

# Start new version with the same volume
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret123 \
  -v mongodb_data:/data/db \
  mongo:8.0
```

Always check the [MongoDB release notes](https://www.mongodb.com/docs/manual/release-notes/) before upgrading. MongoDB only supports upgrading one major version at a time (for example, 7.0 to 8.0).

## Summary

Running MongoDB in Docker with persistent volumes separates data from the container lifecycle, ensuring data survives container restarts and removals. Named volumes are the recommended approach for production, while bind mounts are useful for local development where you need direct access to the data directory. Docker Compose makes it easy to combine volumes, init scripts, and custom configuration into a reproducible setup.
