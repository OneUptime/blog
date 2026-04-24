# How to Use .env Files with Stacks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Environment Variable, DevOps

Description: Learn how to use .env files with Docker Compose stacks in Portainer for managing environment-specific configurations cleanly.

## Introduction

Docker Compose supports loading environment variables from a `.env` file automatically when it is placed in the project directory next to the Compose file. In Portainer, you can define stack environment variables in the UI or use **Load variables from .env file** to import them. For Docker Standalone stacks, Docker Compose can also use a repository `.env` file; for Docker Swarm stacks, `.env` substitution is not supported by `docker stack deploy`.

## Prerequisites

- Portainer with an existing stack or ability to create one
- Understanding of `${VARIABLE}` substitution in Docker Compose

## How .env Files Work in Docker Compose

```bash
.env file (auto-loaded by Docker Compose):
  DB_PASSWORD=secret
  IMAGE_TAG=v1.2.3

docker-compose.yml references:
  image: myorg/app:${IMAGE_TAG}
  environment:
    - DB_PASSWORD=${DB_PASSWORD}

Result: Docker Compose substitutes variables before processing
```

## Step 1: Create a .env File

Structure your `.env` file with all stack variables:

```bash
# .env - loaded automatically by Docker Compose

# This file should NOT be committed to Git if it contains secrets

# Application settings
APP_NAME=myapp
ENVIRONMENT=production
IMAGE_TAG=v1.2.3

# Port configuration
WEB_PORT=80
API_PORT=8080
GRAFANA_PORT=3000

# Database configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myapp_db
DB_USER=appuser
DB_PASSWORD=change-this-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Secrets (NEVER commit to git)
JWT_SECRET=change-this-jwt-secret
SMTP_PASSWORD=change-this-smtp-password
```

Always create a `.env.example` file for Git:

```bash
# .env.example - safe to commit, shows required variables
APP_NAME=myapp
ENVIRONMENT=production
IMAGE_TAG=latest

DB_HOST=postgres
DB_PORT=5432
DB_NAME=myapp_db
DB_USER=appuser
DB_PASSWORD=           # Set in deployment environment

JWT_SECRET=            # Set in deployment environment
SMTP_PASSWORD=         # Set in deployment environment
```

## Step 2: Use .env File with Git-Based Stacks

For Git-based stacks in Portainer:

**Option A: Commit a non-secret .env file to Git** (safe for non-sensitive configs on Docker Standalone):
```text
repository/
├── docker-compose.yml
├── .env                  # Contains non-secret config, committed to Git
└── .env.example          # Template for secrets
```

Then in Portainer, add any remaining sensitive variables via the UI or by uploading a separate `.env` file instead of storing them in Git.

**Option B: Do not commit .env, set everything in Portainer**:
```text
repository/
├── docker-compose.yml
└── .env.example          # Template only - not the actual .env
```

Set all variables in Portainer's **Environment variables** section or use **Load variables from .env file**.

For Docker Swarm stacks, prefer Portainer's environment variables or an uploaded `.env` file, because `.env` substitution is a Docker Compose CLI feature and is not supported by `docker stack deploy`.

## Step 3: Docker Compose env_file Directive in Portainer

You can reference external env files within your Compose YAML:

```yaml
services:
  api:
    image: myorg/api:latest
    env_file:
      - ./config/api.env       # Loaded from the stack's directory
      - ./config/secrets.env   # Additional env file
    environment:
      # These override env_file values:
      - LOG_LEVEL=${LOG_LEVEL:-info}
```

Note: `env_file` paths are relative to the Compose file's parent folder. This pattern works for Docker Standalone stacks when the referenced files are present with the stack content. Docker Swarm stacks deployed through Portainer cannot use `env_file` with `docker stack deploy`.

## Step 4: Load .env Variables in Portainer

To use an existing `.env` file with any stack type:

1. Navigate to **Stacks** → create or edit a stack.
2. Scroll to **Environment variables**.
3. Click **Load variables from .env file**.
4. Select your `.env` file.
5. Review the imported variables and adjust any values as needed.

## Step 5: Multiple Environment Files

Use different `.env` files for different deployment targets:

```bash
# .env.production
ENVIRONMENT=production
IMAGE_TAG=v1.2.3
DB_NAME=myapp_prod
LOG_LEVEL=warn
REPLICAS=3

# .env.staging
ENVIRONMENT=staging
IMAGE_TAG=v1.3.0-rc1
DB_NAME=myapp_staging
LOG_LEVEL=debug
REPLICAS=1
```

When creating stacks in Portainer:
- For production stack: use **Load variables from .env file** and select `.env.production`.
- For staging stack: use **Load variables from .env file** and select `.env.staging`.

## Step 6: Verify Variable Substitution

```bash
# Test locally before deploying to Portainer:
# Load variables and check what Compose generates:
docker compose --env-file .env.production config

# This shows the fully-substituted Compose file - confirms all variables resolve

# Show the variables Compose used for interpolation:
docker compose --env-file .env.production config --environment
```

## Step 7: .gitignore for .env Files

Ensure secrets don't leak via Git:

```bash
# .gitignore entries for secret env files:
.env.local
.env.production
.env.staging
*.env.local

# Add this too if your main .env contains secrets:
# .env

# Always commit .env.example
# Only commit a real .env if it contains no secrets
```

## Conclusion

`.env` files and Docker Compose variable substitution provide a clean pattern for managing configuration across environments. For Portainer stacks, keep `.env.example` as a committed template, store non-sensitive runtime defaults in a committed `.env` only when that is safe, and inject secrets via Portainer's environment variable UI or **Load variables from .env file**. On Docker Swarm, remember that `.env` substitution and `env_file` do not work the same way because `docker stack deploy` does not support Docker Compose's `.env` substitution features. Always test variable substitution locally with `docker compose config` before deploying to confirm everything resolves correctly.
