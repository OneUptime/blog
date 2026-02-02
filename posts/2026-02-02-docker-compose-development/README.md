# How to Configure Docker Compose for Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Development, DevOps

Description: Master Docker Compose configuration for development environments with practical examples covering services, networking, volumes, environment variables, profiles, and production-ready patterns.

---

Docker Compose has evolved from a simple container orchestration tool into a powerful development environment manager. Configuring it properly makes the difference between a frustrating developer experience and a seamless one. This guide walks you through comprehensive Docker Compose configuration patterns that will transform your development workflow.

## Understanding Docker Compose Configuration

Before diving into configurations, let us understand how Docker Compose processes configuration files and what options are available.

```mermaid
flowchart TD
    subgraph "Configuration Sources"
        DC[docker-compose.yml]
        DCO[docker-compose.override.yml]
        ENV[.env file]
        SHELL[Shell Variables]
    end

    subgraph "Compose Processing"
        MERGE[Configuration Merge]
        INTERP[Variable Interpolation]
        VALID[Validation]
    end

    subgraph "Runtime"
        SERVICES[Services]
        NETWORKS[Networks]
        VOLUMES[Volumes]
    end

    DC --> MERGE
    DCO --> MERGE
    ENV --> INTERP
    SHELL --> INTERP
    MERGE --> INTERP
    INTERP --> VALID
    VALID --> SERVICES
    VALID --> NETWORKS
    VALID --> VOLUMES
```

Docker Compose reads the `docker-compose.yml` file by default. If a `docker-compose.override.yml` file exists in the same directory, Compose automatically merges it with the base configuration. This layered approach enables you to maintain a base configuration while customizing for different environments.

## Project Structure for Development

A well-organized project structure is the foundation of maintainable Docker Compose configurations. Here is a recommended layout that scales from simple to complex projects.

```
myproject/
├── docker-compose.yml              # Base configuration
├── docker-compose.override.yml     # Development overrides (auto-loaded)
├── docker-compose.prod.yml         # Production configuration
├── docker-compose.test.yml         # Testing configuration
├── .env                            # Default environment variables
├── .env.development                # Development-specific variables
├── .env.production                 # Production-specific variables
├── docker/
│   ├── app/
│   │   ├── Dockerfile              # Production Dockerfile
│   │   └── Dockerfile.dev          # Development Dockerfile
│   ├── nginx/
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   └── scripts/
│       ├── entrypoint.sh
│       └── wait-for-it.sh
├── src/
│   └── ...
└── Makefile                        # Convenience commands
```

This structure separates concerns clearly: Docker-related files in the `docker/` directory, environment files at the root, and compose files organized by purpose.

## Base Configuration File

The base `docker-compose.yml` should contain configurations common to all environments. Keep it minimal and environment-agnostic.

The following configuration defines the core services with shared settings that apply across all environments.

```yaml
# docker-compose.yml - Base configuration shared across all environments
version: '3.9'

services:
  # Main application service with common settings
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - backend
      - frontend

  # PostgreSQL database service
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  # Redis cache service
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

Notice that we define health checks at the base level since they apply everywhere. The `depends_on` with conditions ensures services start in the correct order.

## Development Override Configuration

The `docker-compose.override.yml` file automatically loads when you run `docker compose up`. This is where development-specific configurations belong.

This override file adds development tools, volume mounts for hot reloading, and exposed ports for debugging.

```yaml
# docker-compose.override.yml - Development overrides (auto-loaded)
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile.dev
      args:
        - NODE_ENV=development
    ports:
      - "3000:3000"         # Application port
      - "9229:9229"         # Node.js debugger port
    volumes:
      # Mount source code for live reloading
      - ./src:/app/src:cached
      # Mount package files for dependency updates
      - ./package.json:/app/package.json:cached
      - ./package-lock.json:/app/package-lock.json:cached
      # Anonymous volume to preserve node_modules from image
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=app:*
      - LOG_LEVEL=debug
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
    command: npm run dev

  postgres:
    ports:
      - "5432:5432"         # Expose for local database tools
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-devuser}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-devpass}
      - POSTGRES_DB=${POSTGRES_DB:-devdb}
    volumes:
      # Mount initialization scripts
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro

  redis:
    ports:
      - "6379:6379"         # Expose for local Redis tools

  # Development-only services
  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    networks:
      - backend
    depends_on:
      - postgres

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"         # SMTP server
      - "8025:8025"         # Web interface
    networks:
      - backend
