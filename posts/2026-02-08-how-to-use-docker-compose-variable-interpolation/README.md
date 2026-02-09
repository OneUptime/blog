# How to Use Docker Compose Variable Interpolation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, Environment Variables, Configuration, DevOps, Docker

Description: Master Docker Compose variable interpolation to build flexible, reusable compose files that adapt to any environment.

---

Docker Compose variable interpolation lets you inject values into your `docker-compose.yml` file at runtime. Instead of hardcoding image tags, port numbers, and configuration values, you use variables that get resolved from environment variables or `.env` files. This makes a single compose file work across development, staging, and production without any changes.

## Basic Variable Syntax

The syntax is `${VARIABLE_NAME}`. Docker Compose replaces these placeholders with actual values before processing the file:

```yaml
# docker-compose.yml - basic variable interpolation
version: "3.8"

services:
  web:
    image: myapp:${APP_VERSION}
    ports:
      - "${HOST_PORT}:8080"
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}

  db:
    image: postgres:${PG_VERSION}
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
```

Set the variables before running compose:

```bash
# Export variables and run compose
export APP_VERSION=2.1.0
export HOST_PORT=3000
export DB_USER=appuser
export DB_PASS=secretpass
export DB_NAME=myapp_production
export PG_VERSION=16

docker compose up -d
```

## The .env File

Exporting variables manually is tedious. Docker Compose automatically reads a `.env` file in the same directory as your compose file:

```bash
# .env - automatically loaded by Docker Compose
APP_VERSION=2.1.0
HOST_PORT=3000
DB_USER=appuser
DB_PASS=secretpass
DB_NAME=myapp_production
PG_VERSION=16
COMPOSE_PROJECT_NAME=myapp
```

Now you can just run `docker compose up` and all variables are resolved from the `.env` file.

Important: The `.env` file is read by Docker Compose for interpolation in the `docker-compose.yml` file itself. It is different from the `env_file` directive, which loads variables into the container's environment.

## Variable Syntax Variations

Docker Compose supports both `$VARIABLE` and `${VARIABLE}` syntax:

```yaml
services:
  app:
    # Both of these work
    image: myapp:$APP_VERSION
    image: myapp:${APP_VERSION}

    # Use braces when the variable is adjacent to other text
    image: myapp:${APP_VERSION}-alpine    # Correct
    # image: myapp:$APP_VERSION-alpine    # Ambiguous - might not work as expected
```

Always use braces when the variable is part of a larger string to avoid ambiguity.

## Default Values

You can specify default values that are used when a variable is unset or empty:

```yaml
# docker-compose.yml - with default values
version: "3.8"

services:
  web:
    # Use default if APP_VERSION is not set
    image: myapp:${APP_VERSION:-latest}

    # Use default port 8080 if HOST_PORT is not set
    ports:
      - "${HOST_PORT:-8080}:8080"

    environment:
      # Default to 'info' log level
      LOG_LEVEL: ${LOG_LEVEL:-info}
      # Default replica count
      WORKERS: ${WORKER_COUNT:-4}

  db:
    image: postgres:${PG_VERSION:-16}
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASS:?Database password must be set}
```

There are two default-value syntaxes:

- `${VAR:-default}` - uses "default" if VAR is unset or empty
- `${VAR-default}` - uses "default" only if VAR is completely unset (empty string is kept)

The difference matters:

```bash
# With ${VAR:-default}
export VAR=""     # Result: "default" (empty is treated as unset)

# With ${VAR-default}
export VAR=""     # Result: "" (empty string is preserved)
```

## Required Variables with Error Messages

Use the `?` syntax to require a variable and fail with a message if it is missing:

```yaml
services:
  app:
    image: myapp:${APP_VERSION:?APP_VERSION must be set to deploy}
    environment:
      SECRET_KEY: ${SECRET_KEY:?Secret key is required}
      API_TOKEN: ${API_TOKEN:?Set API_TOKEN in .env file}
```

If `APP_VERSION` is not set, Docker Compose will print the error message and refuse to start:

```
ERROR: Variable "APP_VERSION" is not set. APP_VERSION must be set to deploy
```

This is extremely useful for catching configuration mistakes before they cause runtime failures.

## Escaping Dollar Signs

If you need a literal `$` in your compose file (common in shell commands), escape it with `$$`:

