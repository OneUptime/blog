# How to Use Docker Environment Files (.env) Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Environment Variables, Configuration, DevOps, Best Practices

Description: Learn how to use .env files with Docker and Docker Compose, manage different environments, handle secrets safely, and implement best practices for configuration management.

---

Environment files provide a clean way to manage configuration across different environments. Docker and Docker Compose support multiple approaches to environment variable management, from simple .env files to complex multi-environment setups.

## Basic .env File Usage

### Default .env File

Docker Compose automatically loads `.env` from the project directory.

```bash
# .env
DATABASE_URL=postgres://user:pass@db:5432/myapp
REDIS_URL=redis://redis:6379
DEBUG=false
```

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - DEBUG=${DEBUG}
```

### Variable Substitution

```yaml
services:
  app:
    image: myapp:${VERSION:-latest}  # Default if not set
    environment:
      - API_URL=${API_URL:?API_URL must be set}  # Error if not set
      - LOG_LEVEL=${LOG_LEVEL:-info}  # Default value
```

| Syntax | Meaning |
|--------|---------|
| `${VAR}` | Use value of VAR |
| `${VAR:-default}` | Use default if VAR unset or empty |
| `${VAR-default}` | Use default only if VAR unset |
| `${VAR:?error}` | Error if VAR unset or empty |
| `${VAR?error}` | Error only if VAR unset |

## Environment File for Containers

### env_file Directive

```yaml
services:
  app:
    image: myapp
    env_file:
      - .env
      - .env.local  # Overrides .env

  worker:
    image: myapp
    env_file:
      - .env
      - worker.env
```

### Multiple Environment Files

```bash
# .env (shared)
LOG_LEVEL=info
TZ=UTC

# app.env (app-specific)
PORT=3000
WORKERS=4

# worker.env (worker-specific)
QUEUE=default
CONCURRENCY=10
```

```yaml
services:
  app:
    env_file:
      - .env
      - app.env

  worker:
    env_file:
      - .env
      - worker.env
```

## Multi-Environment Setup

### Directory Structure

```
project/
├── docker-compose.yml
├── .env                    # Default/development
├── .env.production
├── .env.staging
├── .env.test
└── .env.local              # Local overrides (gitignored)
```

### Specify Environment File

```bash
# Use specific env file
docker compose --env-file .env.production up

# Or set COMPOSE_ENV_FILES
export COMPOSE_ENV_FILES=.env.production
docker compose up
```

### Override Files Pattern

```yaml
# docker-compose.yml (base)
services:
  app:
    image: myapp
    environment:
      - DATABASE_URL
      - REDIS_URL

# docker-compose.override.yml (development - auto-loaded)
services:
  app:
    environment:
      - DEBUG=true

# docker-compose.prod.yml (production)
services:
  app:
    environment:
      - DEBUG=false
```

```bash
# Development (uses override automatically)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Environment Variables vs env_file

### Direct Environment

```yaml
services:
  app:
    environment:
      # Key-value format
      DATABASE_URL: postgres://user:pass@db:5432/myapp
      # Or list format
      - REDIS_URL=redis://redis:6379
      # From host environment
      - HOST_VAR
```

### env_file

```yaml
services:
  app:
    env_file:
      - .env
```

| Aspect | environment | env_file |
|--------|------------|----------|
| Visibility | In compose file | In separate file |
| Interpolation | Supports ${VAR} | No interpolation |
| Override | Yes | Earlier files overridden |
| Git tracking | Often tracked | Often gitignored |

## .env File Format

### Syntax Rules

```bash
# Comments start with #
# Blank lines are ignored

# Simple assignment
KEY=value

# Quoted values (preserves spaces)
MESSAGE="Hello World"
PATH_VAR='C:\Users\name'

# No spaces around =
CORRECT=value
# WRONG = value  # This won't work

# Multi-line values (use quotes)
MULTI_LINE="line1
line2
line3"

# Export keyword is optional and ignored
export EXPORTED_VAR=value

# Empty value
EMPTY_VAR=

# Special characters in quotes
SPECIAL="value with spaces and $pecial chars"
```

### Common Mistakes

```bash
# WRONG: Space around equals
DATABASE = value

# WRONG: Unquoted special characters
PASSWORD=p@ss$word

# CORRECT: Quote special characters
PASSWORD="p@ss$word"

# WRONG: Inline comments
VALUE=something # this is not a comment

# The value is "something # this is not a comment"
```

## Secrets and Sensitive Data

