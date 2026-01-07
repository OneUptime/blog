# How to Manage Environment-Specific Configs with Docker Compose Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, DevOps, Automation, Environments, Configuration

Description: A hands-on guide to structuring Docker Compose files with profiles, overrides, and secrets so dev, staging, and prod share one stack file without copy/paste drift.

---

Compose profiles let you ship one `docker-compose.yaml` that adapts to laptops, CI, and production. Instead of juggling three files, toggle services with `--profile` flags and keep configuration consistent via env files, overrides, and secrets.

## 1. Baseline Compose File

This single Compose file defines all services across environments. The `profiles` key controls which services start based on the selected profile(s).

```yaml
version: "3.9"

services:
  # Main API service - runs in all environments
  api:
    image: ghcr.io/acme/api:${TAG:-latest}  # Use TAG env var or default to "latest"
    env_file:
      - configs/common.env                   # Shared configuration
    environment:
      - NODE_ENV=${NODE_ENV:-development}    # Override per environment
    profiles: ["core"]                       # Part of the "core" profile
    depends_on:
      - db

  # PostgreSQL database - runs in all environments
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data      # Persist data across restarts
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}     # Set via .env file or CI secrets
      - POSTGRES_DB=app
    profiles: ["core"]

  # Background worker - only runs in staging/prod (async processing)
  worker:
    image: ghcr.io/acme/worker:${TAG:-latest}
    profiles: ["async"]                      # Separate profile for workers
    depends_on:
      - api

  # OpenTelemetry Collector - optional observability
  observability:
    image: ghcr.io/acme/otel-collector:latest
    profiles: ["observability"]              # Only when explicitly enabled

volumes:
  pgdata:  # Named volume for database persistence
```

- `profiles` declares which environments should spin up each service.
- Launch core services by default: `docker compose --profile core up`.
- Enable async workers for staging: `docker compose --profile core --profile async up`.

## 2. Layer Env Files and Overrides

Organize environment-specific configuration in separate files. Each environment inherits from common.env and adds its own overrides.

```
configs/
  common.env      # Shared settings (log format, timeouts, feature flags)
  dev.env         # Local development (debug mode, local URLs)
  staging.env     # Staging environment (staging APIs, test data)
  prod.env        # Production (real APIs, strict security)
```

Use a thin wrapper script to load the right env file based on the target environment.

```bash
#!/usr/bin/env bash
# compose.sh - Wrapper script for environment-aware Docker Compose

set -a                                    # Export all variables automatically
source configs/common.env                 # Load shared configuration first
source "configs/${COMPOSE_ENV:-dev}.env"  # Load environment-specific config (default: dev)
set +a                                    # Stop auto-exporting

# Pass NODE_ENV and forward all arguments to docker compose
NODE_ENV=$COMPOSE_ENV docker compose --profile core "$@"
```

Developers run `./compose.sh up --build`; CI sets `COMPOSE_ENV=staging`.

## 3. Secrets and Certificates

Compose supports file-based secrets that are mounted securely into containers. This keeps sensitive data out of environment variables and image layers.

```yaml
# Define secrets at the top level
secrets:
  db_password:
    file: ./secrets/${COMPOSE_ENV:-dev}/db_password.txt  # Path varies by environment

services:
  db:
    secrets:
      - db_password  # Mounted at /run/secrets/db_password inside the container
```

Mount TLS certs per environment the same way. Keep secret files out of Git (add to `.gitignore`) and load them via vault tooling in CI/CD.

## 4. Compose Overrides for Edge Cases

`docker-compose.override.yaml` applies automatically in dev. Use it for development-specific settings like hot reloading and debug mode.

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev     # Development Dockerfile with dev dependencies
    volumes:
      - ./src:/app                   # Mount source code for hot reloading
    environment:
      - DEBUG=true                   # Enable verbose logging
```

Commit overrides that help every developer; use local overrides (`docker-compose.local.yaml`) for personal tweaks.

## 5. Profiles for Optional Tooling

- `observability`: spins up OpenTelemetry Collector + Jaeger locally (`docker compose --profile observability up -d`).
- `payments-mock`: start mocks only for feature branches needing them.
- `ci`: skip heavy services (e.g., browsers) when running unit tests in pipelines.

Document profiles in `README.md` so teammates know what `compose.sh --profile async up` actually does.

## 6. Testing Matrix in CI

Use GitHub Actions matrix strategy to test different profile combinations in parallel. This ensures all configurations work before deployment.

```yaml
jobs:
  compose-test:
    strategy:
      matrix:
        profile: [core, core+async]    # Test core alone and with workers
    steps:
      # Run tests with the specified profile combination
      - run: COMPOSE_PROFILES="${{ matrix.profile }}" ./scripts/compose-ci.sh
```

`scripts/compose-ci.sh` can parse `COMPOSE_PROFILES` and call `docker compose --profile ... up --exit-code-from api` to fail fast if any container dies.

## 7. Clean Lifecycle

Teach the team three basic commands for consistent container management across the team.

```bash
# Start core services in detached mode (runs in background)
./compose.sh up -d

# Add workers to the running stack
./compose.sh --profile async up

# Tear down everything including volumes (clean slate for env switching)
# -v flag removes named volumes - use when changing environments or resetting data
./compose.sh down -v
```

Combine with `docker compose ls` to ensure old stacks are torn down before running migrations or e2e tests.

---

Compose profiles turn environment sprawl into predictable toggles. With a shared script, layered env files, and secrets directories, you can run dev/staging/prod parity from the same manifest and keep configuration drift close to zero.
