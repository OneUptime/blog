# How to Implement Docker Secrets Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, DevOps, Secrets

Description: Secure sensitive data in Docker with secrets management using Docker Swarm secrets, docker-compose secrets, and best practices for credential handling.

---

## Introduction

Hardcoding passwords, API keys, and certificates directly into Docker images or environment variables is a common mistake that leads to security breaches. Docker provides built-in secrets management that allows you to securely store and distribute sensitive data to containers at runtime.

This guide walks through practical implementations of Docker secrets, from basic usage in Docker Swarm to advanced patterns with docker-compose and external secrets providers.

## Why Not Environment Variables?

Before diving into Docker secrets, let's understand why environment variables are problematic for sensitive data.

| Aspect | Environment Variables | Docker Secrets |
|--------|----------------------|----------------|
| Storage | Stored in container metadata | Encrypted at rest in Swarm |
| Visibility | Visible via `docker inspect` | Not exposed in inspect output |
| Transmission | Passed in clear text | Encrypted during transmission |
| Access | Available to all processes | Mounted as files with permissions |
| Logging | Often leaked in logs | File-based, harder to leak |
| Rotation | Requires container restart | Can update without full restart |

Environment variables are visible to anyone with access to the Docker daemon.

The following command demonstrates how easy it is to extract environment variables from a running container:

```bash
# This exposes all environment variables, including secrets
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' my_container

# Output might include:
# DATABASE_PASSWORD=super_secret_password
# API_KEY=sk-1234567890abcdef
```

## Docker Swarm Secrets Fundamentals

Docker Swarm provides native secrets management. Secrets are encrypted during transit and at rest, and are only accessible to services that have been granted explicit access.

### Creating Secrets in Docker Swarm

You can create secrets from files or from standard input. Here we create a database password secret from a file:

```bash
# Create a file containing the secret (do not commit this file)
echo "MySecureP@ssw0rd2024" > db_password.txt

# Create the secret in Docker Swarm
docker secret create db_password db_password.txt

# Remove the source file immediately
rm db_password.txt

# Verify the secret exists
docker secret ls
```

For secrets that should never touch the filesystem, pipe them directly:

```bash
# Create secret from stdin (more secure, no file created)
echo "MySecureP@ssw0rd2024" | docker secret create db_password -

# Create secret from a password manager or vault
pass show database/production | docker secret create prod_db_password -
```

### Inspecting Secrets

Docker intentionally prevents you from reading secret values after creation. The inspect command only shows metadata:

```bash
# View secret metadata (not the actual value)
docker secret inspect db_password
```

The output shows creation time and labels but not the secret content:

```json
[
    {
        "ID": "r9qk7p8x5n2m1v3b4c6d7e8f9g0h",
        "Version": {
            "Index": 15
        },
        "CreatedAt": "2026-01-30T10:00:00.000000000Z",
        "UpdatedAt": "2026-01-30T10:00:00.000000000Z",
        "Spec": {
            "Name": "db_password",
            "Labels": {}
        }
    }
]
```

### Using Secrets in Swarm Services

Secrets are mounted as files inside containers at `/run/secrets/<secret_name>`. Here is how to deploy a service with access to a secret:

```bash
# Deploy a service with secret access
docker service create \
    --name postgres_db \
    --secret db_password \
    --env POSTGRES_PASSWORD_FILE=/run/secrets/db_password \
    postgres:16-alpine
```

The `_FILE` suffix is a convention supported by many official Docker images. The application reads the password from the file path instead of an environment variable.

### Custom Secret Mount Locations

You can mount secrets to specific paths with custom permissions:

```bash
# Mount secret to a custom path with specific permissions
docker service create \
    --name my_app \
    --secret source=db_password,target=/app/config/db_password,uid=1000,gid=1000,mode=0400 \
    my_app_image:latest
```

The parameters explained:
- `source`: The name of the secret in Swarm
- `target`: The path inside the container
- `uid/gid`: Owner user and group IDs
- `mode`: File permissions (0400 = read-only for owner)

## Docker Compose Secrets

Docker Compose supports secrets for both Swarm mode and local development. The syntax differs slightly between the two contexts.

### Secrets in Docker Compose for Swarm

When deploying to Swarm with `docker stack deploy`, use this format:

```yaml
# docker-compose.yml for Swarm deployment
version: "3.9"

services:
  web:
    image: nginx:alpine
    secrets:
      - site_certificate
      - site_key
    configs:
      - source: nginx_config
        target: /etc/nginx/nginx.conf

  database:
    image: postgres:16-alpine
    secrets:
      - db_password
      - db_user
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_USER_FILE: /run/secrets/db_user
      POSTGRES_DB: myapp

  backend:
    image: myapp/backend:latest
    secrets:
      - source: db_password
        target: database_password
        uid: "1000"
        gid: "1000"
        mode: 0400
      - api_key
    depends_on:
      - database

secrets:
  db_password:
    external: true
  db_user:
    external: true
  site_certificate:
    file: ./certs/site.crt
  site_key:
    file: ./certs/site.key
  api_key:
    external: true

configs:
  nginx_config:
    file: ./nginx.conf
```

Deploy the stack to Swarm:

```bash
# First create the external secrets
echo "postgres_password_123" | docker secret create db_password -
echo "postgres_user" | docker secret create db_user -
echo "sk-api-key-here" | docker secret create api_key -

# Deploy the stack
docker stack deploy -c docker-compose.yml myapp
```

### Secrets in Docker Compose for Local Development

For local development without Swarm, docker-compose reads secrets from files:

```yaml
# docker-compose.dev.yml for local development
version: "3.9"

services:
  database:
    image: postgres:16-alpine
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_USER: devuser
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    secrets:
      - db_password
      - api_key
    environment:
      DATABASE_HOST: database
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key
    ports:
      - "8000:8000"
    volumes:
      - ./src:/app/src
    depends_on:
      - database

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt

volumes:
  postgres_data:
```

Set up the local secrets directory:

```bash
# Create secrets directory (add to .gitignore)
mkdir -p secrets

# Create secret files for local development
echo "local_dev_password" > secrets/db_password.txt
echo "sk-local-api-key" > secrets/api_key.txt

# Set proper permissions
chmod 600 secrets/*.txt

# Add to .gitignore
echo "secrets/" >> .gitignore
```

## Reading Secrets in Application Code

Your application needs to read secrets from files instead of environment variables. Here are examples in common languages.

### Python Application

This utility function reads secrets with fallback support for both file-based and environment variable approaches:

```python
# config/secrets.py
import os
from pathlib import Path
from typing import Optional


def get_secret(secret_name: str, default: Optional[str] = None) -> Optional[str]:
    """
    Read a secret from Docker secrets or environment variable.

    Priority:
    1. Docker secret file at /run/secrets/<secret_name>
    2. Environment variable <SECRET_NAME>_FILE pointing to a file
    3. Environment variable <SECRET_NAME>
    4. Default value
    """
    # Check Docker secrets path first
    secret_path = Path(f"/run/secrets/{secret_name}")
    if secret_path.exists():
        return secret_path.read_text().strip()

    # Check for _FILE environment variable
    file_env = os.getenv(f"{secret_name.upper()}_FILE")
    if file_env:
        file_path = Path(file_env)
        if file_path.exists():
            return file_path.read_text().strip()

    # Fall back to direct environment variable
    env_value = os.getenv(secret_name.upper())
    if env_value:
        return env_value

    return default


# Usage in your application
DATABASE_PASSWORD = get_secret("db_password")
API_KEY = get_secret("api_key")
JWT_SECRET = get_secret("jwt_secret", default="dev-only-secret")
```

### Node.js Application

Similar approach in Node.js with synchronous file reading for startup configuration:

```javascript
// config/secrets.js
const fs = require('fs');
const path = require('path');

/**
 * Read a secret from Docker secrets or environment variable.
 *
 * @param {string} secretName - Name of the secret
 * @param {string} defaultValue - Default value if secret not found
 * @returns {string|undefined} The secret value
 */
function getSecret(secretName, defaultValue = undefined) {
    // Check Docker secrets path first
    const secretPath = `/run/secrets/${secretName}`;
    try {
        if (fs.existsSync(secretPath)) {
            return fs.readFileSync(secretPath, 'utf8').trim();
        }
    } catch (err) {
        // File does not exist or cannot be read
    }

    // Check for _FILE environment variable
    const fileEnvName = `${secretName.toUpperCase()}_FILE`;
    const filePath = process.env[fileEnvName];
    if (filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8').trim();
        } catch (err) {
            // File does not exist or cannot be read
        }
    }

    // Fall back to direct environment variable
    const envValue = process.env[secretName.toUpperCase()];
    if (envValue) {
        return envValue;
    }

    return defaultValue;
}

// Export configuration object
module.exports = {
    database: {
        password: getSecret('db_password'),
        user: getSecret('db_user', 'postgres'),
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    },
    api: {
        key: getSecret('api_key'),
        secret: getSecret('api_secret'),
    },
    jwt: {
        secret: getSecret('jwt_secret'),
        expiresIn: '24h',
    },
};
```

