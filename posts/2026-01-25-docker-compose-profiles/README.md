# How to Set Up Docker Compose Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, DevOps, Configuration, Development

Description: Learn how to use Docker Compose profiles to selectively start services, manage development tools, and create flexible configurations that adapt to different workflows.

---

Docker Compose profiles let you define groups of services that start together. Instead of maintaining multiple compose files for different scenarios, use profiles to activate specific services based on your current needs.

## Profile Basics

Assign services to profiles using the `profiles` attribute. Services without profiles always start. Services with profiles only start when their profile is active.

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Always starts - no profile assigned
  web:
    image: nginx:alpine
    ports:
      - "80:80"

  # Only starts when 'debug' profile is active
  debugger:
    image: nicolaka/netshoot
    profiles:
      - debug
    network_mode: "service:web"
    command: sleep infinity

  # Only starts when 'monitoring' profile is active
  prometheus:
    image: prom/prometheus:latest
    profiles:
      - monitoring
    ports:
      - "9090:9090"
```

```bash
# Start only the 'web' service (no profile specified)
docker compose up

# Start 'web' and 'debugger' services
docker compose --profile debug up

# Start 'web' and 'prometheus' services
docker compose --profile monitoring up

# Start all services (multiple profiles)
docker compose --profile debug --profile monitoring up
```

## Common Profile Patterns

### Development Tools

Keep development-only services out of production deployments.

```yaml
version: '3.8'

services:
  api:
    image: myapp/api:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432/app

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Development-only services
  pgadmin:
    image: dpage/pgadmin4:latest
    profiles:
      - dev
    ports:
      - "5050:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=dev@local.dev
      - PGADMIN_DEFAULT_PASSWORD=admin

  mailhog:
    image: mailhog/mailhog:latest
    profiles:
      - dev
    ports:
      - "1025:1025"
      - "8025:8025"

  swagger:
    image: swaggerapi/swagger-ui
    profiles:
      - dev
    ports:
      - "8080:8080"
    environment:
      - SWAGGER_JSON=/api/openapi.yaml
    volumes:
      - ./docs:/api:ro

volumes:
  pgdata:
```

```bash
# Production: just the core services
docker compose up -d

# Development: core services plus dev tools
docker compose --profile dev up
```

### Testing Environment

Spin up test infrastructure only when running tests.

```yaml
version: '3.8'

services:
  api:
    image: myapp/api:latest
    depends_on:
      - db
      - redis

  db:
    image: postgres:15

  redis:
    image: redis:7-alpine

  # Test-only services
  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    profiles:
      - test
    depends_on:
      - api
    volumes:
      - ./test-results:/app/results
    command: npm run test:integration

  mock-server:
    image: mockserver/mockserver:latest
    profiles:
      - test
    ports:
      - "1080:1080"
    environment:
      - MOCKSERVER_INITIALIZATION_JSON_PATH=/config/init.json
    volumes:
      - ./mocks:/config:ro

  selenium:
    image: selenium/standalone-chrome:latest
    profiles:
      - test
      - e2e
    ports:
      - "4444:4444"
    shm_size: "2g"
```

```bash
# Run integration tests
docker compose --profile test up --abort-on-container-exit

# Run end-to-end tests (includes selenium)
docker compose --profile test --profile e2e up
```

### Debug and Observability

Enable detailed debugging when troubleshooting issues.

```yaml
version: '3.8'

services:
  api:
    image: myapp/api:latest
    ports:
      - "3000:3000"

  # Debug profile services
  jaeger:
    image: jaegertracing/all-in-one:latest
    profiles:
      - debug
      - observability
    ports:
      - "16686:16686"
      - "6831:6831/udp"

  # Network debugging
  tcpdump:
    image: nicolaka/netshoot
    profiles:
      - debug
    network_mode: "service:api"
    cap_add:
      - NET_ADMIN
    command: tcpdump -i any -w /captures/api.pcap
    volumes:
      - ./captures:/captures

  # Full observability stack
  grafana:
    image: grafana/grafana:latest
    profiles:
      - observability
    ports:
      - "3001:3000"

  loki:
    image: grafana/loki:latest
    profiles:
      - observability
    ports:
      - "3100:3100"
