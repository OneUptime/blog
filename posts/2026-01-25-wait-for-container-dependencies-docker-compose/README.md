# How to Wait for Container Dependencies in Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, DevOps, Troubleshooting, Microservices

Description: Learn how to properly handle container startup order and wait for dependencies like databases to be ready before starting your application in Docker Compose.

---

Your application crashes on startup because the database is not ready yet. The container started, but PostgreSQL is still initializing. Docker Compose's `depends_on` only waits for the container to start, not for the service inside to be ready. This guide shows you how to solve this problem properly.

## The Problem with depends_on

The `depends_on` directive controls startup order, but it does not wait for services to be healthy:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
```

Docker Compose starts `postgres` before `web`, but your web app might crash because PostgreSQL takes 5-10 seconds to initialize and accept connections.

```mermaid
sequenceDiagram
    participant Compose
    participant Postgres
    participant Web

    Compose->>Postgres: Start container
    Postgres-->>Compose: Container running
    Compose->>Web: Start container
    Web->>Postgres: Connect attempt
    Postgres-->>Web: Connection refused
    Web->>Web: Crash!
    Note over Postgres: Still initializing...
```

## Solution 1: Health Checks with depends_on Condition

Docker Compose version 2.1+ supports health checks with `depends_on` conditions:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      # pg_isready checks if PostgreSQL accepts connections
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Now Compose waits until the health check passes before starting dependent services.

### Health Check Options Explained

```yaml
healthcheck:
  # Command to run to check health
  test: ["CMD", "curl", "-f", "http://localhost/health"]

  # How often to run the check
  interval: 10s

  # How long to wait for check to complete
  timeout: 5s

  # Number of consecutive failures before marking unhealthy
  retries: 3

  # Grace period before health checks start
  # Useful for services that need initialization time
  start_period: 30s
```

## Solution 2: Wait Scripts

Sometimes you need more control than health checks provide. A wait script inside your application container polls dependencies before starting the main process.

### Using wait-for-it

The popular `wait-for-it.sh` script waits for a TCP port to be available:

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install wait-for-it script
RUN apt-get update && apt-get install -y wget \
    && wget -O /usr/local/bin/wait-for-it.sh \
       https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh \
    && chmod +x /usr/local/bin/wait-for-it.sh \
    && apt-get clean

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Wait for postgres on port 5432, then start the app
CMD ["wait-for-it.sh", "postgres:5432", "--", "python", "app.py"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    depends_on:
      - postgres
    # Override to add multiple waits
    command: >
      sh -c "wait-for-it.sh postgres:5432 --timeout=30 --strict &&
             wait-for-it.sh redis:6379 --timeout=30 --strict &&
             python app.py"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7
```

### Using dockerize

Dockerize offers more flexibility with template substitution and multiple checks:

```dockerfile
# Dockerfile
FROM golang:1.21 as builder

# Build dockerize from source
RUN go install github.com/jwilder/dockerize@latest

FROM python:3.11-slim

# Copy dockerize binary
COPY --from=builder /go/bin/dockerize /usr/local/bin/

WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

# Wait for multiple services with timeout
CMD ["dockerize", \
     "-wait", "tcp://postgres:5432", \
     "-wait", "tcp://redis:6379", \
     "-timeout", "60s", \
     "python", "app.py"]
```

## Solution 3: Application-Level Retry Logic

The most resilient approach is building retry logic into your application. This handles not just startup but also reconnection after temporary failures.

### Python with Retry Decorator

```python
# db.py
import time
import psycopg2
from functools import wraps

def retry_connection(max_retries=5, delay=2):
    """Decorator that retries database connection on failure."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except psycopg2.OperationalError as e:
                    retries += 1
                    if retries == max_retries:
                        raise
                    print(f"Database not ready, retry {retries}/{max_retries}")
                    time.sleep(delay * retries)  # Exponential backoff
        return wrapper
    return decorator

@retry_connection(max_retries=10, delay=2)
def get_db_connection():
    """Create database connection with retry logic."""
    return psycopg2.connect(
        host="postgres",
        port=5432,
        user="postgres",
        password="secret",
        database="myapp"
    )

# Usage in your app
if __name__ == "__main__":
    conn = get_db_connection()
    print("Connected to database!")
```

### Node.js with Async Retry

```javascript
// db.js
const { Pool } = require('pg');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry(config, maxRetries = 10, delay = 2000) {
  const pool = new Pool(config);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test the connection
      const client = await pool.connect();
      console.log('Database connected successfully');
      client.release();
      return pool;
    } catch (error) {
      console.log(`Database connection attempt ${attempt}/${maxRetries} failed`);

      if (attempt === maxRetries) {
        throw new Error(`Failed to connect after ${maxRetries} attempts`);
      }

      // Exponential backoff
      await sleep(delay * attempt);
    }
  }
}

// Usage
const dbConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'myapp'
};

module.exports = { connectWithRetry, dbConfig };
```

## Solution 4: Entrypoint Scripts

Create a custom entrypoint that handles all dependency checks:

```bash
#!/bin/bash
# entrypoint.sh

set -e

# Function to wait for a service
wait_for_service() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    local start_time=$(date +%s)

    echo "Waiting for $host:$port..."

    while ! nc -z "$host" "$port" 2>/dev/null; do
        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $timeout ]; then
            echo "Timeout waiting for $host:$port"
            exit 1
        fi
        sleep 1
    done

    echo "$host:$port is available"
}

# Wait for all dependencies
wait_for_service postgres 5432 60
wait_for_service redis 6379 30
wait_for_service elasticsearch 9200 60

# Run database migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Start the application
echo "Starting application..."
exec "$@"
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y netcat-openbsd && apt-get clean

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Make entrypoint executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

## Health Checks for Common Services

### MySQL

```yaml
mysql:
  image: mysql:8
  environment:
    MYSQL_ROOT_PASSWORD: secret
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### MongoDB

```yaml
mongo:
  image: mongo:6
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Elasticsearch

```yaml
elasticsearch:
  image: elasticsearch:8.11.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  healthcheck:
    test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -vq '\"status\":\"red\"'"]
    interval: 10s
    timeout: 5s
    retries: 10
    start_period: 30s
```

### RabbitMQ

```yaml
rabbitmq:
  image: rabbitmq:3-management
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Kafka

```yaml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  healthcheck:
    test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
    interval: 10s
    timeout: 10s
    retries: 10
    start_period: 30s
```

## Complete Example

Here is a full example bringing all the concepts together:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    build: ./worker
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

## Summary

Docker Compose's basic `depends_on` only ensures container start order, not service readiness. For reliable dependency handling, combine health checks with the `condition: service_healthy` option. Add application-level retry logic as a second layer of defense for production systems. For complex scenarios, use entrypoint scripts that verify all dependencies before starting your main process. This layered approach handles both startup sequencing and runtime reconnection after temporary failures.