```yaml
services:
  backup:
    image: alpine
    # Use $$ to produce a literal $ in the command
    command: sh -c "echo $$HOME && tar czf /backup/archive-$$(date +%Y%m%d).tar.gz /data"
    environment:
      # Literal dollar sign in a password
      SPECIAL_PASS: "pa$$word"
```

Without the double dollar sign, Compose would try to interpolate `$HOME` and `$(date)` as variables.

## Variable Interpolation in Different Sections

Variables work in most places within a compose file:

```yaml
version: "3.8"

services:
  app:
    # Image name and tag
    image: ${REGISTRY:-docker.io}/${IMAGE_NAME:-myapp}:${TAG:-latest}

    # Container name
    container_name: ${PROJECT}-app

    # Port mappings
    ports:
      - "${APP_PORT:-3000}:3000"

    # Volume paths
    volumes:
      - ${DATA_DIR:-./data}:/app/data

    # Labels
    labels:
      com.example.version: ${APP_VERSION}
      com.example.env: ${DEPLOY_ENV:-development}

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: "${CPU_LIMIT:-1.0}"
          memory: "${MEM_LIMIT:-512M}"

    # Network configuration
    networks:
      frontend:
        ipv4_address: ${APP_IP:-172.20.0.10}

networks:
  frontend:
    ipam:
      config:
        - subnet: ${NETWORK_SUBNET:-172.20.0.0/16}
```

## Multi-Environment Setup

A practical pattern uses different `.env` files for different environments:

```bash
# .env.development
APP_VERSION=latest
HOST_PORT=3000
DB_PASS=devpass123
LOG_LEVEL=debug
WORKERS=1

# .env.staging
APP_VERSION=2.1.0-rc1
HOST_PORT=8080
DB_PASS=staging_pass_xyz
LOG_LEVEL=info
WORKERS=2

# .env.production
APP_VERSION=2.1.0
HOST_PORT=80
DB_PASS=prod_secure_pass_abc
LOG_LEVEL=warn
WORKERS=8
```

Switch between environments using the `--env-file` flag:

```bash
# Deploy with the staging configuration
docker compose --env-file .env.staging up -d

# Deploy with production configuration
docker compose --env-file .env.production up -d
```

## Debugging Variable Interpolation

### Preview Resolved Configuration

```bash
# Show the fully resolved compose file with all variables replaced
docker compose config
```

This prints the final YAML after all variables are interpolated. It is the best way to verify your variables resolve correctly.

### Check for Unset Variables

```bash
# Docker Compose warns about unset variables
docker compose config 2>&1 | grep "WARN"
```

### Print All Variables in Use

```bash
# Extract all variable references from a compose file
grep -oP '\$\{?\w+' docker-compose.yml | sort -u | sed 's/[${}]//g'
```

Then check which ones are set:

```bash
# Check if each referenced variable is defined
for var in $(grep -oP '\$\{?\w+' docker-compose.yml | sort -u | sed 's/[${}]//g'); do
  if [ -z "${!var+x}" ]; then
    echo "UNSET: $var"
  else
    echo "SET:   $var=${!var}"
  fi
done
```

## Variable Precedence

When the same variable is defined in multiple places, Docker Compose follows this precedence (highest to lowest):

1. Shell environment variables (exported in your terminal)
2. Values from the `.env` file
3. Default values in the compose file (`${VAR:-default}`)

```bash
# This takes precedence over .env and defaults
export APP_VERSION=3.0.0

# Even if .env has APP_VERSION=2.0.0, the compose file uses 3.0.0
docker compose config | grep image
```

This precedence is useful for CI/CD pipelines where you set variables in the build environment to override `.env` defaults.

## Security Considerations

Never commit `.env` files with secrets to version control:

```bash
# .gitignore - exclude env files with secrets
.env
.env.production
.env.staging
*.env.local
```

Create an `.env.example` file that shows required variables without actual values:

```bash
# .env.example - template for required variables (commit this to git)
APP_VERSION=latest
HOST_PORT=3000
DB_USER=postgres
DB_PASS=CHANGE_ME
SECRET_KEY=CHANGE_ME
```

For production secrets, consider using Docker secrets or a vault service rather than environment variables in `.env` files.

## Summary

Variable interpolation transforms Docker Compose from a static configuration tool into a flexible deployment system. Use `.env` files for environment-specific values, defaults for sensible fallbacks, and the `?` syntax to catch missing required variables early. Preview your resolved config with `docker compose config` before deploying, and never commit secrets to version control.
