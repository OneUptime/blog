# How to Connect PostgreSQL from Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Docker, Docker Compose, Networking, Containers, DevOps

Description: Learn how to properly configure PostgreSQL connections in Docker Compose environments. This guide covers networking, environment variables, health checks, and troubleshooting common connection issues.

---

Running PostgreSQL in Docker Compose is common for development and testing environments. However, connection issues frequently arise from networking misconfigurations, timing problems, or incorrect connection strings. This guide covers the essential patterns for reliable PostgreSQL connectivity in containerized environments.

## Basic Docker Compose Setup

Start with a minimal working configuration.

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: my_postgres
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    environment:
      DATABASE_URL: postgres://appuser:secretpassword@postgres:5432/myapp
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Key points:
- Use the service name `postgres` as the hostname from other containers
- The `depends_on` ensures ordering but not readiness
- Port mapping `5432:5432` allows host access

## Connection String Formats

PostgreSQL accepts several connection string formats.

```yaml
# URI format (most common)
DATABASE_URL: postgres://user:password@host:5432/database

# With SSL mode
DATABASE_URL: postgres://user:password@host:5432/database?sslmode=disable

# Separate environment variables
services:
  app:
    environment:
      PGHOST: postgres
      PGPORT: 5432
      PGUSER: appuser
      PGPASSWORD: secretpassword
      PGDATABASE: myapp
```

From your application code:

```python
# Python with psycopg2
import os
import psycopg2

# Using DATABASE_URL
conn = psycopg2.connect(os.environ['DATABASE_URL'])

# Using individual variables
conn = psycopg2.connect(
    host=os.environ['PGHOST'],
    port=os.environ['PGPORT'],
    user=os.environ['PGUSER'],
    password=os.environ['PGPASSWORD'],
    database=os.environ['PGDATABASE']
)
```

```javascript
// Node.js with pg
const { Pool } = require('pg');

// Connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Or explicit configuration
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});
```

## Health Checks for Reliable Startup

The `depends_on` directive only waits for container start, not service readiness. Add health checks.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  app:
    build: .
    environment:
      DATABASE_URL: postgres://appuser:secretpassword@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy
```

The `condition: service_healthy` ensures PostgreSQL accepts connections before starting the app.

## Custom Networking

For complex setups, define custom networks.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: myapp
    networks:
      - backend

  app:
    build: .
    environment:
      DATABASE_URL: postgres://appuser:secretpassword@postgres:5432/myapp
    networks:
      - backend
      - frontend

  nginx:
    image: nginx:alpine
    networks:
      - frontend

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

This isolates the database from the frontend network while allowing app access.

## Initialization Scripts

Run SQL scripts on first startup.

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
```

Create initialization scripts:

```sql
-- init-scripts/01-create-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- init-scripts/02-create-schema.sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Scripts run in alphabetical order, only on fresh volumes.

## Connection Retry Logic

Applications should retry connections on startup.

```python
# Python retry pattern
import time
import psycopg2
from psycopg2 import OperationalError

def get_connection(max_retries=5, retry_delay=2):
    """Attempt database connection with retries."""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            print("Database connection established")
            return conn
        except OperationalError as e:
            if attempt < max_retries - 1:
                print(f"Connection attempt {attempt + 1} failed, retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                raise Exception(f"Failed to connect after {max_retries} attempts") from e
```

```javascript
// Node.js retry pattern
const { Pool } = require('pg');

async function connectWithRetry(maxRetries = 5, delayMs = 2000) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      console.log('Database connection established');
      client.release();
      return pool;
    } catch (err) {
      console.log(`Connection attempt ${attempt} failed`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`Failed to connect after ${maxRetries} attempts`);
      }
    }
  }
}
```

## Connecting from Host Machine

Access PostgreSQL from your development machine.

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"  # Maps container port to host
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: myapp
```

Connect using psql or any client:

```bash
# Using psql from host
psql -h localhost -p 5432 -U appuser -d myapp

# Or with connection string
psql "postgres://appuser:secretpassword@localhost:5432/myapp"
```

Use a different host port to avoid conflicts:

```yaml
ports:
  - "5433:5432"  # Host port 5433, container port 5432
```

## Multiple PostgreSQL Instances

Run multiple database instances for different services.

```yaml
version: '3.8'

services:
  postgres_main:
    image: postgres:16
    environment:
      POSTGRES_USER: main_user
      POSTGRES_PASSWORD: main_pass
      POSTGRES_DB: main_db
    volumes:
      - postgres_main_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  postgres_analytics:
    image: postgres:16
    environment:
      POSTGRES_USER: analytics_user
      POSTGRES_PASSWORD: analytics_pass
      POSTGRES_DB: analytics_db
    volumes:
      - postgres_analytics_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  app:
    build: .
    environment:
      MAIN_DATABASE_URL: postgres://main_user:main_pass@postgres_main:5432/main_db
      ANALYTICS_DATABASE_URL: postgres://analytics_user:analytics_pass@postgres_analytics:5432/analytics_db

volumes:
  postgres_main_data:
  postgres_analytics_data:
```

## Troubleshooting Connection Issues

Common problems and solutions.

```bash
# Check if postgres container is running
docker compose ps

# View postgres logs
docker compose logs postgres

# Test connectivity from another container
docker compose exec app sh -c "nc -zv postgres 5432"

# Test with psql from app container
docker compose exec app sh -c "PGPASSWORD=secretpassword psql -h postgres -U appuser -d myapp -c 'SELECT 1'"

# Check network configuration
docker network ls
docker network inspect myapp_default
```

Common error messages:

```bash
# "connection refused" - PostgreSQL not ready yet
# Solution: Add health check and depends_on condition

# "could not translate host name" - Wrong hostname
# Solution: Use the service name, not container_name

# "password authentication failed" - Credentials mismatch
# Solution: Verify POSTGRES_USER and POSTGRES_PASSWORD match connection string

# "database does not exist" - Database not created
# Solution: Ensure POSTGRES_DB is set, or create database manually
```

## Production Considerations

For production-like environments:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER_FILE: /run/secrets/pg_user
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
      POSTGRES_DB: myapp
    secrets:
      - pg_user
      - pg_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$(cat /run/secrets/pg_user)"]
      interval: 10s
      timeout: 5s
      retries: 5

secrets:
  pg_user:
    file: ./secrets/pg_user.txt
  pg_password:
    file: ./secrets/pg_password.txt

volumes:
  postgres_data:
```

Use Docker secrets instead of environment variables for sensitive data.

## Persisting Data Correctly

Ensure data survives container restarts.

```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      # Named volume (recommended)
      - postgres_data:/var/lib/postgresql/data

      # Or bind mount for direct access
      # - ./pgdata:/var/lib/postgresql/data

volumes:
  postgres_data:
    # Volume will persist across docker compose down
    # Use docker compose down -v to remove volumes
```

Check volume contents:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect myapp_postgres_data

# Backup data
docker compose exec postgres pg_dump -U appuser myapp > backup.sql
```

Docker Compose provides a reliable way to run PostgreSQL for development and testing. Use health checks to ensure proper startup ordering, retry logic in your application, and named volumes for data persistence. These patterns create a robust local database environment that closely mirrors production setups.
