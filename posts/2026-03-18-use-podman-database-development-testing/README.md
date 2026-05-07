# How to Use Podman for Database Development and Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Database, PostgreSQL, MySQL, MongoDB, Testing

Description: Learn how to use Podman to run databases for local development and testing, covering PostgreSQL, MySQL, MongoDB, Redis, data persistence, and test workflows.

---

> Podman makes it easy to spin up and tear down database instances for development and testing without installing database servers on your host machine.

Running databases in containers is one of the most common use cases for container technology in development workflows. Instead of installing PostgreSQL, MySQL, or MongoDB directly on your machine, you can start a containerized instance in seconds, seed it with test data, and destroy it when you are done. Podman handles this well with its rootless container support and pod-based networking. This post covers practical patterns for running databases with Podman during development and testing.

---

## Running PostgreSQL with Podman

PostgreSQL is one of the most widely used relational databases. Here is how to run it with Podman with persistent data:

```bash
# Create a named volume for data persistence

podman volume create pgdata

# Run PostgreSQL with a named volume
podman run -d \
  --name postgres-dev \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=myapp_dev \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16

# Verify it is running
podman logs postgres-dev

# Connect using psql from the container
podman exec -it postgres-dev psql -U devuser -d myapp_dev
```

### Initializing with Seed Data

PostgreSQL images automatically execute `.sql` and `.sh` files placed in `/docker-entrypoint-initdb.d/` when the container starts for the first time. Create an initialization script:

```sql
-- init/01-schema.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

```sql
-- init/02-seed.sql
INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice Johnson'),
  ('bob@example.com', 'Bob Smith'),
  ('carol@example.com', 'Carol Williams');

INSERT INTO orders (user_id, total, status) VALUES
  (1, 99.99, 'completed'),
  (1, 45.50, 'pending'),
  (2, 200.00, 'completed'),
  (3, 75.25, 'shipped');
```

Mount the init directory when starting the container:

```bash
# Run with initialization scripts
podman run -d \
  --name postgres-dev \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=myapp_dev \
  -p 5432:5432 \
  -v ./init:/docker-entrypoint-initdb.d:Z \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16
```

## Running MySQL with Podman

MySQL follows a similar pattern:

```bash
# Create a volume for MySQL data
podman volume create mysqldata

# Run MySQL 8
podman run -d \
  --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=myapp_dev \
  -e MYSQL_USER=devuser \
  -e MYSQL_PASSWORD=devpass \
  -p 3306:3306 \
  -v mysqldata:/var/lib/mysql:Z \
  mysql:8

# Connect to MySQL
podman exec -it mysql-dev mysql -u devuser -pdevpass myapp_dev
```

### Custom MySQL Configuration

You can pass custom configuration by mounting a config file:

```ini
# my-custom.cnf
[mysqld]
# Development-friendly settings
max_connections = 50
innodb_buffer_pool_size = 256M
slow_query_log = 1
slow_query_log_file = slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
general_log = 1
general_log_file = general.log
```

```bash
# Run MySQL with custom configuration
podman run -d \
  --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=myapp_dev \
  -p 3306:3306 \
  -v ./my-custom.cnf:/etc/mysql/conf.d/custom.cnf:Z \
  -v mysqldata:/var/lib/mysql:Z \
  mysql:8
```

## Running MongoDB with Podman

MongoDB is a popular document database that is straightforward to run in a container:

```bash
# Create a volume for MongoDB data
podman volume create mongodata

# Run MongoDB 7
podman run -d \
  --name mongo-dev \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
  -e MONGO_INITDB_DATABASE=myapp_dev \
  -p 27017:27017 \
  -v mongodata:/data/db:Z \
  mongo:7

# Connect using mongosh
podman exec -it mongo-dev mongosh -u admin -p adminpass --authenticationDatabase admin myapp_dev
```

### MongoDB Initialization Script

Create a JavaScript file to seed data on first startup:

```javascript
// init/01-seed.js
// This script runs against the database specified by MONGO_INITDB_DATABASE

db.createCollection("products");

db.products.insertMany([
  {
    name: "Wireless Keyboard",
    price: 59.99,
    category: "electronics",
    inStock: true,
    tags: ["keyboard", "wireless", "bluetooth"]
  },
  {
    name: "USB-C Hub",
    price: 39.99,
    category: "electronics",
    inStock: true,
    tags: ["usb", "hub", "adapter"]
  },
  {
    name: "Desk Lamp",
    price: 29.99,
    category: "office",
    inStock: false,
    tags: ["lamp", "led", "desk"]
  }
]);