### Don't Commit Secrets

```bash
# .gitignore
.env.local
.env.*.local
*.secret
.env.production
```

### Use Template Files

```bash
# .env.template (committed)
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here

# .env.local (not committed)
DATABASE_URL=postgres://realuser:realpass@db:5432/prod
SECRET_KEY=actual-production-secret
API_KEY=actual-api-key
```

### Docker Secrets (Swarm)

For truly sensitive data in production:

```yaml
services:
  app:
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Vault Integration Example

```bash
#!/bin/bash
# load-secrets.sh
export DATABASE_URL=$(vault kv get -field=url secret/database)
export API_KEY=$(vault kv get -field=key secret/api)

docker compose up
```

## Docker Run with Environment

```bash
# Single variable
docker run -e DATABASE_URL=postgres://... myimage

# From host environment
docker run -e DATABASE_URL myimage

# From file
docker run --env-file .env myimage

# Multiple variables
docker run \
  -e DATABASE_URL=postgres://... \
  -e REDIS_URL=redis://... \
  -e DEBUG=true \
  myimage
```

## Debugging Environment Variables

### Check Loaded Variables

```bash
# See what Compose loaded
docker compose config

# Check container's environment
docker exec mycontainer env
docker exec mycontainer printenv

# Specific variable
docker exec mycontainer printenv DATABASE_URL
```

### Validate .env File

```bash
#!/bin/bash
# validate-env.sh

REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "SECRET_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set"
    exit 1
  fi
done

echo "All required variables are set"
```

## Best Practices

### 1. Use Defaults for Development

```yaml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL:-postgres://dev:dev@db:5432/dev}
      - DEBUG=${DEBUG:-true}
```

### 2. Validate Required Variables

```yaml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL:?DATABASE_URL is required}
      - API_KEY=${API_KEY:?API_KEY is required}
```

### 3. Organize by Category

```bash
# .env
# Database
DATABASE_URL=postgres://user:pass@db:5432/myapp
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://redis:6379
REDIS_TIMEOUT=5

# Application
APP_PORT=3000
APP_ENV=development
LOG_LEVEL=info

# External Services
STRIPE_API_KEY=sk_test_...
SENDGRID_API_KEY=SG...
```

### 4. Environment-Specific Overrides

```bash
# .env (base)
LOG_LEVEL=info
APP_ENV=development

# .env.production
LOG_LEVEL=warn
APP_ENV=production
DEBUG=false

# .env.test
LOG_LEVEL=error
APP_ENV=test
DATABASE_URL=postgres://test:test@localhost:5432/test
```

### 5. Document Variables

```bash
# .env.template

# Required: Database connection string
# Format: postgres://user:pass@host:port/database
DATABASE_URL=

# Required: Secret key for session encryption
# Generate with: openssl rand -hex 32
SECRET_KEY=

# Optional: Log level (debug, info, warn, error)
# Default: info
LOG_LEVEL=info

# Optional: Number of worker processes
# Default: 4
WORKERS=4
```

## Complete Example

```bash
# .env.template
# Copy to .env and fill in values

# === Database ===
DATABASE_URL=postgres://user:password@localhost:5432/myapp
DATABASE_POOL_SIZE=10

# === Redis ===
REDIS_URL=redis://localhost:6379

# === Application ===
APP_PORT=3000
APP_ENV=development
SECRET_KEY=generate-a-secret-key
LOG_LEVEL=info

# === External APIs ===
# Get from https://dashboard.stripe.com
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# === Optional ===
DEBUG=false
WORKERS=4
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:${VERSION:-latest}
    env_file:
      - .env
      - .env.local
    environment:
      # Ensure required vars are set
      - DATABASE_URL=${DATABASE_URL:?Required}
      - SECRET_KEY=${SECRET_KEY:?Required}
    ports:
      - "${APP_PORT:-3000}:3000"

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD:-devpassword}

  redis:
    image: redis:7-alpine
```

## Summary

| Task | Solution |
|------|----------|
| Default values | `${VAR:-default}` |
| Required values | `${VAR:?error message}` |
| Multiple files | `env_file: [.env, .env.local]` |
| Per-environment | `--env-file .env.production` |
| Secrets | Docker secrets or external vault |
| Debugging | `docker compose config`, `docker exec env` |

Environment files are essential for managing configuration across environments. Keep sensitive data out of version control, use templates for documentation, provide sensible defaults for development, and validate required variables. This approach makes your Docker applications portable and secure.

