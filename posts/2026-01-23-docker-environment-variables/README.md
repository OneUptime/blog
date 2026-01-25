# How to Use Docker Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Environment Variables, Configuration, DevOps, Best Practices

Description: Master Docker environment variable management including build-time vs runtime variables, file-based configuration, variable precedence, and secure handling of sensitive values.

---

Environment variables are the primary way to configure Docker containers. They control application behavior, database connections, feature flags, and secrets. Understanding when and how to use them prevents configuration mistakes and security issues.

## Setting Environment Variables at Runtime

### Using -e Flag

```bash
# Single variable
docker run -e DATABASE_URL=postgres://localhost/db myapp

# Multiple variables
docker run \
  -e DATABASE_URL=postgres://localhost/db \
  -e REDIS_URL=redis://localhost:6379 \
  -e LOG_LEVEL=info \
  myapp
```

### Using Environment Files

```bash
# app.env
DATABASE_URL=postgres://localhost/db
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

```bash
# Load from file
docker run --env-file app.env myapp
```

Environment files support:

- `VAR=value` - Set variable to value
- `VAR` - Inherit value from host environment
- Lines starting with `#` are comments
- No quotes needed around values

### Docker Compose Environment Variables

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      # Direct values
      - LOG_LEVEL=info
      - NODE_ENV=production
      # Inherit from host
      - API_KEY
      # Variable substitution
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@db:5432/mydb

    # Or use env_file
    env_file:
      - ./common.env
      - ./app.env
```

## Variable Precedence

When the same variable is set multiple ways, Docker uses this precedence (highest to lowest):

1. Values set with `docker run -e`
2. Values in `docker-compose.yml` environment section
3. Values from env_file
4. Values from `docker-compose.yml` env_file
5. Dockerfile ENV instructions
6. Values inherited from host

Example demonstrating precedence:

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - LOG_LEVEL=warn    # This wins
    env_file:
      - app.env           # LOG_LEVEL=info here is overridden
```

## Build-Time vs Runtime Variables

### ARG: Build-Time Only

```dockerfile
# ARG is available only during build
ARG APP_VERSION=1.0.0
ARG BUILD_DATE

# Use in build commands
RUN echo "Building version ${APP_VERSION}"

LABEL version="${APP_VERSION}"
LABEL build_date="${BUILD_DATE}"

# ARG is NOT available at runtime
# This will be empty when container runs
ENV VERSION=${APP_VERSION}
```

Build with arguments:

```bash
docker build \
  --build-arg APP_VERSION=2.0.0 \
  --build-arg BUILD_DATE=$(date +%Y-%m-%d) \
  -t myapp:2.0.0 .
```

### ENV: Runtime Available

```dockerfile
# ENV persists into the running container
ENV NODE_ENV=production
ENV PORT=3000

# Multiple variables on one line
ENV DB_HOST=localhost DB_PORT=5432

# ENV can use ARG values
ARG DEFAULT_PORT=3000
ENV PORT=${DEFAULT_PORT}
```

### Pattern: ARG with ENV Default

```dockerfile
# Define build argument with default
ARG LOG_LEVEL=info

# Set as environment variable for runtime
ENV LOG_LEVEL=${LOG_LEVEL}

# Now LOG_LEVEL is available both at build and runtime
```

Build different configurations:

```bash
# Production build
docker build --build-arg LOG_LEVEL=warn -t myapp:prod .

# Development build
docker build --build-arg LOG_LEVEL=debug -t myapp:dev .
```

## Variable Substitution in Compose

Docker Compose supports shell-style variable substitution:

```yaml
version: '3.8'

services:
  app:
    # Basic substitution
    image: myapp:${APP_VERSION}

    # With default value
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - PORT=${PORT:-3000}

    # Error if not set
    # - API_KEY=${API_KEY:?API_KEY must be set}
```

Create a `.env` file for Compose (different from env_file):

