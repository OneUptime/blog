# How to Set Up PostgreSQL with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Docker, Database, DevOps, Containers

Description: Learn how to run PostgreSQL in Docker for development and production, including data persistence, configuration, backups, and docker-compose setups.

---

Running PostgreSQL in Docker simplifies database management significantly. You get consistent environments across development, staging, and production. No more "works on my machine" issues when your teammate uses a different Postgres version. Spinning up isolated database instances for testing becomes trivial, and cleanup is just a `docker rm` away.

Let's walk through everything you need to get PostgreSQL running in containers.

## Quick Start with Docker Run

The fastest way to get PostgreSQL running:

```bash
# Pull the official PostgreSQL image
docker pull postgres:16

# Run a basic PostgreSQL container
docker run --name my-postgres \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  -d postgres:16
```

This starts PostgreSQL 16 with a custom user, password, and database. The `-p 5432:5432` flag maps the container port to your host, letting you connect from your local machine.

**Warning**: This setup loses all data when the container is removed. For anything beyond quick testing, you need volumes.

## Environment Variables Reference

PostgreSQL's Docker image accepts several environment variables for configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Password for the superuser (required unless using trust auth) |
| `POSTGRES_USER` | No | Superuser name (defaults to `postgres`) |
| `POSTGRES_DB` | No | Default database name (defaults to `POSTGRES_USER` value) |
| `PGDATA` | No | Location of database files inside container (defaults to `/var/lib/postgresql/data`) |
| `POSTGRES_INITDB_ARGS` | No | Arguments passed to `initdb` during initialization |
| `POSTGRES_HOST_AUTH_METHOD` | No | Authentication method for host connections |

## Adding Data Persistence with Volumes

To keep your data safe across container restarts and removals, mount a volume:

```bash
# Create a named volume for PostgreSQL data
docker volume create pgdata

# Run PostgreSQL with persistent storage
docker run --name my-postgres \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  -d postgres:16
```

Now your data survives container removal. You can also use a bind mount to store data in a specific directory on your host:

```bash
# Using a bind mount instead of a named volume
docker run --name my-postgres \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_PASSWORD=mypassword \
  -v /path/to/your/data:/var/lib/postgresql/data \
  -p 5432:5432 \
  -d postgres:16
```

## Docker Compose Setup

For real projects, docker-compose makes managing your database much easier. Here's a production-ready setup:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: myapp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: myapp
    volumes:
      # Persist database data
      - pgdata:/var/lib/postgresql/data
      # Mount custom configuration (optional)
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
      # Initialization scripts run on first startup
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

Start it with:

```bash
docker-compose up -d
```

The healthcheck ensures dependent services wait until PostgreSQL is actually ready to accept connections, not just when the container starts.

## Initialization Scripts

PostgreSQL's Docker image runs any `.sql` or `.sh` files in `/docker-entrypoint-initdb.d/` during first-time initialization. This is perfect for creating tables, loading seed data, or setting up additional databases:

```sql
-- init-scripts/01-create-tables.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Scripts run in alphabetical order, so prefix them with numbers to control execution sequence.

## Custom PostgreSQL Configuration

For performance tuning, create a custom `postgresql.conf`:

```ini
# postgresql.conf - Custom configuration
# Memory settings
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
maintenance_work_mem = 128MB

# Logging
log_statement = 'all'
log_duration = on
log_min_duration_statement = 1000

# Connection settings
max_connections = 100
```

Mount it in your compose file or pass it via command:

```bash
docker run --name my-postgres \
  -e POSTGRES_PASSWORD=mypassword \
  -v pgdata:/var/lib/postgresql/data \
  -v ./postgresql.conf:/etc/postgresql/postgresql.conf \
  -p 5432:5432 \
  -d postgres:16 \
  -c 'config_file=/etc/postgresql/postgresql.conf'
```

## Connecting from Your Application

Once PostgreSQL is running, connect using standard connection strings:

```python
# Python with psycopg2
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="myapp",
    user="myuser",
    password="mypassword"
)
```

```javascript
// Node.js with pg
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'myuser',
  password: 'mypassword'
});
```

When connecting from another container in the same Docker network, use the service name as the host:

```javascript
// From another container in the same docker-compose network
const pool = new Pool({
  host: 'postgres',  // Service name from docker-compose.yml
  port: 5432,
  database: 'myapp',
  user: 'myuser',
  password: 'mypassword'
});
```

## Database Backups

Regular backups are essential. Here's how to backup and restore with Docker:

```bash
# Create a backup using pg_dump
docker exec my-postgres pg_dump -U myuser myapp > backup.sql

# Compressed backup
docker exec my-postgres pg_dump -U myuser myapp | gzip > backup.sql.gz

# Restore from backup
cat backup.sql | docker exec -i my-postgres psql -U myuser myapp

# Restore compressed backup
gunzip -c backup.sql.gz | docker exec -i my-postgres psql -U myuser myapp
```

For automated backups, add a backup service to your compose file:

```yaml
# Add to docker-compose.yml
services:
  backup:
    image: postgres:16
    depends_on:
      - postgres
    volumes:
      - ./backups:/backups
    entrypoint: /bin/bash
    command: >
      -c 'while true; do
        pg_dump -h postgres -U myuser myapp > /backups/backup_$$(date +%Y%m%d_%H%M%S).sql;
        sleep 86400;
      done'
    environment:
      PGPASSWORD: mypassword
```

## Useful Commands

Some commands you'll use regularly:

```bash
# Access psql shell
docker exec -it my-postgres psql -U myuser -d myapp

# View logs
docker logs my-postgres

# Check if PostgreSQL is ready
docker exec my-postgres pg_isready -U myuser

# View running queries
docker exec my-postgres psql -U myuser -d myapp -c "SELECT * FROM pg_stat_activity;"

# Stop and remove the container (data persists in volume)
docker stop my-postgres && docker rm my-postgres

# Remove the volume (destroys all data)
docker volume rm pgdata
```

## Wrapping Up

Running PostgreSQL in Docker gives you reproducible database environments that you can version control and share across your team. Start with the basic docker-compose setup, add initialization scripts for your schema, and set up automated backups. As your needs grow, tune the configuration for your workload.

The key things to remember: always use volumes for data persistence, leverage healthchecks for service dependencies, and keep your backups outside the container. With these fundamentals in place, you have a solid foundation for both development and production PostgreSQL deployments.