// Create indexes for common queries
db.products.createIndex({ category: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ tags: 1 });
```

```bash
# Run MongoDB with the initialization script
podman run -d \
  --name mongo-dev \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
  -e MONGO_INITDB_DATABASE=myapp_dev \
  -p 27017:27017 \
  -v ./init:/docker-entrypoint-initdb.d:Z \
  -v mongodata:/data/db:Z \
  mongo:7
```

## Running Redis with Podman

Redis is commonly used as a cache, session store, or message broker:

```bash
# Run Redis with persistence enabled
podman run -d \
  --name redis-dev \
  -p 6379:6379 \
  -v redisdata:/data:Z \
  redis:7-alpine \
  redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

# Test the connection
podman exec -it redis-dev redis-cli ping
# Should output: PONG

# Set and get a test value
podman exec -it redis-dev redis-cli set mykey "hello"
podman exec -it redis-dev redis-cli get mykey
```

## Using Pods for Multi-Database Setups

Podman pods let you group containers that share a network namespace, similar to Kubernetes pods. This is useful when your application needs multiple databases:

```bash
# Create a pod with all the ports you need
podman pod create \
  --name dev-databases \
  -p 5432:5432 \
  -p 6379:6379 \
  -p 27017:27017

# Add PostgreSQL to the pod
podman run -d \
  --pod dev-databases \
  --name pod-postgres \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16

# Add Redis to the pod
podman run -d \
  --pod dev-databases \
  --name pod-redis \
  -v redisdata:/data:Z \
  redis:7-alpine

# Add MongoDB to the pod
podman run -d \
  --pod dev-databases \
  --name pod-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
  -v mongodata:/data/db:Z \
  mongo:7

# Check the pod status
podman pod ps
podman pod inspect dev-databases
```

Containers inside the same pod can reach each other via `localhost`, since they share the same network namespace.

## Automated Testing with Disposable Databases

For integration tests, you want a fresh database for each test run. Create a script that starts a database, runs tests, and cleans up:

```bash
#!/bin/bash
# test-with-db.sh - Run integration tests with a disposable PostgreSQL instance

set -e

CONTAINER_NAME="test-postgres-$$"
DB_PORT=15432

cleanup() {
  echo "Cleaning up test database..."
  podman rm -f "$CONTAINER_NAME" > /dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Starting test database..."
podman run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=test_db \
  -p "$DB_PORT:5432" \
  postgres:16

# Wait for PostgreSQL to be ready
echo "Waiting for database to accept connections..."
for i in $(seq 1 30); do
  if podman exec "$CONTAINER_NAME" pg_isready -U test -d test_db > /dev/null 2>&1; then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Database failed to start within 30 seconds."
    exit 1
  fi
  sleep 1
done

# Apply migrations
echo "Applying database migrations..."
DATABASE_URL="postgresql://test:test@localhost:$DB_PORT/test_db" \
  npx prisma migrate deploy

# Run the tests
echo "Running integration tests..."
set +e
DATABASE_URL="postgresql://test:test@localhost:$DB_PORT/test_db" \
  npm test -- --testPathPatterns=integration

TEST_EXIT_CODE=$?
set -e

exit $TEST_EXIT_CODE
```

## Database Backups and Restores

Podman makes it easy to back up and restore database data:

```bash
# Back up a PostgreSQL database to a local file
podman exec postgres-dev \
  pg_dump -U devuser myapp_dev > backup.sql

# Restore from backup into the running container
podman exec -i postgres-dev \
  psql -U devuser myapp_dev < backup.sql

# Back up a MongoDB database
podman exec mongo-dev \
  mongodump --uri="mongodb://admin:adminpass@localhost:27017/myapp_dev?authSource=admin" \
  --archive > mongo-backup.archive

# Restore a MongoDB backup
podman exec -i mongo-dev \
  mongorestore --uri="mongodb://admin:adminpass@localhost:27017/?authSource=admin" \
  --archive < mongo-backup.archive
```

## Managing Volumes

Named volumes keep your database data safe across container restarts:

```bash
# List all volumes
podman volume ls

# Inspect a volume to see its mount point
podman volume inspect pgdata

# Remove a volume (destroys all data)
podman volume rm pgdata

# Remove all unused volumes
podman volume prune

# Back up a volume to a tar file
mkdir -p ./backups
podman run --rm \
  -v pgdata:/source:ro \
  -v ./backups:/backup:Z \
  alpine tar czf /backup/pgdata-backup.tar.gz -C /source .
```

## Conclusion

Podman provides a clean workflow for database development and testing. Named volumes persist data across container restarts, init scripts automate schema creation and seeding, and pods group multiple databases under a single network namespace. For testing, disposable containers give you a fresh database for every test run without the overhead of managing installations on your host. The rootless execution model also means you do not need elevated privileges to run any of these database containers.