### Go Application

Go implementation with proper error handling:

```go
// config/secrets.go
package config

import (
    "fmt"
    "os"
    "path/filepath"
    "strings"
)

// GetSecret reads a secret from Docker secrets or environment variable.
// Priority: /run/secrets/<name> -> <NAME>_FILE env -> <NAME> env -> default
func GetSecret(secretName string, defaultValue string) (string, error) {
    // Check Docker secrets path first
    secretPath := filepath.Join("/run/secrets", secretName)
    if data, err := os.ReadFile(secretPath); err == nil {
        return strings.TrimSpace(string(data)), nil
    }

    // Check for _FILE environment variable
    envName := strings.ToUpper(secretName)
    fileEnvName := envName + "_FILE"
    if filePath := os.Getenv(fileEnvName); filePath != "" {
        if data, err := os.ReadFile(filePath); err == nil {
            return strings.TrimSpace(string(data)), nil
        }
    }

    // Fall back to direct environment variable
    if value := os.Getenv(envName); value != "" {
        return value, nil
    }

    // Return default if provided
    if defaultValue != "" {
        return defaultValue, nil
    }

    return "", fmt.Errorf("secret %s not found", secretName)
}

// MustGetSecret panics if the secret is not found
func MustGetSecret(secretName string) string {
    value, err := GetSecret(secretName, "")
    if err != nil {
        panic(fmt.Sprintf("required secret not found: %s", secretName))
    }
    return value
}
```

## Avoiding Secrets in Docker Images

A common mistake is accidentally baking secrets into Docker images. Here are practices to prevent this.

### Multi-stage Builds for Build-time Secrets

Sometimes you need secrets during build time (like private npm tokens). Use multi-stage builds to prevent secrets from ending up in the final image:

```dockerfile
# Dockerfile with build-time secrets (Docker BuildKit required)
# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Mount secret during npm install only
# The secret is not stored in any layer
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci --only=production

COPY . .
RUN npm run build

# Final stage - no secrets here
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy only built artifacts, not the secret
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Build the image with the secret:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with secret from file
docker build --secret id=npm_token,src=$HOME/.npmrc -t myapp:latest .

# Build with secret from environment variable
echo $NPM_TOKEN | docker build --secret id=npm_token -t myapp:latest .
```

### Using .dockerignore

Prevent secrets from being copied into the build context:

```text
# .dockerignore
# Secret files
*.pem
*.key
*.crt
secrets/
.env
.env.*
!.env.example

# Git and IDE
.git
.gitignore
.idea
.vscode

# Development files
docker-compose*.yml
Dockerfile*
README.md
docs/

# Test files
tests/
__tests__/
*.test.js
*.spec.js

# Build artifacts
node_modules
dist
build
```

### Scanning Images for Secrets

Use tools to detect accidentally committed secrets:

```bash
# Install and run Trivy to scan for secrets
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:latest image --scanners secret myapp:latest

# Use Docker Scout for vulnerability and secret scanning
docker scout cves myapp:latest
docker scout quickview myapp:latest
```

## Secret Rotation Strategies

Rotating secrets without downtime requires careful planning. Here are several approaches.

### Rolling Updates in Swarm

Docker Swarm allows adding new secrets and removing old ones during service updates:

```bash
# Create the new version of the secret
echo "NewSecureP@ssw0rd2026" | docker secret create db_password_v2 -

# Update the service to use the new secret
docker service update \
    --secret-rm db_password \
    --secret-add source=db_password_v2,target=db_password \
    myapp_backend

# After verification, remove the old secret
docker secret rm db_password
```

### Dual-Secret Approach

For zero-downtime rotation, support both old and new secrets simultaneously:

```yaml
# docker-compose.rotation.yml
version: "3.9"

services:
  backend:
    image: myapp/backend:latest
    secrets:
      - db_password_current
      - db_password_previous
    environment:
      DB_PASSWORD_CURRENT_FILE: /run/secrets/db_password_current
      DB_PASSWORD_PREVIOUS_FILE: /run/secrets/db_password_previous

secrets:
  db_password_current:
    external: true
  db_password_previous:
    external: true
```

