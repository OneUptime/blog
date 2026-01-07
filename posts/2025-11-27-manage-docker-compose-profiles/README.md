# How to Manage Environment-Specific Configs with Docker Compose Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, DevOps, Automation, Environments, Configuration

Description: A hands-on guide to structuring Docker Compose files with profiles, overrides, and secrets so dev, staging, and prod share one stack file without copy/paste drift.

---

Compose profiles let you ship one `docker-compose.yaml` that adapts to laptops, CI, and production. Instead of juggling three files, toggle services with `--profile` flags and keep configuration consistent via env files, overrides, and secrets.

## 1. Baseline Compose File

This single Compose file defines all services across environments. The `profiles` key controls which services start based on the selected profile(s).

```yaml
# Docker Compose file version - 3.9 supports profiles and other modern features
version: "3.9"

services:
  # Main API service - runs in all environments
  api:
    image: ghcr.io/acme/api:${TAG:-latest}  # Use TAG env var or default to "latest"
    env_file:
      - configs/common.env                   # Shared configuration loaded first
    environment:
      - NODE_ENV=${NODE_ENV:-development}    # Override per environment via env var
    profiles: ["core"]                       # Part of the "core" profile group
    depends_on:
      - db                                   # Wait for db to start (not ready)

  # PostgreSQL database - runs in all environments
  db:
    image: postgres:16-alpine                # Alpine variant for smaller image
    volumes:
      - pgdata:/var/lib/postgresql/data      # Named volume persists data across restarts
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}     # Set via .env file or CI secrets
      - POSTGRES_DB=app                      # Create this database on first run
    profiles: ["core"]                       # Also in core profile

  # Background worker - only runs in staging/prod (async processing)
  worker:
    image: ghcr.io/acme/worker:${TAG:-latest}
    profiles: ["async"]                      # Separate profile - not started by default
    depends_on:
      - api                                  # Worker needs API to be running

  # OpenTelemetry Collector - optional observability
  observability:
    image: ghcr.io/acme/otel-collector:latest
    profiles: ["observability"]              # Only starts when explicitly enabled

# Named volumes persist beyond container lifecycle
volumes:
  pgdata:  # PostgreSQL data survives docker compose down
```

- `profiles` declares which environments should spin up each service.
- Launch core services by default: `docker compose --profile core up`.
- Enable async workers for staging: `docker compose --profile core --profile async up`.

## 2. Layer Env Files and Overrides

Organize environment-specific configuration in separate files. Each environment inherits from common.env and adds its own overrides.

This directory structure separates concerns: shared settings go in common.env, while environment-specific values live in their own files.

```
configs/
  common.env      # Shared settings (log format, timeouts, feature flags)
  dev.env         # Local development (debug mode, local URLs)
  staging.env     # Staging environment (staging APIs, test data)
  prod.env        # Production (real APIs, strict security)
```

Use a thin wrapper script to load the right env file based on the target environment.

This script sources configuration files in order, allowing environment-specific files to override common settings. The set -a flag ensures all variables are exported to child processes.

```bash
#!/usr/bin/env bash
# compose.sh - Wrapper script for environment-aware Docker Compose
# Usage: ./compose.sh up --build
#        COMPOSE_ENV=staging ./compose.sh up -d

set -a                                    # Export all variables automatically
source configs/common.env                 # Load shared configuration first
source "configs/${COMPOSE_ENV:-dev}.env"  # Load environment-specific config (default: dev)
set +a                                    # Stop auto-exporting

# Pass NODE_ENV matching the compose environment and forward all arguments
# "$@" passes all script arguments to docker compose unchanged
NODE_ENV=$COMPOSE_ENV docker compose --profile core "$@"
```

Developers run `./compose.sh up --build`; CI sets `COMPOSE_ENV=staging`.

## 3. Secrets and Certificates

Compose supports file-based secrets that are mounted securely into containers. This keeps sensitive data out of environment variables and image layers.

Secrets are mounted as files at /run/secrets/ inside containers. This approach is more secure than environment variables, which can leak in logs or process listings.

```yaml
# Define secrets at the top level of docker-compose.yaml
secrets:
  db_password:
    # Path changes based on environment - each env has its own secrets folder
    file: ./secrets/${COMPOSE_ENV:-dev}/db_password.txt

services:
  db:
    secrets:
      - db_password  # Mounted at /run/secrets/db_password inside the container
                     # Application reads this file instead of using env vars
```

Mount TLS certs per environment the same way. Keep secret files out of Git (add to `.gitignore`) and load them via vault tooling in CI/CD.

## 4. Compose Overrides for Edge Cases

`docker-compose.override.yaml` applies automatically in dev. Use it for development-specific settings like hot reloading and debug mode.

Override files let you customize behavior without modifying the main compose file. Docker Compose automatically merges docker-compose.override.yaml when present.

```yaml
# docker-compose.override.yaml - automatically applied in development
services:
  api:
    build:
      context: .                     # Build from local source instead of pulling image
      dockerfile: Dockerfile.dev     # Development Dockerfile with dev dependencies
    volumes:
      - ./src:/app                   # Mount source code for hot reloading
                                     # Changes reflect immediately without rebuild
    environment:
      - DEBUG=true                   # Enable verbose logging for development
```

Commit overrides that help every developer; use local overrides (`docker-compose.local.yaml`) for personal tweaks.

## 5. Profiles for Optional Tooling

- `observability`: spins up OpenTelemetry Collector + Jaeger locally (`docker compose --profile observability up -d`).
- `payments-mock`: start mocks only for feature branches needing them.
- `ci`: skip heavy services (e.g., browsers) when running unit tests in pipelines.

Document profiles in `README.md` so teammates know what `compose.sh --profile async up` actually does.

## 6. Testing Matrix in CI

Use GitHub Actions matrix strategy to test different profile combinations in parallel. This ensures all configurations work before deployment.

Matrix builds run multiple profile combinations simultaneously, catching configuration issues early. Each matrix entry runs as an independent job.

```yaml
# .github/workflows/ci.yaml - test all profile combinations
jobs:
  compose-test:
    strategy:
      matrix:
        # Test core profile alone and with async workers
        # Add more combinations as your stack grows
        profile: [core, core+async]
    steps:
      # Run tests with the specified profile combination
      # compose-ci.sh parses COMPOSE_PROFILES and runs docker compose
      - run: COMPOSE_PROFILES="${{ matrix.profile }}" ./scripts/compose-ci.sh
```

`scripts/compose-ci.sh` can parse `COMPOSE_PROFILES` and call `docker compose --profile ... up --exit-code-from api` to fail fast if any container dies.

## 7. Clean Lifecycle

Teach the team three basic commands for consistent container management across the team.

These commands form the daily workflow for working with Compose stacks. The -d flag runs containers in the background, and -v removes volumes for clean resets.

```bash
# Start core services in detached mode (runs in background)
# Logs are still accessible via docker compose logs
./compose.sh up -d

# Add workers to the running stack without stopping existing services
# New containers join the existing network
./compose.sh --profile async up

# Tear down everything including volumes (clean slate for env switching)
# -v flag removes named volumes - use when changing environments or resetting data
# WARNING: This deletes database contents - omit -v to preserve data
./compose.sh down -v
```

Combine with `docker compose ls` to ensure old stacks are torn down before running migrations or e2e tests.

---

Compose profiles turn environment sprawl into predictable toggles. With a shared script, layered env files, and secrets directories, you can run dev/staging/prod parity from the same manifest and keep configuration drift close to zero.
