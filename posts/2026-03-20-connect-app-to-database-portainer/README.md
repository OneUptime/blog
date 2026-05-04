# How to Connect Application Containers to Database Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Database, Networking, Connection Pooling, Best Practice

Description: Connect application containers to database containers in Portainer using shared networks, service names, connection pooling, and health-check dependencies.

## Introduction

Connecting application containers to database containers is fundamental to containerized development. Docker's networking model makes this clean - containers on the same network find each other by service name. This guide covers the patterns, pitfalls, and best practices for container-to-database connections in Portainer.

## Step 1: The Core Pattern - Shared Networks

```yaml
# docker-compose.yml - Application + Database on shared network

version: "3.8"

networks:
  # All services that need to communicate share this network
  app_network:
    driver: bridge

volumes:
  db_data:

services:
  # Web application
  api:
    image: myapp/api:latest
    networks:
      - app_network    # On the shared network
    environment:
      # Use the service name 'database' as hostname
      - DATABASE_URL=postgresql://appuser:apppass@database:5432/myapp
    depends_on:
      database:
        condition: service_healthy  # Wait for DB to be ready

  # PostgreSQL database
  database:
    image: postgres:15-alpine
    networks:
      - app_network    # Same network = DNS resolution works
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppass
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Do NOT expose port to host (security best practice)
    # expose: ["5432"]  # Only accessible within app_network
```

## Step 2: Multi-Tier Application with Multiple Databases

```yaml
# docker-compose.yml - Multi-tier application
version: "3.8"

networks:
  frontend_net:
    driver: bridge
  backend_net:
    driver: bridge

services:
  # Nginx (public-facing)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend_net    # Only frontend network

  # API (bridges both networks)
  api:
    image: myapp/api:latest
    networks:
      - frontend_net    # Accessible by nginx
      - backend_net     # Can reach databases
    environment:
      - POSTGRES_URL=postgresql://app:pass@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
      - MONGODB_URL=mongodb://app:pass@mongodb:27017/myapp

  # Databases (backend only - not accessible from frontend)
  postgres:
    image: postgres:15-alpine
    networks:
      - backend_net     # NOT on frontend_net (isolated)
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine
    networks:
      - backend_net

  mongodb:
    image: mongo:7.0
    networks:
      - backend_net
```

## Step 3: Connection Pooling Patterns

```python
# Python FastAPI - Connection pooling with asyncpg
from contextlib import asynccontextmanager
import asyncpg
import os

# Connection pool (shared across all requests)
pool: asyncpg.Pool = None

@asynccontextmanager
async def lifespan(app):
    global pool
    # Create pool on startup
    pool = await asyncpg.create_pool(
        dsn=os.environ["DATABASE_URL"],
        min_size=5,
        max_size=20,
        command_timeout=60,
        max_inactive_connection_lifetime=300,
    )
    yield
    # Close pool on shutdown
    await pool.close()

app = FastAPI(lifespan=lifespan)

@app.get("/users")
async def get_users():
    async with pool.acquire() as conn:
        return await conn.fetch("SELECT * FROM users LIMIT 100")
```

```javascript
// Node.js - Connection pool with pg
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings
    max: 20,            // Max connections in pool
    min: 2,             // Keep minimum active
    idleTimeoutMillis: 30000,     // Remove idle connections after 30s
    connectionTimeoutMillis: 2000, // Fail after 2s if no connection available
});

// Reuse pool for all queries
const getUserById = async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
};
```

## Step 4: Retry Logic for Database Startup

Databases take time to initialize. Add retry logic for robustness:

```python
# Python - Retry on connection failure during startup
import asyncio
import asyncpg
import os
import logging

logger = logging.getLogger(__name__)

async def create_db_pool(max_retries: int = 10, delay: int = 2) -> asyncpg.Pool:
    """Create database pool with retry logic."""
    for attempt in range(max_retries):
        try:
            pool = await asyncpg.create_pool(
                dsn=os.environ["DATABASE_URL"],
                min_size=2,
                max_size=10,
            )
            logger.info(f"Database connected on attempt {attempt + 1}")
            return pool
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"DB connection failed (attempt {attempt+1}/{max_retries}): {e}")
                await asyncio.sleep(delay)
            else:
                logger.error("Max retries reached. Cannot connect to database.")
                raise
```

## Step 5: Environment Variable Patterns

```yaml
# docker-compose.yml - Using environment files
version: "3.8"

services:
  api:
    image: myapp/api:latest
    env_file:
      - .env.production  # Load from file
    # OR use Portainer secrets
    secrets:
      - db_password
    environment:
      # Template syntax for connection string
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

secrets:
  db_password:
    external: true  # Create in Portainer: Secrets > Add secret
```

```bash
# .env.production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myapp
DB_USER=appuser
DB_PASSWORD=secure_password_here
DB_POOL_SIZE=20
```

## Step 6: Use Portainer's Built-in Secrets

1. In Portainer: navigate to **Secrets** > **Add secret**
2. Name: `db_password`, Value: `your_secure_password`
3. Reference in stack:

```yaml
services:
  api:
    secrets:
      - db_password
    environment:
      # Read from secret file
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    external: true
```

```python
# Read secret from file in application
import os
import asyncpg

with open('/run/secrets/db_password', 'r') as f:
    db_password = f.read().strip()

async def connect_db():
    return await asyncpg.connect(
        host=os.environ['DB_HOST'],
        port=int(os.environ.get('DB_PORT', 5432)),
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=db_password
    )
```

## Step 7: Common Troubleshooting

```bash
# Container can't reach database
# 1. Check they're on the same network
docker network inspect app_network

# 2. Verify DNS resolution
docker exec api_container nslookup database
docker exec api_container ping database

# 3. Check database is accepting connections
docker exec api_container nc -zv database 5432

# 4. Check container logs for connection errors
docker logs api_container --tail=50

# 5. Verify environment variables
docker exec api_container env | grep DATABASE
```

## Conclusion

Connecting application containers to databases in Docker is straightforward when they share a network. Key principles: use service names as hostnames (not IP addresses), implement connection pooling to reuse connections efficiently, use `depends_on` with health checks to ensure the database is ready, and store credentials in Portainer secrets rather than environment variables. Portainer's network inspector and container exec features make debugging connection issues fast.