Application code to support dual secrets:

```python
# config/rotating_secrets.py
from pathlib import Path
from typing import List
import logging

logger = logging.getLogger(__name__)


def get_valid_secrets(secret_base_name: str) -> List[str]:
    """
    Get all valid versions of a secret for rotation support.
    Returns secrets in priority order: current, previous.
    """
    secrets = []

    # Check for current secret
    current_path = Path(f"/run/secrets/{secret_base_name}_current")
    if current_path.exists():
        secrets.append(current_path.read_text().strip())

    # Check for previous secret (for rotation period)
    previous_path = Path(f"/run/secrets/{secret_base_name}_previous")
    if previous_path.exists():
        secrets.append(previous_path.read_text().strip())

    # Fallback to non-versioned secret
    base_path = Path(f"/run/secrets/{secret_base_name}")
    if base_path.exists():
        secret = base_path.read_text().strip()
        if secret not in secrets:
            secrets.append(secret)

    return secrets


def validate_password(provided: str, secret_name: str) -> bool:
    """
    Validate a password against current and previous secrets.
    Useful during rotation periods.
    """
    valid_secrets = get_valid_secrets(secret_name)

    for secret in valid_secrets:
        if provided == secret:
            return True

    return False
```

### Automated Rotation Script

Bash script to automate secret rotation in Swarm:

```bash
#!/bin/bash
# rotate-secret.sh - Rotate a Docker Swarm secret

set -euo pipefail

SECRET_NAME="${1:-}"
NEW_VALUE="${2:-}"
SERVICE_NAME="${3:-}"

if [[ -z "$SECRET_NAME" ]] || [[ -z "$SERVICE_NAME" ]]; then
    echo "Usage: $0 <secret_name> <new_value> <service_name>"
    echo "Example: $0 db_password 'NewP@ssword123' myapp_backend"
    exit 1
fi

# Generate version suffix based on timestamp
VERSION=$(date +%Y%m%d%H%M%S)
NEW_SECRET_NAME="${SECRET_NAME}_${VERSION}"

echo "Creating new secret: $NEW_SECRET_NAME"

# Create new secret
if [[ -z "$NEW_VALUE" ]]; then
    # Read from stdin if no value provided
    echo "Enter new secret value (will not echo):"
    read -s NEW_VALUE
fi

echo "$NEW_VALUE" | docker secret create "$NEW_SECRET_NAME" -

echo "Updating service: $SERVICE_NAME"

# Get current secret being used (if any)
CURRENT_SECRET=$(docker service inspect "$SERVICE_NAME" \
    --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{if eq .File.Name "'"$SECRET_NAME"'"}}{{.SecretName}}{{end}}{{end}}' \
    2>/dev/null || echo "")

# Update the service
if [[ -n "$CURRENT_SECRET" ]]; then
    docker service update \
        --secret-rm "$CURRENT_SECRET" \
        --secret-add "source=$NEW_SECRET_NAME,target=$SECRET_NAME" \
        "$SERVICE_NAME"
else
    docker service update \
        --secret-add "source=$NEW_SECRET_NAME,target=$SECRET_NAME" \
        "$SERVICE_NAME"
fi

echo "Waiting for service to stabilize..."
sleep 10

# Verify the update
docker service ps "$SERVICE_NAME" --filter "desired-state=running"

echo "Rotation complete. Old secret can be removed after verification."
if [[ -n "$CURRENT_SECRET" ]]; then
    echo "To remove old secret: docker secret rm $CURRENT_SECRET"
fi
```

## External Secrets Management

For production environments, integrate with external secrets managers like HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault.

### HashiCorp Vault Integration

Create an entrypoint script that fetches secrets from Vault before starting the application:

```bash
#!/bin/bash
# docker-entrypoint.sh - Fetch secrets from Vault

set -euo pipefail

# Vault configuration from environment
VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
VAULT_ROLE="${VAULT_ROLE:-myapp}"

# Authenticate with Vault using Kubernetes auth (if in K8s)
# or AppRole for Docker environments
if [[ -f "/var/run/secrets/kubernetes.io/serviceaccount/token" ]]; then
    # Kubernetes authentication
    JWT=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
    VAULT_TOKEN=$(curl -s --request POST \
        --data "{\"jwt\": \"$JWT\", \"role\": \"$VAULT_ROLE\"}" \
        "$VAULT_ADDR/v1/auth/kubernetes/login" | jq -r '.auth.client_token')
else
    # AppRole authentication
    VAULT_TOKEN=$(curl -s --request POST \
        --data "{\"role_id\": \"$VAULT_ROLE_ID\", \"secret_id\": \"$VAULT_SECRET_ID\"}" \
        "$VAULT_ADDR/v1/auth/approle/login" | jq -r '.auth.client_token')
fi

export VAULT_TOKEN

# Fetch secrets and write to /run/secrets equivalent
mkdir -p /tmp/secrets

# Fetch database credentials
DB_CREDS=$(curl -s --header "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/database/creds/myapp-db")

echo "$DB_CREDS" | jq -r '.data.username' > /tmp/secrets/db_user
echo "$DB_CREDS" | jq -r '.data.password' > /tmp/secrets/db_password

# Fetch API keys
API_SECRETS=$(curl -s --header "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/myapp/api")

echo "$API_SECRETS" | jq -r '.data.data.api_key' > /tmp/secrets/api_key

# Set permissions
chmod 600 /tmp/secrets/*

# Execute the main application
exec "$@"
```

Dockerfile using the Vault entrypoint:

```dockerfile
FROM python:3.12-slim

# Install dependencies for Vault integration
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nobody

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["python", "main.py"]
```

### AWS Secrets Manager Integration

For AWS environments, use the AWS SDK to fetch secrets:

```python
# config/aws_secrets.py
import json
import boto3
from botocore.exceptions import ClientError
from functools import lru_cache
from typing import Dict, Optional


@lru_cache(maxsize=32)
def get_aws_secret(secret_name: str, region_name: str = "us-east-1") -> Dict:
    """
    Fetch a secret from AWS Secrets Manager.
    Results are cached to avoid repeated API calls.
    """
    client = boto3.client(
        service_name="secretsmanager",
        region_name=region_name
    )

    try:
        response = client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ResourceNotFoundException":
            raise ValueError(f"Secret {secret_name} not found")
        elif error_code == "InvalidRequestException":
            raise ValueError(f"Invalid request for secret {secret_name}")
        elif error_code == "InvalidParameterException":
            raise ValueError(f"Invalid parameter for secret {secret_name}")
        else:
            raise

    # Parse the secret value
    if "SecretString" in response:
        return json.loads(response["SecretString"])
    else:
        # Binary secret
        import base64
        return {"binary": base64.b64decode(response["SecretBinary"])}


def get_database_credentials() -> Dict[str, str]:
    """Get database credentials from AWS Secrets Manager."""
    secret = get_aws_secret("myapp/database/credentials")
    return {
        "host": secret.get("host"),
        "port": secret.get("port", 5432),
        "username": secret.get("username"),
        "password": secret.get("password"),
        "database": secret.get("database"),
    }


def get_api_keys() -> Dict[str, str]:
    """Get API keys from AWS Secrets Manager."""
    return get_aws_secret("myapp/api/keys")
```

Docker Compose with AWS credentials:

```yaml
# docker-compose.aws.yml
version: "3.9"

services:
  backend:
    image: myapp/backend:latest
    environment:
      AWS_REGION: us-east-1
      # Use IAM roles instead of access keys when possible
      # These are only needed for local development
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:-}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-}
      SECRET_SOURCE: aws
      AWS_SECRET_NAME: myapp/production/credentials
    # For ECS/Fargate, use task IAM roles instead
```

## Production Deployment Example

Complete production setup combining multiple secrets management techniques:

```yaml
# docker-compose.production.yml
version: "3.9"

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--providers.docker.swarmmode=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    secrets:
      - traefik_tls_cert
      - traefik_tls_key
    deploy:
      placement:
        constraints:
          - node.role == manager

  api:
    image: myapp/api:${VERSION:-latest}
    secrets:
      - source: db_password
        target: db_password
        mode: 0400
      - source: jwt_secret
        target: jwt_secret
        mode: 0400
      - source: redis_password
        target: redis_password
        mode: 0400
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      REDIS_PASSWORD_FILE: /run/secrets/redis_password
      REDIS_HOST: redis
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.api.rule=Host(`api.example.com`)"
        - "traefik.http.services.api.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    secrets:
      - source: db_password
        target: db_password
        mode: 0400
      - source: db_user
        target: db_user
        mode: 0400
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_USER_FILE: /run/secrets/db_user
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.labels.db == true

  redis:
    image: redis:7-alpine
    command: >
      sh -c 'redis-server --requirepass "$$(cat /run/secrets/redis_password)"'
    secrets:
      - redis_password
    volumes:
      - redis_data:/data
    deploy:
      replicas: 1

  worker:
    image: myapp/worker:${VERSION:-latest}
    secrets:
      - db_password
      - redis_password
      - source: worker_api_key
        target: api_key
        mode: 0400
    environment:
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
      REDIS_PASSWORD_FILE: /run/secrets/redis_password
      API_KEY_FILE: /run/secrets/api_key
    deploy:
      replicas: 2

secrets:
  db_password:
    external: true
  db_user:
    external: true
  jwt_secret:
    external: true
  redis_password:
    external: true
  worker_api_key:
    external: true
  traefik_tls_cert:
    external: true
  traefik_tls_key:
    external: true

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  default:
    driver: overlay
    attachable: true
```

