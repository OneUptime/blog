# How to Run MongoDB in Docker with Authentication and Volumes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, MongoDB, Database, Containers, NoSQL

Description: Learn how to run MongoDB in Docker with authentication, persistent volumes, replica sets, initialization scripts, and production-ready configuration.

---

MongoDB's flexible document model makes it popular for modern applications. Running it in Docker requires understanding authentication setup, data persistence, and replica set configuration for production deployments.

## Quick Start

### Development (No Auth)

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  mongo:7
```

### Production (With Auth)

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secretpassword \
  -v mongodb-data:/data/db \
  mongo:7
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGO_INITDB_ROOT_USERNAME` | Admin username (enables auth) |
| `MONGO_INITDB_ROOT_PASSWORD` | Admin password |
| `MONGO_INITDB_DATABASE` | Initial database to create |

## Docker Compose Configuration

### Basic Setup

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongodb-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongodb-data:
```

### Production Setup with Secrets

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME_FILE: /run/secrets/mongo_root_username
      MONGO_INITDB_ROOT_PASSWORD_FILE: /run/secrets/mongo_root_password
      MONGO_INITDB_DATABASE: myapp
    secrets:
      - mongo_root_username
      - mongo_root_password
    volumes:
      - mongodb-data:/data/db
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      - ./mongod.conf:/etc/mongod.conf:ro
    command: mongod --config /etc/mongod.conf
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 2G
    networks:
      - backend

secrets:
  mongo_root_username:
    file: ./secrets/mongo_root_username.txt
  mongo_root_password:
    file: ./secrets/mongo_root_password.txt

networks:
  backend:
    internal: true

volumes:
  mongodb-data:
```

## Authentication Setup

### Creating Application Users

Create an initialization script to add application-specific users.

```javascript
// init-scripts/01-create-users.js
db = db.getSiblingDB('myapp');

db.createUser({
  user: 'myapp_user',
  pwd: 'myapp_password',
  roles: [
    { role: 'readWrite', db: 'myapp' }
  ]
});

db.createUser({
  user: 'myapp_readonly',
  pwd: 'readonly_password',
  roles: [
    { role: 'read', db: 'myapp' }
  ]
});
```

### Using Shell Scripts

```bash
#!/bin/bash
# init-scripts/02-seed-data.sh
set -e

mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
use myapp;
db.settings.insertOne({
  key: 'version',
  value: '1.0.0',
  createdAt: new Date()
});
EOF
```

### Authentication Mechanisms

MongoDB supports multiple authentication mechanisms. The default is SCRAM-SHA-256.

```yaml
services:
  mongodb:
    image: mongo:7
    command: mongod --auth
```

## Custom Configuration

### mongod.conf

```yaml
# mongod.conf

# Storage
storage:
  dbPath: /data/db
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1

# Network
net:
  port: 27017
  bindIp: 0.0.0.0

# Security
security:
  authorization: enabled

# Logging
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true

# Operation Profiling
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

Mount and use:

```yaml
services:
  mongodb:
    image: mongo:7
    volumes:
      - ./mongod.conf:/etc/mongod.conf:ro
      - mongodb-data:/data/db
      - mongodb-logs:/var/log/mongodb
    command: mongod --config /etc/mongod.conf
```

## Connecting to MongoDB

### From Host

```bash
# Without auth
mongosh mongodb://localhost:27017

# With auth
mongosh mongodb://admin:password@localhost:27017/admin

# Connection string format
mongosh "mongodb://username:password@localhost:27017/database?authSource=admin"
```

### From Another Container

```yaml
services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret
    networks:
      - app-network

  app:
    image: my-app
    environment:
      MONGODB_URI: mongodb://admin:secret@mongodb:27017/myapp?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - app-network

networks:
  app-network:
```

### Connection String Formats

```
# Basic
mongodb://mongodb:27017

# With authentication
mongodb://username:password@mongodb:27017/database?authSource=admin

# Multiple hosts (replica set)
mongodb://host1:27017,host2:27017,host3:27017/database?replicaSet=rs0

# With options
mongodb://username:password@mongodb:27017/database?authSource=admin&retryWrites=true&w=majority
```

## Replica Set Configuration

For production, run MongoDB as a replica set for high availability.

### Single Node Replica Set (Development)

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongodb-data:/data/db
    ports:
      - "27017:27017"
    healthcheck:
      test: |
        mongosh --eval "
          try {
            rs.status().ok
          } catch(e) {
            rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})
          }
        " | grep -q 1
      interval: 10s
      start_period: 30s

volumes:
  mongodb-data:
```

### Three-Node Replica Set