```bash
# .env (automatically loaded by docker compose)
APP_VERSION=2.0.0
LOG_LEVEL=debug
```

## Handling Sensitive Values

### Do Not Hardcode Secrets

```dockerfile
# NEVER do this
ENV DATABASE_PASSWORD=mysecretpassword
```

### Pass Secrets at Runtime

```bash
# From host environment (secret not in command history)
export DB_PASS=mysecretpassword
docker run -e DB_PASS myapp

# Or use a file
echo "mysecretpassword" > /tmp/db_pass
docker run -e DB_PASS=$(cat /tmp/db_pass) myapp
rm /tmp/db_pass
```

### Use Docker Secrets

For Docker Swarm or Compose with secrets support:

```yaml
version: '3.8'

services:
  app:
    secrets:
      - db_password
    environment:
      # Tell app to read from file
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Read from Files in Application

```python
import os

def get_env_or_file(name):
    """Read from environment variable or _FILE variant."""
    value = os.environ.get(name)
    if value:
        return value

    file_path = os.environ.get(f'{name}_FILE')
    if file_path and os.path.exists(file_path):
        with open(file_path) as f:
            return f.read().strip()

    return None

db_password = get_env_or_file('DB_PASSWORD')
```

## Debugging Environment Variables

### View Container Environment

```bash
# See all variables in running container
docker exec myapp env

# Check specific variable
docker exec myapp printenv DATABASE_URL

# Inspect image defaults
docker inspect myapp --format='{{range .Config.Env}}{{println .}}{{end}}'
```

### Compose Variable Expansion

```bash
# See resolved configuration
docker compose config

# Show only environment for a service
docker compose config --format json | jq '.services.app.environment'
```

### Common Issues

**Variable not expanding:**

```yaml
# Wrong: Single quotes prevent expansion
environment:
  - URL='http://${HOST}:${PORT}'

# Correct: Use double quotes or no quotes
environment:
  - URL=http://${HOST}:${PORT}
```

**Whitespace in values:**

```bash
# env file
# Wrong: Includes trailing space
VAR=value

# Correct: No trailing whitespace
VAR=value
```

## Best Practices

### 1. Document Required Variables

```dockerfile
# Document expected environment variables
ENV DATABASE_URL="" \
    REDIS_URL="" \
    LOG_LEVEL="info"
```

### 2. Validate at Startup

```python
# validate_env.py
import os
import sys

REQUIRED_VARS = ['DATABASE_URL', 'REDIS_URL', 'API_KEY']

missing = [var for var in REQUIRED_VARS if not os.environ.get(var)]

if missing:
    print(f"Missing required environment variables: {', '.join(missing)}")
    sys.exit(1)
```

### 3. Use Consistent Naming

```bash
# Prefix with application name for clarity
MYAPP_DATABASE_URL=...
MYAPP_CACHE_HOST=...
MYAPP_LOG_LEVEL=...
```

### 4. Separate Configs by Environment

```bash
# .env.development
LOG_LEVEL=debug
DATABASE_URL=postgres://localhost/dev

# .env.production
LOG_LEVEL=warn
DATABASE_URL=postgres://prod-db/prod
```

```yaml
services:
  app:
    env_file:
      - .env.${ENVIRONMENT:-development}
```

### 5. Never Commit Secrets

```gitignore
# .gitignore
.env.local
.env.*.local
secrets/
*.secret
```

### 6. Use Typed Configuration

```javascript
// config.js
const config = {
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    ssl: process.env.DB_SSL === 'true'
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0'
  },
  features: {
    newDashboard: process.env.FEATURE_NEW_DASHBOARD === 'true'
  }
};

module.exports = config;
```

---

Environment variables bridge the gap between containerized applications and their deployment environments. Use ARG for build-time configuration, ENV for runtime defaults, and always pass sensitive values at runtime rather than baking them into images. Validate required variables at startup and maintain separate configuration files for different environments. This approach keeps containers portable and configuration flexible.
