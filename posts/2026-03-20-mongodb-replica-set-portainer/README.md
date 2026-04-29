# How to Deploy a MongoDB Replica Set via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, MongoDB, Replica Set, High Availability, Database

Description: Deploy a MongoDB 3-node replica set with automatic failover and keyfile authentication using Portainer for high-availability data storage.

## Introduction

A MongoDB Replica Set maintains multiple copies of your data across multiple servers. If the primary fails, an automatic election promotes one of the secondaries. Applications using the MongoDB driver automatically reconnect to the new primary. This guide deploys a 3-member replica set using Portainer.

## Step 1: Generate Authentication Key

```bash
# Generate authentication key for replica set members

mkdir -p /opt/mongodb
openssl rand -base64 756 > /opt/mongodb/keyfile
chmod 400 /opt/mongodb/keyfile
chown 999:999 /opt/mongodb/keyfile  # MongoDB container user
```

## Step 2: Deploy the Replica Set

```yaml
# docker-compose.yml - MongoDB Replica Set
version: "3.8"

networks:
  mongo_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24

volumes:
  mongo1_data:
  mongo1_config:
  mongo2_data:
  mongo2_config:
  mongo3_data:
  mongo3_config:

services:
  # MongoDB Primary
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    restart: unless-stopped
    hostname: mongo1
    networks:
      mongo_net:
        ipv4_address: 172.30.0.10
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin_secure_password
      - MONGO_INITDB_DATABASE=admin
    volumes:
      - mongo1_data:/data/db
      - mongo1_config:/data/configdb
      - /opt/mongodb/keyfile:/etc/mongo/keyfile:ro
    command: >
      mongod
      --replSet rs0
      --keyFile /etc/mongo/keyfile
      --bind_ip_all
      --auth
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # MongoDB Secondary 1
  mongo2:
    image: mongo:7.0
    container_name: mongo2
    restart: unless-stopped
    hostname: mongo2
    networks:
      mongo_net:
        ipv4_address: 172.30.0.11
    ports:
      - "27018:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin_secure_password
    volumes:
      - mongo2_data:/data/db
      - mongo2_config:/data/configdb
      - /opt/mongodb/keyfile:/etc/mongo/keyfile:ro
    command: >
      mongod
      --replSet rs0
      --keyFile /etc/mongo/keyfile
      --bind_ip_all
      --auth
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # MongoDB Secondary 2
  mongo3:
    image: mongo:7.0
    container_name: mongo3
    restart: unless-stopped
    hostname: mongo3
    networks:
      mongo_net:
        ipv4_address: 172.30.0.12
    ports:
      - "27019:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin_secure_password
    volumes:
      - mongo3_data:/data/db
      - mongo3_config:/data/configdb
      - /opt/mongodb/keyfile:/etc/mongo/keyfile:ro
    command: >
      mongod
      --replSet rs0
      --keyFile /etc/mongo/keyfile
      --bind_ip_all
      --auth
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # Mongo Express - Admin UI
  mongo_express:
    image: mongo-express:latest
    container_name: mongo_express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_ADMINUSERNAME=admin
      - ME_CONFIG_MONGODB_ADMINPASSWORD=admin_secure_password
      - ME_CONFIG_MONGODB_URL=mongodb://admin:admin_secure_password@mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0&authSource=admin
      - ME_CONFIG_BASICAUTH_USERNAME=meadmin
      - ME_CONFIG_BASICAUTH_PASSWORD=mepassword
    networks:
      - mongo_net
    depends_on:
      mongo1:
        condition: service_healthy
```

## Step 3: Initialize the Replica Set

After deployment, run initialization:

```bash
# Connect to mongo1 and initialize replica set
docker exec -it mongo1 mongosh \
  -u admin \
  -p admin_secure_password \
  --authenticationDatabase admin \
  --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017', priority: 2 },
    { _id: 1, host: 'mongo2:27017', priority: 1 },
    { _id: 2, host: 'mongo3:27017', priority: 1 }
  ]
});
"

# Wait for election
sleep 5

# Check status
docker exec -it mongo1 mongosh \
  -u admin \
  -p admin_secure_password \
  --authenticationDatabase admin \
  --eval "rs.status()"
```

## Step 4: Create Application User

```bash
docker exec -it mongo1 mongosh \
  -u admin \
  -p admin_secure_password \
  --authenticationDatabase admin \
  --eval "
use myapp;
db.createUser({
  user: 'appuser',
  pwd: 'app_secure_password',
  roles: [
    { role: 'readWrite', db: 'myapp' },
    { role: 'read', db: 'myapp' }
  ]
});
"
```

## Step 5: Connect Applications

```python
# Python with pymongo - Replica Set connection
from pymongo import MongoClient
from pymongo.read_preferences import ReadPreference

# Connect to replica set with automatic failover
client = MongoClient(
    "mongodb://appuser:app_secure_password@"
    "mongo1:27017,mongo2:27017,mongo3:27017/"
    "myapp?replicaSet=rs0&authSource=myapp",
    # Read from secondaries to distribute load
    read_preference=ReadPreference.SECONDARY_PREFERRED,
    # Connection pool settings
    maxPoolSize=20,
    minPoolSize=5,
    # Timeout settings
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=2000,
)

db = client.myapp

# Writes go to primary
db.users.insert_one({"name": "Alice"})

# Reads go to secondary (preferred)
users = db.users.find({"name": "Alice"})
```

## Step 6: Test Failover

```bash
# Simulate primary failure
docker pause mongo1

# Check who became primary
docker exec mongo2 mongosh \
  -u admin -p admin_secure_password \
  --authenticationDatabase admin \
  --eval "db.hello()"

# Restore mongo1
docker unpause mongo1

# Mongo1 rejoins as secondary
docker exec mongo1 mongosh \
  -u admin -p admin_secure_password \
  --authenticationDatabase admin \
  --eval "rs.status()"
```

## Step 7: Backup the Replica Set

```bash
#!/bin/bash
# backup-mongodb.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/mongodb"
mkdir -p "$BACKUP_DIR"

# Backup from secondary to avoid impacting primary
docker exec mongo2 mongodump \
  -u admin \
  -p admin_secure_password \
  --authenticationDatabase admin \
  --readPreference secondary \
  --out "/data/backup_$DATE"

# Copy backup from container
docker cp "mongo2:/data/backup_$DATE" "$BACKUP_DIR/"

# Compress
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Rotate (7 days)
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -mtime +7 -delete
echo "MongoDB backup: $DATE"
```

## Conclusion

Your MongoDB Replica Set is now running with automatic failover. The keyfile authentication ensures only authorized members can join the replica set. When the primary fails, MongoDB's Raft-based election promotes a secondary within seconds. Applications using the official MongoDB drivers automatically reconnect and resume operations. Portainer gives you visibility into all three replica set members and makes it easy to check health and view logs.
