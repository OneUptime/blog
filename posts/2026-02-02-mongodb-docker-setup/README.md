# How to Set Up MongoDB with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MongoDB, Docker, Database, DevOps, NoSQL

Description: Learn how to run MongoDB in Docker for development and production, including replica sets, authentication, data persistence, and docker-compose configurations.

---

Running MongoDB in Docker makes local development consistent and production deployments reproducible. You get isolation, easy version upgrades, and no conflicts with system packages. Whether you need a quick dev database or a production replica set, Docker handles it cleanly.

## Quick Start with Docker Run

The simplest way to spin up MongoDB is a single `docker run` command.

```bash
# Pull the official MongoDB image
docker pull mongo:7.0

# Run MongoDB with port mapping and data persistence
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7.0
```

This gives you a MongoDB instance accessible at `localhost:27017`. The volume mount ensures your data survives container restarts.

## Adding Authentication

Never run MongoDB without authentication in any shared environment. Here is how to enable it.

```bash
# Run MongoDB with authentication enabled
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=yourSecurePassword123 \
  mongo:7.0
```

Connect with credentials:

```bash
# Connect to MongoDB with authentication
docker exec -it mongodb mongosh \
  -u admin \
  -p yourSecurePassword123 \
  --authenticationDatabase admin
```

## Environment Variables Reference

The official MongoDB image supports these configuration options:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_INITDB_ROOT_USERNAME` | Admin username created on first run | `admin` |
| `MONGO_INITDB_ROOT_PASSWORD` | Admin password created on first run | `secretpass` |
| `MONGO_INITDB_DATABASE` | Database to create on initialization | `myapp` |

## Docker Compose for Development

For most projects, docker-compose is cleaner than raw docker commands. Save this as `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"           # Expose MongoDB port to host
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: yourSecurePassword123
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongodb_data:/data/db           # Persist database files
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro  # Init script

volumes:
  mongodb_data:
    driver: local
```

Start with `docker-compose up -d` and stop with `docker-compose down`. Add `-v` to remove volumes when tearing down.

## Initialization Scripts

MongoDB runs any `.js` or `.sh` files in `/docker-entrypoint-initdb.d/` on first startup. Use this to create users and seed data.

```javascript
// init-mongo.js - Creates application user and database
// This runs only on first container initialization

db = db.getSiblingDB('myapp');

db.createUser({
  user: 'appuser',
  pwd: 'appPassword456',
  roles: [
    { role: 'readWrite', db: 'myapp' }  // App user can read/write to myapp database
  ]
});

// Create initial collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'createdAt'],
      properties: {
        email: { bsonType: 'string' },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

print('Database initialized successfully');
```

## Setting Up a Replica Set

Replica sets provide data redundancy and high availability. For local development testing, you can run a single-node replica set.

```yaml
# docker-compose.replica.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: mongodb-rs
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: yourSecurePassword123
    volumes:
      - mongodb_data:/data/db
    command: ["--replSet", "rs0", "--bind_ip_all"]  # Enable replica set mode
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongodb_data:
```

After starting, initialize the replica set:

```bash
# Connect and initialize the replica set
docker exec -it mongodb-rs mongosh -u admin -p yourSecurePassword123 --eval "rs.initiate()"

# Verify replica set status
docker exec -it mongodb-rs mongosh -u admin -p yourSecurePassword123 --eval "rs.status()"
```

## Production Replica Set with Three Nodes

For actual production deployments, run at least three nodes for proper failover.

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}  # Use env var for secrets
    volumes:
      - mongo1_data:/data/db
    command: ["--replSet", "rs0", "--bind_ip_all", "--keyFile", "/etc/mongo-keyfile"]
    networks:
      - mongo-network

  mongo2:
    image: mongo:7.0
    container_name: mongo2
    restart: always
    ports:
      - "27018:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo2_data:/data/db
    command: ["--replSet", "rs0", "--bind_ip_all", "--keyFile", "/etc/mongo-keyfile"]
    networks:
      - mongo-network

  mongo3:
    image: mongo:7.0
    container_name: mongo3
    restart: always
    ports:
      - "27019:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo3_data:/data/db
    command: ["--replSet", "rs0", "--bind_ip_all", "--keyFile", "/etc/mongo-keyfile"]
    networks:
      - mongo-network

networks:
  mongo-network:
    driver: bridge

volumes:
  mongo1_data:
  mongo2_data:
  mongo3_data:
```

Initialize the three-node replica set:

```bash
# Initialize with all members
docker exec -it mongo1 mongosh -u admin -p $MONGO_PASSWORD --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 }
  ]
})'
```

## Connecting from Applications

Use connection strings that include authentication and replica set configuration.

```javascript
// Node.js with Mongoose
const mongoose = require('mongoose');

// Connection string for single instance
const singleUri = 'mongodb://appuser:appPassword456@localhost:27017/myapp?authSource=myapp';

// Connection string for replica set
const replicaUri = 'mongodb://appuser:appPassword456@localhost:27017,localhost:27018,localhost:27019/myapp?replicaSet=rs0&authSource=myapp';

mongoose.connect(replicaUri, {
  maxPoolSize: 10,              // Connection pool size
  serverSelectionTimeoutMS: 5000,  // Timeout for server selection
  socketTimeoutMS: 45000       // Socket timeout
}).then(() => {
  console.log('Connected to MongoDB replica set');
}).catch(err => {
  console.error('Connection failed:', err);
});
```

## Backup and Restore

Docker makes backups straightforward with `mongodump` and `mongorestore`.

```bash
# Backup entire database to host machine
docker exec mongodb mongodump \
  -u admin -p yourSecurePassword123 \
  --authenticationDatabase admin \
  --archive=/data/db/backup.archive

# Copy backup from container to host
docker cp mongodb:/data/db/backup.archive ./backup.archive

# Restore from backup
docker exec -i mongodb mongorestore \
  -u admin -p yourSecurePassword123 \
  --authenticationDatabase admin \
  --archive < ./backup.archive
```

## Health Checks and Monitoring

Add health checks to your compose file for proper container orchestration.

```yaml
healthcheck:
  test: ["CMD", "mongosh", "-u", "admin", "-p", "yourSecurePassword123",
         "--authenticationDatabase", "admin", "--eval", "db.adminCommand('ping')"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Fail if no response in 10 seconds
  retries: 3         # Mark unhealthy after 3 failures
  start_period: 40s  # Wait 40s before first check (startup time)
```

For production monitoring, expose MongoDB metrics to Prometheus using the mongodb-exporter sidecar, then ship to your observability platform.

## Common Issues and Fixes

**Permission denied on volume mounts:** MongoDB runs as user `999`. Fix with `chown -R 999:999 ./data` or use named volumes instead of bind mounts.

**Replica set not initializing:** Ensure containers can resolve each other's hostnames. Use Docker networks and service names, not `localhost`.

**Connection refused from app container:** Use the service name (e.g., `mongodb`) as the hostname, not `localhost`, when connecting from another container in the same network.

---

Docker simplifies MongoDB operations from development through production. Start simple with a single container, add authentication, then graduate to replica sets when you need redundancy. Keep your compose files in version control and treat database infrastructure as code.