```

The `:cached` flag on volume mounts improves performance on macOS and Windows by allowing the host filesystem to be slightly ahead of the container. This is safe for source code that the container only reads.

## Environment Variables Configuration

Environment variables are crucial for configuring applications across different environments. Docker Compose provides multiple ways to manage them.

```mermaid
flowchart LR
    subgraph "Priority Order"
        direction TB
        P1[1. Shell Environment]
        P2[2. Compose File]
        P3[3. env_file Directive]
        P4[4. Dockerfile ENV]
    end

    P1 --> P2 --> P3 --> P4

    subgraph "Application"
        APP[Container Runtime]
    end

    P1 --> APP
```

Create a `.env` file for default values that work in development.

This environment file contains sensible defaults for local development that developers can use immediately.

```bash
# .env - Default development environment variables

# Application Settings
APP_NAME=myproject
APP_PORT=3000
NODE_ENV=development

# Database Configuration
POSTGRES_USER=devuser
POSTGRES_PASSWORD=devpass
POSTGRES_DB=devdb
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PORT=6379

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Feature Flags
ENABLE_SWAGGER=true
ENABLE_DEBUG_ROUTES=true
```

Create a `.env.example` template for team members to copy.

```bash
# .env.example - Template for local environment setup
# Copy this file to .env and fill in your values

# Application Settings
APP_NAME=myproject
APP_PORT=3000
NODE_ENV=development

# Database Configuration
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PORT=6379

# External Services (obtain from team lead)
STRIPE_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Reference environment variables in your compose file with defaults.

This pattern ensures the configuration works even if some variables are not set.

```yaml
services:
  app:
    environment:
      # Use variable with fallback default
      - NODE_ENV=${NODE_ENV:-development}
      # Build connection string from components
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:${POSTGRES_PORT:-5432}/${POSTGRES_DB}
      # Reference without default (required)
      - API_SECRET_KEY=${API_SECRET_KEY}
    env_file:
      # Load base environment file
      - .env
      # Load additional file if it exists (optional override)
      - path: .env.local
        required: false
```

## Networking Configuration

Docker Compose creates a default network for your services, but explicit network configuration provides better isolation and clarity.

```mermaid
graph TB
    subgraph "External"
        USER[Users/Developers]
    end

    subgraph "Frontend Network"
        NGINX[Nginx Proxy]
        APP[Application]
    end

    subgraph "Backend Network"
        APP
        DB[(PostgreSQL)]
        CACHE[(Redis)]
        WORKER[Background Worker]
    end

    USER --> NGINX
    NGINX --> APP
    APP --> DB
    APP --> CACHE
    WORKER --> DB
    WORKER --> CACHE
```

This network configuration isolates the database from direct external access while allowing the application to communicate with all services.

```yaml
# Network configuration for service isolation
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - frontend
    depends_on:
      - app

  app:
    build: .
    networks:
      - frontend        # Receives traffic from nginx
      - backend         # Communicates with data stores
    expose:
      - "3000"          # Only accessible within Docker network

  postgres:
    image: postgres:16-alpine
    networks:
      - backend         # Only accessible by app and worker

  redis:
    image: redis:7-alpine
    networks:
      - backend

  worker:
    build: .
    command: npm run worker
    networks:
      - backend         # Only needs data store access

networks:
  frontend:
    driver: bridge
    name: myproject_frontend
  backend:
    driver: bridge
    internal: true      # No external connectivity
    name: myproject_backend
```

The `internal: true` option on the backend network prevents containers on that network from accessing the internet. This is a security best practice for database containers.

## Volume Configuration Patterns

Volumes persist data and share files between the host and containers. Different use cases require different volume strategies.

```mermaid
flowchart TD
    subgraph "Volume Types"
        NV[Named Volumes<br/>Docker Managed]
        BM[Bind Mounts<br/>Host Path]
        AV[Anonymous Volumes<br/>Temporary]
        TM[tmpfs Mounts<br/>Memory Only]
    end

    subgraph "Use Cases"
        DB[Database Data] --> NV
        SRC[Source Code] --> BM
        NM[node_modules] --> AV
        SEC[Secrets/Temp] --> TM
    end
```

This comprehensive volume configuration demonstrates all volume types and their appropriate uses.

```yaml
version: '3.9'

services:
  app:
    build: .
    volumes:
      # Bind mount: Source code for hot reloading
      - type: bind
        source: ./src
        target: /app/src
        consistency: cached       # Optimizes for read-heavy workloads

      # Bind mount: Configuration files
      - type: bind
        source: ./config
        target: /app/config
        read_only: true           # Prevent accidental modifications

      # Anonymous volume: Preserve node_modules from image
      - /app/node_modules

      # Named volume: Persist build cache
      - build_cache:/app/.cache

      # tmpfs: Sensitive temp files (memory only, never written to disk)
      - type: tmpfs
        target: /app/tmp
        tmpfs:
          size: 100000000         # 100MB limit

  postgres:
    image: postgres:16-alpine
    volumes:
      # Named volume: Database persistence
      - type: volume
        source: postgres_data
        target: /var/lib/postgresql/data

      # Bind mount: Initialization scripts (read-only)
      - type: bind
        source: ./docker/postgres/init
        target: /docker-entrypoint-initdb.d
        read_only: true

      # Bind mount: Custom configuration
      - ./docker/postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro

volumes:
  postgres_data:
    driver: local
    name: myproject_postgres_data

  build_cache:
    driver: local

  # External volume (created outside compose)
  shared_assets:
    external: true
    name: company_shared_assets
```

