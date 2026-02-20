# How to Use Docker Compose for Local Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Development, Local Environment, Microservices

Description: Learn how to use Docker Compose to create reproducible local development environments with databases, caches, and services.

---

Setting up a local development environment should take one command, not a day of installing databases, configuring services, and debugging version mismatches. Docker Compose lets you define your entire development stack in a single file and start it with `docker compose up`.

This guide shows you how to build practical development environments for real applications.

## Why Docker Compose for Development?

```mermaid
graph TD
    A[Without Docker Compose] --> B[Install PostgreSQL locally]
    A --> C[Install Redis locally]
    A --> D[Install Elasticsearch locally]
    A --> E[Configure each service]
    A --> F[Hope versions match production]

    G[With Docker Compose] --> H[docker compose up]
    H --> I[All services running]
    I --> J[Matching production versions]
    I --> K[Isolated from host]
    I --> L[Reproducible for team]
```

## Basic Docker Compose File

```yaml
# docker-compose.yml
# Compose file for a typical web application

services:
  # Your application
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      # Mount source code for hot reloading
      - .:/app
      # Use a named volume for node_modules to avoid conflicts
      - node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://app:secret@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      # Persist database data between restarts
      - postgres_data:/var/lib/postgresql/data
      # Run initialization scripts on first start
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
  node_modules:
```

## Development Dockerfile

Create a development-specific Dockerfile:

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Install development tools
RUN apk add --no-cache git curl

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Do NOT copy source code here
# It will be mounted as a volume for hot reloading

# Expose the development server port
EXPOSE 3000

# Start with hot reloading enabled
CMD ["npm", "run", "dev"]
```

## Full-Stack Development Environment

Here is a complete setup for a microservices application:

```yaml
# docker-compose.yml
services:
  # Frontend (React/Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - frontend_modules:/app/node_modules
    environment:
      - API_URL=http://api:8080
    depends_on:
      - api

  # Backend API (Node.js/Python/Go)
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
      # Debugger port
      - "9229:9229"
    volumes:
      - ./api:/app
      - api_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://app:secret@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - S3_ENDPOINT=http://minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # Worker (background job processing)
  worker:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    # Override the default command for the worker process
    command: ["npm", "run", "worker"]
    volumes:
      - ./api:/app
      - api_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://app:secret@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Elasticsearch
  elasticsearch:
    image: elasticsearch:8.12.0
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  # Mailpit (email testing)
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"    # Web UI
      - "1025:1025"    # SMTP

volumes:
  postgres_data:
  redis_data:
  es_data:
  minio_data:
  frontend_modules:
  api_modules:
```

## Essential Commands

```bash
# Start all services
docker compose up

# Start in detached mode (background)
docker compose up -d

# Start specific services only
docker compose up postgres redis

# Rebuild images after Dockerfile changes
docker compose up --build

# View logs
docker compose logs -f api

# View logs for a specific service
docker compose logs -f --tail=100 api

# Run a one-off command in a service
docker compose exec api npm run migrate

# Open a shell in a running container
docker compose exec postgres psql -U app -d myapp

# Stop all services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v

# Check service status
docker compose ps
```

## Environment-Specific Overrides

Use override files for different scenarios:

```yaml
# docker-compose.override.yml (auto-loaded in development)
services:
  api:
    # Enable debugging in development
    command: ["node", "--inspect=0.0.0.0:9229", "src/index.js"]
    environment:
      - LOG_LEVEL=debug
```

```yaml
# docker-compose.test.yml (for running tests)
services:
  api:
    command: ["npm", "test"]
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://app:secret@postgres:5432/myapp_test

  postgres:
    # Use tmpfs for faster test database
    tmpfs:
      - /var/lib/postgresql/data
```

```bash
# Run tests with the test override
docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit

# Specify a custom env file
docker compose --env-file .env.staging up
```

## Health Checks and Dependency Management

```mermaid
graph LR
    A[postgres<br>healthy] --> C[api<br>starts]
    B[redis<br>started] --> C
    C --> D[frontend<br>starts]
    C --> E[worker<br>starts]
```

```yaml
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy    # Wait for health check to pass
      redis:
        condition: service_started    # Just wait for container to start
      elasticsearch:
        condition: service_healthy

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s              # Grace period before first check

  elasticsearch:
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 30s
```

## Resource Limits

Prevent services from consuming all your machine's resources:

```yaml
services:
  elasticsearch:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M
```

## Useful Patterns

### Database Seeding Script

```sql
-- scripts/init.sql
-- Runs automatically on first postgres startup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert seed data
INSERT INTO users (email, name) VALUES
    ('admin@example.com', 'Admin User'),
    ('dev@example.com', 'Developer')
ON CONFLICT DO NOTHING;
```

### Shared Network for Multiple Projects

```yaml
# Connect to an existing network from another compose project
services:
  api:
    networks:
      - default
      - shared

networks:
  shared:
    external: true
    name: shared-services
```

## Conclusion

Docker Compose transforms local development from a manual, error-prone process into a single-command experience. Your entire team gets identical environments that match production, and new developers can be productive in minutes instead of days.

For monitoring your applications once they move beyond local development, [OneUptime](https://oneuptime.com) provides full-stack observability with uptime monitoring, logs, traces, and incident management to keep your production services running smoothly.
