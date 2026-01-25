# How to Run Django Migrations with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Django, Python, Database, DevOps

Description: Learn different approaches to running Django database migrations in Docker Compose environments, from manual commands to automated startup scripts.

---

Running Django migrations in a containerized environment requires careful timing. The database container needs to be ready before migrations run, and migrations need to complete before your application serves requests. This guide covers the different approaches and when to use each one.

## The Challenge

When you run `docker compose up`, containers start roughly simultaneously. Your Django app might try to run migrations before PostgreSQL finishes initializing, causing errors like:

```
django.db.utils.OperationalError: could not connect to server: Connection refused
```

Or migrations might run in parallel from multiple container instances, causing race conditions.

## Method 1: Manual Migration Command

The simplest approach is running migrations manually after your database is ready:

```bash
# Start the database first
docker compose up -d postgres

# Wait a moment for it to initialize
sleep 5

# Run migrations
docker compose run --rm web python manage.py migrate

# Start the rest of the stack
docker compose up -d
```

Or run migrations against an already running stack:

```bash
# Run migrations in the existing web container
docker compose exec web python manage.py migrate
```

### Using docker compose run vs exec

```bash
# run: Creates a new container instance
# Good for one-off commands, container is removed after
docker compose run --rm web python manage.py migrate

# exec: Runs in an existing container
# Good when the service is already running
docker compose exec web python manage.py migrate
```

## Method 2: Entrypoint Script

Automatically run migrations when the container starts:

```bash
#!/bin/bash
# entrypoint.sh

set -e

# Function to wait for the database
wait_for_db() {
    echo "Waiting for database..."
    while ! nc -z $DB_HOST $DB_PORT; do
        sleep 1
    done
    echo "Database is ready!"
}

# Wait for the database to be available
wait_for_db

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files (if needed)
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Execute the main command (passed as arguments)
exec "$@"
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install netcat for database health check
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make entrypoint executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Method 3: Dedicated Migration Service

For more control, use a separate service just for migrations:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Migration service runs once and exits
  migrate:
    build: .
    command: python manage.py migrate --noinput
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy

  # Web service waits for migrations
  web:
    build: .
    command: gunicorn myproject.wsgi:application --bind 0.0.0.0:8000
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

With this setup:
1. PostgreSQL starts and becomes healthy
2. The `migrate` service runs and completes
3. The `web` service starts only after migrations succeed

## Method 4: Makefile for Common Commands

Create a Makefile to standardize your workflow:

```makefile
# Makefile

.PHONY: help up down migrate shell test

help:
	@echo "Available commands:"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make migrate   - Run database migrations"
	@echo "  make shell     - Open Django shell"
	@echo "  make test      - Run tests"

up:
	docker compose up -d

down:
	docker compose down

migrate:
	docker compose run --rm web python manage.py migrate

makemigrations:
	docker compose run --rm web python manage.py makemigrations

shell:
	docker compose run --rm web python manage.py shell

test:
	docker compose run --rm web python manage.py test

logs:
	docker compose logs -f web
```

Usage:

```bash
# Run migrations
make migrate

# Create new migrations
make makemigrations

# Open Django shell
make shell
```

## Method 5: Init Container Pattern

Similar to Kubernetes init containers, use Docker Compose profiles:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Init services run first (with init profile)
  db-init:
    build: .
    command: python manage.py migrate --noinput
    profiles:
      - init
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy

  # Main services
  web:
    build: .
    command: gunicorn myproject.wsgi:application --bind 0.0.0.0:8000
    ports:
      - "8000:8000"
    profiles:
      - default
    environment:
      DATABASE_URL: postgres://postgres:secret@postgres:5432/myapp
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# First, run init services (including migrations)
docker compose --profile init up db-init

# Then start the main application
docker compose up -d
```

## Handling Multiple Replicas

When scaling your web service, you need to ensure migrations run only once:

```yaml
# docker-compose.yml
version: '3.8'

services:
  migrate:
    build: .
    command: python manage.py migrate --noinput
    deploy:
      replicas: 1  # Always exactly one
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build: .
    command: gunicorn myproject.wsgi:application --bind 0.0.0.0:8000
    deploy:
      replicas: 3  # Scale as needed
    depends_on:
      migrate:
        condition: service_completed_successfully
```

### Using File Locks

If you must run migrations from the entrypoint but have multiple replicas:

```bash
#!/bin/bash
# entrypoint.sh with locking

LOCK_FILE="/tmp/migration.lock"

# Try to acquire lock
if mkdir "$LOCK_FILE" 2>/dev/null; then
    echo "Acquired migration lock, running migrations..."
    python manage.py migrate --noinput
    echo "Migrations complete"
    # Keep lock for a moment so other containers see it
    sleep 5
    rmdir "$LOCK_FILE"
else
    echo "Another instance is running migrations, waiting..."
    while [ -d "$LOCK_FILE" ]; do
        sleep 2
    done
    echo "Migrations completed by another instance"
fi

exec "$@"
```

For production, use a distributed lock (Redis, database advisory lock, or Consul).

## Production Best Practices

### Check Migration Status First

```bash
#!/bin/bash
# entrypoint.sh

# Show pending migrations without applying them
echo "Checking migration status..."
python manage.py showmigrations --plan | grep -E "^\[ \]" && {
    echo "Pending migrations found, applying..."
    python manage.py migrate --noinput
} || {
    echo "No pending migrations"
}

exec "$@"
```

### Graceful Handling of Migration Failures

```python
# settings.py - Database connection retry
import time
from django.db import connection
from django.db.utils import OperationalError

def wait_for_database(max_retries=30, delay=2):
    """Wait for database to become available."""
    for attempt in range(max_retries):
        try:
            connection.ensure_connection()
            return True
        except OperationalError:
            print(f"Database not ready (attempt {attempt + 1}/{max_retries})")
            time.sleep(delay)
    raise Exception("Could not connect to database")
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
      - name: Build and push image
        run: docker build -t myapp:latest .

      - name: Run migrations
        run: |
          docker compose run --rm migrate python manage.py migrate --noinput

      - name: Deploy new version
        run: |
          docker compose up -d --no-deps web
```

## Troubleshooting

### Migration Stuck or Slow

```bash
# Check migration status
docker compose exec web python manage.py showmigrations

# See what SQL would run
docker compose exec web python manage.py sqlmigrate app_name migration_name

# Check for locks in PostgreSQL
docker compose exec postgres psql -U postgres -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

### Database Not Ready Errors

```bash
# Check database logs
docker compose logs postgres

# Test database connectivity manually
docker compose exec web python -c "
import psycopg2
conn = psycopg2.connect('postgres://postgres:secret@postgres:5432/myapp')
print('Connected!')
conn.close()
"
```

### Conflicting Migrations

```bash
# Show migration conflicts
docker compose exec web python manage.py showmigrations --list

# Merge conflicting migrations
docker compose exec web python manage.py makemigrations --merge
```

## Summary

Running Django migrations in Docker Compose requires coordinating the timing between your database and application containers. For development, manual migrations with `docker compose run` work well. For automated deployments, use either an entrypoint script that waits for the database and runs migrations, or a dedicated migration service with `condition: service_completed_successfully`. Always use health checks on your database container to ensure it is truly ready to accept connections before running migrations. In production with multiple replicas, ensure migrations run exactly once using a dedicated service or distributed locking mechanism.