## Using Docker Compose Profiles

Profiles let you selectively start services based on the active profile. This is perfect for optional development tools or different testing scenarios.

This configuration uses profiles to organize services into logical groups that can be activated as needed.

```yaml
version: '3.9'

services:
  # Core services (always start)
  app:
    build: .
    ports:
      - "3000:3000"

  postgres:
    image: postgres:16-alpine

  redis:
    image: redis:7-alpine

  # Development tools (start with --profile dev)
  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    profiles:
      - dev
      - debug

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "8025:8025"
    profiles:
      - dev

  # Debugging tools (start with --profile debug)
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "6831:6831/udp"
    profiles:
      - debug
      - observability

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    profiles:
      - debug
      - observability

  # Testing infrastructure (start with --profile test)
  test-db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=testdb
    profiles:
      - test

  # CI/CD services (start with --profile ci)
  selenium:
    image: selenium/standalone-chrome:latest
    ports:
      - "4444:4444"
    profiles:
      - ci
      - e2e
```

Use profiles with these commands.

```bash
# Start core services only
docker compose up

# Start with development tools
docker compose --profile dev up

# Start with debugging and observability tools
docker compose --profile debug --profile observability up

# Start everything for CI pipeline
docker compose --profile ci --profile test up
```

You can also set default profiles in your `.env` file.

```bash
# .env
COMPOSE_PROFILES=dev
```

## Health Checks and Dependencies

Proper health checks ensure your services are truly ready before dependent services start. This prevents connection errors during startup.

```mermaid
sequenceDiagram
    participant C as Docker Compose
    participant P as PostgreSQL
    participant R as Redis
    participant A as Application

    C->>P: Start container
    C->>R: Start container

    loop Health Check
        C->>P: pg_isready?
        P-->>C: Not ready
    end

    P-->>C: Ready (healthy)

    loop Health Check
        C->>R: redis-cli ping?
        R-->>C: PONG (healthy)
    end

    C->>A: Start container
    A->>P: Connect
    A->>R: Connect
    A-->>C: Application ready
```

This configuration implements comprehensive health checks with appropriate timing.

```yaml
version: '3.9'

services:
  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s     # Grace period for app startup

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=devuser
      - POSTGRES_PASSWORD=devpass
      - POSTGRES_DB=devdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser -d devdb"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  kafka:
    image: confluentinc/cp-kafka:latest
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 30s

  mongodb:
    image: mongo:7
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 60s     # Elasticsearch needs more startup time
```

## Multi-Stage Development Dockerfiles

A development Dockerfile should optimize for fast rebuilds and debugging capabilities.

This Dockerfile uses multi-stage builds to separate dependency installation from development runtime.

```dockerfile
# docker/app/Dockerfile.dev - Development Dockerfile

# Stage 1: Base image with system dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app

# Stage 2: Dependencies installation
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Stage 3: Development runtime
FROM base AS development
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Install development tools globally
RUN npm install -g nodemon typescript ts-node

# Copy package files (source code mounted via volume)
COPY package*.json ./
COPY tsconfig*.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expose application and debug ports
EXPOSE 3000 9229

# Default command with debugging enabled
CMD ["nodemon", "--inspect=0.0.0.0:9229", "src/index.ts"]
```

## Resource Limits and Reservations

Setting resource limits prevents runaway containers from consuming all system resources during development.

This configuration sets appropriate limits for development while reserving minimum resources for critical services.

```yaml
version: '3.9'

services:
  app:
    build: .
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    image: postgres:16-alpine
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M
    # PostgreSQL-specific memory settings
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=512MB
      -c maintenance_work_mem=64MB

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M
    command: redis-server --maxmemory 200mb --maxmemory-policy allkeys-lru

  elasticsearch:
    image: elasticsearch:8.11.0
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    environment:
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

## Extending and Reusing Configurations

Docker Compose supports extending services from other files, enabling configuration reuse across projects.

This configuration demonstrates the extends feature for sharing common service definitions.

```yaml
# common-services.yml - Shared service definitions
version: '3.9'

services:
  postgres-base:
    image: postgres:16-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-base:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

