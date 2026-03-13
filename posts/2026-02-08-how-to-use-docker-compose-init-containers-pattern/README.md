# How to Use Docker Compose Init Containers Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, Init Containers, Startup, DevOps, Docker, Patterns

Description: Implement the Kubernetes-style init container pattern in Docker Compose to run setup tasks before your main services start.

---

Kubernetes has a first-class init container concept where setup containers run to completion before the main application container starts. Docker Compose does not have a dedicated init container feature, but you can replicate this pattern effectively using `depends_on` with service health checks and completion conditions. This approach lets you run database migrations, generate config files, wait for dependencies, and set permissions before your application boots.

## The Basic Init Container Pattern

The core idea is simple: create a service that runs a setup task and exits, then configure your main service to wait until the setup service completes successfully.

```yaml
# docker-compose.yml - basic init container pattern
version: "3.8"

services:
  # Init container: runs setup and exits
  init-db:
    image: postgres:16-alpine
    environment:
      PGHOST: db
      PGUSER: postgres
      PGPASSWORD: ${DB_PASSWORD}
    # Wait for database to be ready, then run migrations
    command: >
      sh -c "
        echo 'Waiting for database...'
        until pg_isready; do sleep 1; done
        echo 'Running migrations...'
        psql -f /migrations/001_schema.sql
        psql -f /migrations/002_seed.sql
        echo 'Init complete'
      "
    volumes:
      - ./migrations:/migrations:ro
    depends_on:
      db:
        condition: service_healthy

  # Main application - only starts after init completes
  app:
    image: myapp:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/myapp
    depends_on:
      init-db:
        condition: service_completed_successfully

  # Database service with health check
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

The critical piece is `condition: service_completed_successfully`. This tells Docker Compose to wait until the init-db service exits with code 0 before starting the app service.

## Multiple Init Containers with Ordering

You can chain multiple init containers that run in sequence:

```yaml
version: "3.8"

services:
  # Step 1: Wait for all external dependencies
  init-wait:
    image: alpine
    command: >
      sh -c "
        echo 'Checking external services...'
        until nc -z db 5432; do echo 'Waiting for PostgreSQL...'; sleep 2; done
        until nc -z redis 6379; do echo 'Waiting for Redis...'; sleep 2; done
        until nc -z elasticsearch 9200; do echo 'Waiting for Elasticsearch...'; sleep 2; done
        echo 'All dependencies ready'
      "
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Step 2: Run database migrations (after dependencies are ready)
  init-migrate:
    image: myapp:latest
    command: ["python", "manage.py", "migrate", "--no-input"]
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/myapp
    depends_on:
      init-wait:
        condition: service_completed_successfully

  # Step 3: Seed initial data (after migrations)
  init-seed:
    image: myapp:latest
    command: ["python", "manage.py", "loaddata", "initial_data.json"]
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/myapp
    depends_on:
      init-migrate:
        condition: service_completed_successfully

  # Step 4: Build search index (after seed data)
  init-index:
    image: myapp:latest
    command: ["python", "manage.py", "rebuild_index", "--noinput"]
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/myapp
      ELASTICSEARCH_URL: http://elasticsearch:9200
    depends_on:
      init-seed:
        condition: service_completed_successfully

  # Main app - starts only after all init steps complete
  app:
    image: myapp:latest
    ports:
      - "8000:8000"
    command: ["gunicorn", "myapp.wsgi", "--bind", "0.0.0.0:8000"]
    depends_on:
      init-index:
        condition: service_completed_successfully

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
```

The chain runs in order: wait -> migrate -> seed -> index -> app. Each step only starts after the previous one succeeds.

## Permission-Fixing Init Container

A common use case is fixing volume permissions before the main app starts:

```yaml
version: "3.8"

services:
  init-permissions:
    image: alpine
    user: root
    volumes:
      - app_data:/data
      - app_logs:/logs
      - app_uploads:/uploads
    # Set ownership to match the non-root user in the app container
    command: >
      sh -c "
        echo 'Setting volume permissions...'
        chown -R 1000:1000 /data /logs /uploads
        chmod 755 /data /logs /uploads
        chmod 1777 /uploads
        echo 'Permissions set'
      "

  app:
    image: myapp:latest
    user: "1000:1000"
    volumes:
      - app_data:/data
      - app_logs:/logs
      - app_uploads:/uploads
    depends_on:
      init-permissions:
        condition: service_completed_successfully

volumes:
  app_data:
  app_logs:
  app_uploads:
```

## Config Generation Init Container

Generate configuration files dynamically before the app starts:

```yaml
version: "3.8"