```

## Services in Multiple Profiles

A service can belong to multiple profiles.

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    profiles:
      - monitoring
      - observability
      - production
    ports:
      - "9090:9090"
```

This service starts when any of the three profiles is active.

## Default Profile with COMPOSE_PROFILES

Set default profiles via environment variable to avoid typing them repeatedly.

```bash
# Set default profile for the shell session
export COMPOSE_PROFILES=dev

# Now 'docker compose up' acts like 'docker compose --profile dev up'
docker compose up

# Override with explicit --profile flag
docker compose --profile test up

# Clear the default
unset COMPOSE_PROFILES
```

```bash
# .env file - Set default profiles for the project
COMPOSE_PROFILES=dev,debug
```

## Profile-Dependent Dependencies

Handle dependencies between profiled and non-profiled services.

```yaml
version: '3.8'

services:
  # Always runs
  api:
    image: myapp/api:latest
    depends_on:
      - db

  # Always runs
  db:
    image: postgres:15

  # Profile service that depends on always-running service
  db-seeder:
    image: myapp/seeder:latest
    profiles:
      - seed
    depends_on:
      - db
    command: npm run seed

  # Profile service that another profile service depends on
  metrics-collector:
    image: prom/statsd-exporter:latest
    profiles:
      - monitoring

  # This only works if monitoring profile is also active
  grafana:
    image: grafana/grafana:latest
    profiles:
      - monitoring
    depends_on:
      - metrics-collector
```

```bash
# Both metrics-collector and grafana start together
docker compose --profile monitoring up
```

## Combining Profiles with Override Files

Profiles work alongside override files for maximum flexibility.

```yaml
# docker-compose.yml - Base configuration
version: '3.8'

services:
  api:
    image: myapp/api:latest

  debugger:
    image: nicolaka/netshoot
    profiles:
      - debug
```

```yaml
# docker-compose.override.yml - Development additions
version: '3.8'

services:
  api:
    volumes:
      - ./src:/app/src

  # Add dev tools to debug profile
  profiler:
    image: pyroscope/pyroscope:latest
    profiles:
      - debug
    ports:
      - "4040:4040"
```

The profiler service joins the debug profile through the override file.

## Listing Services by Profile

```bash
# List all services (including those in profiles)
docker compose config --services

# List services that would start without profiles
docker compose ps --services

# List services in specific profile
docker compose --profile debug config --services

# View full resolved configuration
docker compose --profile debug config
```

## Practical Workflow Example

```yaml
# docker-compose.yml - Complete workflow example
version: '3.8'

services:
  # Core application - always runs
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

  api:
    build: ./api
    ports:
      - "3001:3001"
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  # Development tools
  pgadmin:
    image: dpage/pgadmin4:latest
    profiles: [dev]
    ports:
      - "5050:80"

  redis-commander:
    image: rediscommander/redis-commander:latest
    profiles: [dev]
    ports:
      - "8081:8081"

  # Debugging tools
  jaeger:
    image: jaegertracing/all-in-one:latest
    profiles: [debug, observability]
    ports:
      - "16686:16686"

  # CI/CD testing
  test-api:
    build:
      context: ./api
      target: test
    profiles: [test]
    depends_on:
      - db
      - redis
    command: npm test

  # Production monitoring
  prometheus:
    image: prom/prometheus:latest
    profiles: [monitoring, production]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    profiles: [monitoring, production]
    ports:
      - "3002:3000"

volumes:
  pgdata:
```

```bash
# Developer daily work
docker compose --profile dev up

# Debugging a production issue locally
docker compose --profile debug up

# Running CI tests
docker compose --profile test up --abort-on-container-exit --exit-code-from test-api

# Production-like monitoring locally
docker compose --profile monitoring up
```

---

Profiles eliminate the need for multiple compose files by letting you tag services for different scenarios. Keep your base services profile-free so they always start, and add profiles to optional services like dev tools, test runners, and monitoring stacks. Combined with environment variables for default profiles, this creates a smooth workflow that adapts to whatever task you are working on.