```yaml
# docker-compose.yml - Project-specific configuration
version: '3.9'

services:
  postgres:
    extends:
      file: common-services.yml
      service: postgres-base
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  redis:
    extends:
      file: common-services.yml
      service: redis-base
    volumes:
      - redis_data:/data
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:

networks:
  backend:
```

## Development Workflow Automation

A Makefile simplifies common development tasks and documents available commands.

This Makefile provides convenient shortcuts for all common Docker Compose operations.

```makefile
# Makefile - Development workflow automation

.PHONY: help up down build rebuild logs shell test clean

# Default target shows help
help:
	@echo "Available commands:"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make build     - Build images"
	@echo "  make rebuild   - Rebuild images without cache"
	@echo "  make logs      - Follow all logs"
	@echo "  make shell     - Open shell in app container"
	@echo "  make test      - Run tests"
	@echo "  make clean     - Remove containers, volumes, and images"

# Start services in background
up:
	docker compose up -d

# Start with development tools
up-dev:
	docker compose --profile dev up -d

# Start with logs in foreground
up-logs:
	docker compose up

# Stop services
down:
	docker compose down

# Stop and remove volumes
down-clean:
	docker compose down -v

# Build images
build:
	docker compose build

# Rebuild without cache
rebuild:
	docker compose build --no-cache

# Pull latest base images and rebuild
update:
	docker compose pull
	docker compose build --pull

# View logs
logs:
	docker compose logs -f

# View logs for specific service
logs-%:
	docker compose logs -f $*

# Open shell in app container
shell:
	docker compose exec app sh

# Open shell in specific service
shell-%:
	docker compose exec $* sh

# Run tests
test:
	docker compose exec app npm test

# Run tests with coverage
test-coverage:
	docker compose exec app npm run test:coverage

# Run linting
lint:
	docker compose exec app npm run lint

# Database operations
db-migrate:
	docker compose exec app npm run migrate

db-seed:
	docker compose exec app npm run seed

db-reset:
	docker compose exec app npm run migrate:reset

db-shell:
	docker compose exec postgres psql -U $${POSTGRES_USER:-devuser} -d $${POSTGRES_DB:-devdb}

# Clean up everything
clean:
	docker compose down -v --rmi local
	docker system prune -f

# Deep clean including all images
clean-all:
	docker compose down -v --rmi all
	docker system prune -af
```

## Debugging Configuration Issues

When Docker Compose behaves unexpectedly, these commands help diagnose problems.

```bash
# View the merged configuration (after all overrides)
docker compose config

# View configuration for a specific service
docker compose config --services

# Validate compose file syntax
docker compose config --quiet

# See what variables are being interpolated
docker compose config | grep -E '^\s+environment:'

# Check which files are being loaded
docker compose --verbose up

# Inspect a running container
docker compose exec app env | sort

# View container resource usage
docker compose stats

# Check container health status
docker compose ps

# View detailed container information
docker inspect $(docker compose ps -q app)
```

## Production Configuration Example

While this guide focuses on development, having a production configuration alongside development ensures consistency.

This production configuration removes development tools and adds production-appropriate settings.

```yaml
# docker-compose.prod.yml - Production overrides
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      args:
        - NODE_ENV=production
    restart: always
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    # No volume mounts for source code
    # No debug ports exposed

  postgres:
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    # No exposed ports

  redis:
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

Run production configuration with:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Best Practices Summary

Following these best practices will make your Docker Compose development experience smooth and maintainable.

**Configuration Organization**
- Keep the base `docker-compose.yml` minimal and environment-agnostic
- Use `docker-compose.override.yml` for development-specific settings
- Store environment variables in `.env` files with sensible defaults
- Use profiles to organize optional services

**Performance Optimization**
- Use `:cached` or `:delegated` volume consistency on macOS and Windows
- Implement proper health checks to avoid connection race conditions
- Set resource limits to prevent runaway containers
- Use multi-stage Dockerfiles for faster rebuilds

**Security Considerations**
- Never commit secrets to version control
- Use internal networks for services that should not be externally accessible
- Run containers as non-root users when possible
- Use read-only mounts for configuration files

**Developer Experience**
- Create a Makefile with common commands
- Document setup steps in a README
- Provide a `.env.example` template
- Enable hot reloading for all application services

## Conclusion

Configuring Docker Compose for development requires balancing developer experience with consistency and maintainability. The patterns covered in this guide provide a solid foundation for projects of any size.

Start with a minimal base configuration and layer on development-specific settings through override files. Use profiles to organize optional services and health checks to ensure reliable startup sequences. With these practices in place, your team will spend less time fighting container issues and more time building features.

The investment in proper Docker Compose configuration pays dividends throughout a project's lifecycle. New team members can start contributing immediately, environment inconsistencies disappear, and the gap between development and production shrinks significantly.
