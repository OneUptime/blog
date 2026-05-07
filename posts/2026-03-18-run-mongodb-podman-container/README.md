# How to Run MongoDB in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, MongoDB, NoSQL, Database

Description: Learn how to run MongoDB in a Podman container with persistent storage, authentication, and custom configuration.

---

> MongoDB in Podman gives you a flexible NoSQL database running in an isolated, rootless container ready for rapid development.

MongoDB is a document-oriented NoSQL database that stores data in flexible, JSON-like documents. Running it in a Podman container simplifies deployment, ensures environment consistency, and makes it easy to create disposable instances for development and testing. This guide walks through setup, persistence, authentication, and common operations.

---

## Pulling the MongoDB Image

Download the official MongoDB image.

```bash
# Pull the official MongoDB image

podman pull docker.io/library/mongo:7

# Verify the image
podman images | grep mongo
```

## Running a Basic MongoDB Container

Start MongoDB with default settings.

```bash
# Run MongoDB in detached mode
podman run -d \
  --name my-mongo \
  -p 27017:27017 \
  mongo:7

# Confirm the container is running
podman ps

# Connect using mongosh
podman exec -it my-mongo mongosh --eval "db.runCommand({ping: 1})"
```

## Enabling Authentication

Run MongoDB with username and password authentication.

```bash
# Run MongoDB with authentication enabled
podman run -d \
  --name mongo-auth \
  -p 27018:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin-secret \
  mongo:7

# Connect with credentials
podman exec -it mongo-auth mongosh \
  -u admin -p admin-secret --authenticationDatabase admin \
  --eval "db.runCommand({ping: 1})"
```

## Persistent Data with Volumes

Ensure your data survives container restarts.

```bash
# Create a named volume for MongoDB data
podman volume create mongo-data

# Run MongoDB with persistent storage
podman run -d \
  --name mongo-persistent \
  -p 27019:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin-secret \
  -v mongo-data:/data/db:Z \
  mongo:7

# Verify the volume
podman volume inspect mongo-data
```

## Custom MongoDB Configuration

Mount a custom configuration file for advanced tuning.

```bash
# Create a config directory
mkdir -p ~/mongo-config

# Write a custom mongod.conf
cat > ~/mongo-config/mongod.conf <<'EOF'
# MongoDB custom configuration
storage:
  dbPath: /data/db
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5

net:
  port: 27017
  bindIp: 0.0.0.0

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

security:
  authorization: enabled
EOF

# Run MongoDB with custom config
podman run -d \
  --name mongo-custom \
  -p 27020:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin-secret \
  -v ~/mongo-config/mongod.conf:/etc/mongod.conf:Z \
  -v mongo-custom-data:/data/db:Z \
  mongo:7 --config /etc/mongod.conf
```

## Initialization Scripts

Run JavaScript scripts on first startup to seed data.

```bash
# Create an init directory
mkdir -p ~/mongo-init

# Write an initialization script
cat > ~/mongo-init/01-seed.js <<'EOF'
// Switch to the application database
db = db.getSiblingDB('myapp');

// Create a collection with sample documents
db.users.insertMany([
  { username: 'admin', email: 'admin@example.com', role: 'admin', createdAt: new Date() },
  { username: 'demo', email: 'demo@example.com', role: 'user', createdAt: new Date() }
]);

// Create an index on the username field
db.users.createIndex({ username: 1 }, { unique: true });

print('Initialization complete: users collection seeded');
EOF

# Run MongoDB with init scripts
podman run -d \
  --name mongo-init \
  -p 27021:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin-secret \
  -v ~/mongo-init:/docker-entrypoint-initdb.d:Z \
  mongo:7
```

## Backup and Restore

Export and import MongoDB data.

```bash
# Dump all databases using mongodump
podman exec mongo-auth mongodump \
  -u admin -p admin-secret --authenticationDatabase admin \
  --out /tmp/backup

# Copy the backup to the host
podman cp mongo-auth:/tmp/backup ~/mongo-backup

# Restore from backup
podman cp ~/mongo-backup mongo-auth:/tmp/restore
podman exec mongo-auth mongorestore \
  -u admin -p admin-secret --authenticationDatabase admin \
  /tmp/restore
```

## Managing the Container

Common management operations.

```bash
# View MongoDB logs
podman logs my-mongo

# Check database stats
podman exec -it my-mongo mongosh --eval "db.stats()"

# Stop and start
podman stop my-mongo
podman start my-mongo

# Remove containers and volumes
podman rm -f my-mongo mongo-auth mongo-persistent mongo-custom mongo-init
podman volume rm mongo-data mongo-custom-data
```

## Summary

Running MongoDB in a Podman container provides a flexible NoSQL database with straightforward setup and management. Authentication is enabled through environment variables, named volumes handle data persistence, and custom configuration files give you control over memory usage and profiling. Initialization scripts let you seed databases on first launch, and mongodump makes backups simple. Podman's rootless architecture adds a security layer that complements MongoDB's built-in authentication.
