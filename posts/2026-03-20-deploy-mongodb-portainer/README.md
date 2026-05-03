# How to Deploy MongoDB via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MongoDB, NoSQL, Database, Docker

Description: Learn how to deploy MongoDB via Portainer with persistent storage, authentication, replica set configuration, and Mongo Express for browser-based management.

## MongoDB via Portainer Stack

**Stacks → Add Stack → mongodb**

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=${MONGO_DATABASE}
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
      - ./mongo-init:/docker-entrypoint-initdb.d:ro
    ports:
      - "127.0.0.1:27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: mongod --auth --wiredTigerCacheSizeGB 1

  mongo-express:
    image: mongo-express:latest
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_ADMINUSERNAME=${MONGO_ROOT_USER}
      - ME_CONFIG_MONGODB_ADMINPASSWORD=${MONGO_ROOT_PASSWORD}
      - ME_CONFIG_MONGODB_URL=mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017/
      - ME_CONFIG_BASICAUTH_USERNAME=${ME_BASICAUTH_USER}
      - ME_CONFIG_BASICAUTH_PASSWORD=${ME_BASICAUTH_PASSWORD}
    depends_on:
      mongodb:
        condition: service_healthy

volumes:
  mongodb_data:
  mongodb_config:
```

## Environment Variables

```text
MONGO_ROOT_USER = admin
MONGO_ROOT_PASSWORD = secure-root-password
MONGO_DATABASE = myapp
ME_BASICAUTH_USER = admin
ME_BASICAUTH_PASSWORD = express-password
```

## Initialization Script

```javascript
// mongo-init/init.js
// Runs as root during first start
db = db.getSiblingDB('myapp');

db.createUser({
  user: 'appuser',
  pwd: 'app-password',
  roles: [
    { role: 'readWrite', db: 'myapp' }
  ]
});

// Create collections with validation
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

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
```

## Connecting Application Services

```yaml
services:
  api:
    image: myapi:latest
    environment:
      - MONGODB_URI=mongodb://appuser:app-password@mongodb:27017/myapp
    depends_on:
      mongodb:
        condition: service_healthy
```

## MongoDB Operations via Portainer Console

```javascript
// Connect: docker exec -it mongodb mongosh -u admin -p

// Show databases
show dbs

// Use database
use myapp

// Query documents
db.users.find({ email: /example.com/ }).limit(10)

// Insert document
db.users.insertOne({ email: "test@example.com", createdAt: new Date() })

// Create index
db.users.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })  // TTL 30 days
```

## Backup and Restore

```bash
# Backup

docker exec mongodb mongodump \
  -u admin \
  -p "${MONGO_ROOT_PASSWORD}" \
  --authenticationDatabase admin \
  --out /tmp/backup

docker cp mongodb:/tmp/backup /backup/mongodb-$(date +%Y%m%d)

# Restore
docker cp /backup/mongodb-20260320 mongodb:/tmp/restore
docker exec mongodb mongorestore \
  -u admin \
  -p "${MONGO_ROOT_PASSWORD}" \
  --authenticationDatabase admin \
  --drop \
  /tmp/restore
```

## Memory Tuning

MongoDB's WiredTiger cache defaults to the larger of 50% of (RAM - 1GB) or 256MB. Limit it for containers:

```yaml
command: mongod --auth --wiredTigerCacheSizeGB 1
# Or for 512MB:
command: mongod --auth --wiredTigerCacheSizeGB 0.5
```

## Conclusion

MongoDB via Portainer with Mongo Express provides a complete NoSQL database environment accessible through the browser. The auth flag and environment-variable credential management are essential for any non-development deployment. Use Portainer's stack variables to keep connection strings consistent across services in the same stack.