services:
  init-config:
    image: alpine
    volumes:
      - nginx_conf:/etc/nginx/conf.d
      - app_conf:/app/config
    environment:
      DOMAIN: ${DOMAIN:-localhost}
      UPSTREAM_PORT: ${UPSTREAM_PORT:-3000}
      WORKER_PROCESSES: ${WORKERS:-auto}
    # Generate nginx config from environment variables
    command: >
      sh -c "
        cat > /etc/nginx/conf.d/default.conf << CONF
        upstream app {
          server app:${UPSTREAM_PORT};
        }
        server {
          listen 80;
          server_name ${DOMAIN};
          location / {
            proxy_pass http://app;
            proxy_set_header Host \$$host;
            proxy_set_header X-Real-IP \$$remote_addr;
          }
        }
        CONF

        cat > /app/config/runtime.json << JSON
        {
          \"domain\": \"${DOMAIN}\",
          \"workers\": \"${WORKER_PROCESSES}\",
          \"generated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }
        JSON

        echo 'Configuration files generated'
      "

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - nginx_conf:/etc/nginx/conf.d:ro
    depends_on:
      init-config:
        condition: service_completed_successfully

  app:
    image: myapp:latest
    volumes:
      - app_conf:/app/config:ro
    depends_on:
      init-config:
        condition: service_completed_successfully

volumes:
  nginx_conf:
  app_conf:
```

## Certificate Generation Init Container

Generate self-signed TLS certificates for development:

```yaml
version: "3.8"

services:
  init-certs:
    image: alpine
    volumes:
      - certs:/certs
    command: >
      sh -c "
        if [ -f /certs/server.crt ]; then
          echo 'Certificates already exist, skipping generation'
          exit 0
        fi

        apk add --no-cache openssl

        openssl req -x509 -nodes -days 365 \
          -newkey rsa:2048 \
          -keyout /certs/server.key \
          -out /certs/server.crt \
          -subj '/CN=${DOMAIN:-localhost}/O=Development/C=US' \
          -addext 'subjectAltName=DNS:${DOMAIN:-localhost},DNS:*.${DOMAIN:-localhost},IP:127.0.0.1'

        chmod 644 /certs/server.crt
        chmod 600 /certs/server.key

        echo 'TLS certificates generated'
      "

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - certs:/etc/nginx/certs:ro
    depends_on:
      init-certs:
        condition: service_completed_successfully

volumes:
  certs:
```

Notice the check at the beginning. If certificates already exist, the init container exits immediately. This makes `docker compose restart` fast because it skips regeneration.

## Error Handling in Init Containers

Init containers should fail loudly so the main service does not start with a broken setup:

```yaml
services:
  init-validate:
    image: alpine
    environment:
      DB_PASSWORD: ${DB_PASSWORD:-}
      API_KEY: ${API_KEY:-}
      REQUIRED_FILE: /config/app.yaml
    volumes:
      - ./config:/config:ro
    command: >
      sh -c "
        errors=0

        # Validate required environment variables
        if [ -z \"$DB_PASSWORD\" ]; then
          echo 'FATAL: DB_PASSWORD is not set'
          errors=\$((errors + 1))
        fi

        if [ -z \"$API_KEY\" ]; then
          echo 'FATAL: API_KEY is not set'
          errors=\$((errors + 1))
        fi

        # Validate required files exist
        if [ ! -f \"$REQUIRED_FILE\" ]; then
          echo \"FATAL: Required file $REQUIRED_FILE not found\"
          errors=\$((errors + 1))
        fi

        # Exit with failure if any validation failed
        if [ \$errors -gt 0 ]; then
          echo \"Validation failed with \$errors error(s)\"
          exit 1
        fi

        echo 'All validations passed'
      "

  app:
    image: myapp:latest
    depends_on:
      init-validate:
        condition: service_completed_successfully
```

If validation fails, the init container exits with code 1, and the app service never starts. This prevents deploying with missing configuration.

## Preventing Init Containers from Restarting

Init containers should run once and stop. Make sure they do not have a restart policy:

```yaml
services:
  init-migrate:
    image: myapp:latest
    restart: "no"           # Never restart init containers
    command: ["migrate"]
    depends_on:
      db:
        condition: service_healthy

  app:
    image: myapp:latest
    restart: unless-stopped   # Main app restarts on failure
    depends_on:
      init-migrate:
        condition: service_completed_successfully
```

The `restart: "no"` policy (which is the default) ensures the init container does not keep rerunning after completing its task.

## Summary

The init container pattern in Docker Compose brings Kubernetes-style startup orchestration to your local and production Docker environments. Use `depends_on` with `condition: service_completed_successfully` to gate your application startup on prerequisite tasks. Chain multiple init containers for complex setup sequences. Always include error handling so failures are obvious, and remember that init containers should run once and exit cleanly.