```yaml
version: '3.8'

services:
  mongo1:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo1-data:/data/db
    networks:
      - mongo-network

  mongo2:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo2-data:/data/db
    networks:
      - mongo-network

  mongo3:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo3-data:/data/db
    networks:
      - mongo-network

  mongo-init:
    image: mongo:7
    depends_on:
      - mongo1
      - mongo2
      - mongo3
    command: |
      mongosh --host mongo1:27017 --eval "
        rs.initiate({
          _id: 'rs0',
          members: [
            {_id: 0, host: 'mongo1:27017', priority: 2},
            {_id: 1, host: 'mongo2:27017', priority: 1},
            {_id: 2, host: 'mongo3:27017', priority: 1}
          ]
        })
      "
    networks:
      - mongo-network

networks:
  mongo-network:

volumes:
  mongo1-data:
  mongo2-data:
  mongo3-data:
```

## Backup and Restore

### mongodump Backup

```bash
# Full backup
docker exec mongodb mongodump \
  -u admin -p password \
  --authenticationDatabase admin \
  --out /data/backup

# Copy to host
docker cp mongodb:/data/backup ./backup

# Single database
docker exec mongodb mongodump \
  -u admin -p password \
  --authenticationDatabase admin \
  --db myapp \
  --out /data/backup
```

### mongorestore

```bash
# Copy backup to container
docker cp ./backup mongodb:/data/backup

# Restore
docker exec mongodb mongorestore \
  -u admin -p password \
  --authenticationDatabase admin \
  /data/backup

# Restore single database
docker exec mongodb mongorestore \
  -u admin -p password \
  --authenticationDatabase admin \
  --db myapp \
  /data/backup/myapp
```

### Automated Backup Service

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb-data:/data/db

  backup:
    image: mongo:7
    volumes:
      - ./backups:/backups
    environment:
      MONGO_HOST: mongodb
      MONGO_USER: admin
      MONGO_PASSWORD: ${MONGO_ROOT_PASSWORD}
    entrypoint: |
      sh -c 'while true; do
        mongodump --host $$MONGO_HOST \
          -u $$MONGO_USER -p $$MONGO_PASSWORD \
          --authenticationDatabase admin \
          --archive=/backups/backup-$$(date +%Y%m%d-%H%M%S).archive \
          --gzip
        find /backups -name "*.archive" -mtime +7 -delete
        sleep 86400
      done'
    depends_on:
      - mongodb

volumes:
  mongodb-data:
```

## Performance Tuning

### Memory Configuration

MongoDB uses WiredTiger's cache. By default, it uses 50% of RAM minus 1GB.

```yaml
services:
  mongodb:
    image: mongo:7
    command: mongod --wiredTigerCacheSizeGB 1
    deploy:
      resources:
        limits:
          memory: 2G
```

### Index Management

```javascript
// Create index in init script
db = db.getSiblingDB('myapp');

// Single field index
db.users.createIndex({ email: 1 }, { unique: true });

// Compound index
db.orders.createIndex({ userId: 1, createdAt: -1 });

// Text index
db.products.createIndex({ name: "text", description: "text" });
```

## Health Checks

```yaml
services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret
    healthcheck:
      test: |
        mongosh -u admin -p secret --authenticationDatabase admin --eval "db.adminCommand('ping')"
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

## Troubleshooting

### Check Logs

```bash
docker logs mongodb
docker logs --tail 100 -f mongodb
```

### Connect to Shell

```bash
# Interactive shell
docker exec -it mongodb mongosh

# With auth
docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin

# Run command
docker exec mongodb mongosh --eval "db.stats()"
```

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Auth failed | Wrong credentials | Check username/password |
| Connection refused | MongoDB not ready | Wait for startup, use health check |
| Data not persisting | No volume configured | Add volume for /data/db |
| Replica set not working | Members can't reach each other | Check network configuration |
| High memory usage | Cache too large | Set wiredTigerCacheSizeGB |

### Check Server Status

```bash
docker exec mongodb mongosh --eval "
  print('Server status:');
  printjson(db.serverStatus().connections);
  print('Memory:');
  printjson(db.serverStatus().mem);
"
```

## Summary

| Aspect | Development | Production |
|--------|-------------|------------|
| Authentication | Optional | Required |
| Replica Set | Optional (single node) | Required (3+ nodes) |
| Volume | Named volume | Named volume with backup |
| Network | Exposed port | Internal network only |
| Memory | Default | Configured cache size |
| Backups | Manual | Automated |

MongoDB in Docker works well for both development and production. Always enable authentication for any environment exposed to a network, use volumes for persistence, and consider replica sets for production deployments requiring high availability.