Deployment script:

```bash
#!/bin/bash
# deploy.sh - Deploy the production stack

set -euo pipefail

STACK_NAME="myapp"
COMPOSE_FILE="docker-compose.production.yml"

echo "Checking required secrets..."

REQUIRED_SECRETS=(
    "db_password"
    "db_user"
    "jwt_secret"
    "redis_password"
    "worker_api_key"
    "traefik_tls_cert"
    "traefik_tls_key"
)

MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! docker secret inspect "$secret" > /dev/null 2>&1; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo "ERROR: Missing required secrets:"
    printf '  - %s\n' "${MISSING_SECRETS[@]}"
    echo ""
    echo "Create secrets with:"
    echo "  echo 'secret_value' | docker secret create <secret_name> -"
    exit 1
fi

echo "All required secrets are present."

echo "Deploying stack: $STACK_NAME"
docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"

echo "Waiting for services to start..."
sleep 10

echo "Service status:"
docker stack services "$STACK_NAME"

echo ""
echo "Deployment complete. Monitor with:"
echo "  docker stack ps $STACK_NAME"
echo "  docker service logs ${STACK_NAME}_api"
```

## Security Best Practices Summary

| Practice | Description |
|----------|-------------|
| Never hardcode secrets | Use Docker secrets or external managers |
| Use file-based secrets | Read from files, not environment variables |
| Limit secret access | Only grant secrets to services that need them |
| Set proper permissions | Use mode 0400 for read-only by owner |
| Rotate regularly | Implement automated rotation procedures |
| Scan images | Use Trivy or Docker Scout to detect leaked secrets |
| Use .dockerignore | Prevent secret files from entering build context |
| Audit access | Log and monitor secret access patterns |
| Use short-lived secrets | Prefer dynamic secrets from Vault when possible |
| Encrypt at rest | Use encrypted storage for secret files |

## Troubleshooting Common Issues

### Secret Not Found in Container

If your application cannot find the secret file:

```bash
# Verify the secret is attached to the service
docker service inspect myapp_backend --format '{{json .Spec.TaskTemplate.ContainerSpec.Secrets}}' | jq

# Check inside a running container
docker exec -it $(docker ps -q -f name=myapp_backend) ls -la /run/secrets/

# Verify permissions
docker exec -it $(docker ps -q -f name=myapp_backend) stat /run/secrets/db_password
```

### Permission Denied Reading Secret

Ensure your application runs as the correct user:

```bash
# Check the user your app runs as
docker exec -it $(docker ps -q -f name=myapp_backend) id

# Verify secret ownership matches
docker exec -it $(docker ps -q -f name=myapp_backend) ls -la /run/secrets/
```

### Secret Changes Not Taking Effect

Secrets are immutable in Swarm. You must create a new secret and update the service:

```bash
# Create new secret version
echo "new_password" | docker secret create db_password_v2 -

# Update service to use new secret
docker service update \
    --secret-rm db_password \
    --secret-add source=db_password_v2,target=db_password \
    myapp_backend
```

## Conclusion

Docker secrets management provides a secure foundation for handling sensitive data in containerized applications. Key takeaways:

1. Use Docker secrets instead of environment variables for sensitive data
2. Design applications to read secrets from files at runtime
3. Never bake secrets into Docker images
4. Implement rotation strategies before you need them
5. Consider external secrets managers for complex environments
6. Regularly audit and scan for accidentally exposed secrets

Start with Docker Swarm secrets for simpler deployments, and integrate with HashiCorp Vault or cloud provider secrets managers as your infrastructure grows. The patterns shown here work across all these systems with minimal application changes.
