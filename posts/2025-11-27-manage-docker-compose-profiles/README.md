# How to Manage Environment-Specific Configs with Docker Compose Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, DevOps, Automation, Environments, Configuration

Description: A hands-on guide to structuring Docker Compose files with profiles, overrides, and secrets so dev, staging, and prod share one stack file without copy/paste drift.

---

Compose profiles let you ship one `docker-compose.yaml` that adapts to laptops, CI, and production. Instead of juggling three files, toggle services with `--profile` flags and keep configuration consistent via env files, overrides, and secrets.

## 1. Baseline Compose File

```yaml
version: "3.9"
services:
  api:
    image: ghcr.io/acme/api:${TAG:-latest}
    env_file:
      - configs/common.env
    environment:
      - NODE_ENV=${NODE_ENV:-development}
    profiles: ["core"]
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=app
    profiles: ["core"]
  worker:
    image: ghcr.io/acme/worker:${TAG:-latest}
    profiles: ["async"]
    depends_on:
      - api
  observability:
    image: ghcr.io/acme/otel-collector:latest
    profiles: ["observability"]
volumes:
  pgdata:
```

- `profiles` declares which environments should spin up each service.
- Launch core services by default: `docker compose --profile core up`.
- Enable async workers for staging: `docker compose --profile core --profile async up`.

## 2. Layer Env Files and Overrides

```
configs/
  common.env
  dev.env
  staging.env
  prod.env
```

Use a thin wrapper script to load the right env file:

```bash
#!/usr/bin/env bash
set -a
source configs/common.env
source "configs/${COMPOSE_ENV:-dev}.env"
set +a
NODE_ENV=$COMPOSE_ENV docker compose --profile core "$@"
```

Developers run `./compose.sh up --build`; CI sets `COMPOSE_ENV=staging`.

## 3. Secrets and Certificates

Compose supports file or external secrets:

```yaml
secrets:
  db_password:
    file: ./secrets/${COMPOSE_ENV:-dev}/db_password.txt

services:
  db:
    secrets:
      - db_password
```

Mount TLS certs per environment the same way. Keep secret files out of Git (add to `.gitignore`) and load them via vault tooling in CI/CD.

## 4. Compose Overrides for Edge Cases

`docker-compose.override.yaml` applies automatically in dev:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app
    environment:
      - DEBUG=true
```

Commit overrides that help every developer; use local overrides (`docker-compose.local.yaml`) for personal tweaks.

## 5. Profiles for Optional Tooling

- `observability`: spins up OpenTelemetry Collector + Jaeger locally (`docker compose --profile observability up -d`).
- `payments-mock`: start mocks only for feature branches needing them.
- `ci`: skip heavy services (e.g., browsers) when running unit tests in pipelines.

Document profiles in `README.md` so teammates know what `compose.sh --profile async up` actually does.

## 6. Testing Matrix in CI

```yaml
jobs:
  compose-test:
    strategy:
      matrix:
        profile: [core, core+async]
    steps:
      - run: COMPOSE_PROFILES="${{ matrix.profile }}" ./scripts/compose-ci.sh
```

`scripts/compose-ci.sh` can parse `COMPOSE_PROFILES` and call `docker compose --profile ... up --exit-code-from api` to fail fast if any container dies.

## 7. Clean Lifecycle

Teach the team three basic commands:

```bash
./compose.sh up -d                # bring up default profiles
./compose.sh --profile async up   # add workers
./compose.sh down -v              # clean volumes when switching envs
```

Combine with `docker compose ls` to ensure old stacks are torn down before running migrations or e2e tests.

---

Compose profiles turn environment sprawl into predictable toggles. With a shared script, layered env files, and secrets directories, you can run dev/staging/prod parity from the same manifest and keep configuration drift close to zero.
