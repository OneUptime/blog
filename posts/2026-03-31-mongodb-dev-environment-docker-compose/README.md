# How to Set Up a MongoDB Development Environment with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker Compose, Development, Environment, Container

Description: Set up a local MongoDB development environment with Docker Compose including authentication, seed data, and a Mongo Express UI for easy management.

---

## Overview

Docker Compose is the fastest way to get a consistent MongoDB development environment running on any machine. A single `docker-compose.yml` file captures the MongoDB version, authentication settings, initial seed data, and optional admin UI so every developer on the team uses the same configuration.

## Basic docker-compose.yml

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:7.0
    container_name: mongo-dev
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: devpassword
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongo_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  mongo-express:
    image: mongo-express:1.0
    container_name: mongo-express-dev
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://admin:devpassword@mongo:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: password
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongo_data:
```

## Seed Data Script

Place JavaScript initialization scripts in the `./mongo-init` directory. MongoDB runs them on first container start.

```javascript
// mongo-init/01-init-db.js
db = db.getSiblingDB("myapp");

db.createUser({
  user: "appuser",
  pwd: "apppassword",
  roles: [{ role: "readWrite", db: "myapp" }],
});

db.createCollection("products");
db.products.insertMany([
  { name: "Widget A", price: 19.99, stock: 100, category: "widgets" },
  { name: "Widget B", price: 29.99, stock: 50, category: "widgets" },
  { name: "Gadget X", price: 99.99, stock: 25, category: "gadgets" },
]);

db.products.createIndex({ category: 1 });
db.products.createIndex({ name: "text" });
print("Database initialized successfully");
```

## .env File for Local Configuration

```bash
MONGO_VERSION=7.0
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=devpassword
MONGO_APP_USER=appuser
MONGO_APP_PASSWORD=apppassword
MONGO_DB=myapp
```

Update `docker-compose.yml` to use these variables:

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
```

## Common Development Commands

```bash
# Start the stack
docker compose up -d

# Connect with mongosh
mongosh "mongodb://appuser:apppassword@localhost:27017/myapp"

# Watch logs
docker compose logs -f mongo

# Reset data (drop volumes)
docker compose down -v

# Open Mongo Express
open http://localhost:8081
```

## Enabling Replica Set for Transactions

Local development often requires a replica set to test transactions and change streams.

```yaml
command: mongod --replSet rs0 --bind_ip_all
```

```bash
# Initialize the replica set after starting
docker exec mongo-dev mongosh -u admin -p devpassword --authenticationDatabase admin --eval "rs.initiate()"
```

## Summary

A well-structured Docker Compose file gives every developer an identical MongoDB environment with authentication, seed data, and a web UI. Add a replica set configuration if your application uses transactions or change streams, and use `.env` files to keep credentials out of version control while sharing configuration across the team.
