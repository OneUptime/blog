# How to Manage Docker Secrets via Portainer on Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Secret, Security, DevOps

Description: Manage Docker Swarm secrets for sensitive configuration data using Portainer's built-in secrets management interface.

## Introduction

Docker Swarm secrets provide encrypted storage for sensitive data like passwords, API keys, and certificates. Portainer exposes Docker's secrets API through a web UI, making it easy to create, manage, and assign secrets to Swarm services without exposing them in environment variables or compose files.

## Prerequisites

- Docker Swarm cluster managed by Portainer
- At least one manager node
- Portainer with Swarm environment configured

## Creating Secrets via Portainer UI

Navigate to: **Secrets > Add secret**

Fill in:
- Name: `db_password`
- Secret: `MySecurePassword123!`
- Click "Create the secret"

## Creating Secrets via CLI

```bash
# Create a secret from a string

printf '%s' "MySecurePassword123!" | docker secret create db_password -

# Create a secret from a file
docker secret create ssl_certificate /path/to/certificate.crt
docker secret create ssl_private_key /path/to/private.key

# Create a secret from a generated value
printf '%s' "$(openssl rand -base64 32)" | docker secret create app_secret_key -

# List all secrets (values are NOT shown)
docker secret ls

# Inspect a secret (metadata only, not the value)
docker secret inspect db_password
```

## Using Secrets in Swarm Services

```yaml
# swarm-stack.yml - using Docker secrets
version: '3.8'

services:
  web:
    image: myapp:latest
    deploy:
      replicas: 3
    secrets:
      - db_password
      - app_secret_key
    environment:
      # Reference the secret file path (DO NOT put the actual secret here)
      DB_PASSWORD_FILE: /run/secrets/db_password
      SECRET_KEY_FILE: /run/secrets/app_secret_key
    networks:
      - app-network

  db:
    image: postgres:15
    deploy:
      replicas: 1
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    networks:
      - app-network

  nginx:
    image: nginx:latest
    deploy:
      replicas: 2
    secrets:
      - source: ssl_certificate
        target: /etc/nginx/ssl/server.crt
        mode: 0444
      - source: ssl_private_key
        target: /etc/nginx/ssl/server.key
        mode: 0400

secrets:
  db_password:
    external: true
  app_secret_key:
    external: true
  ssl_certificate:
    external: true
  ssl_private_key:
    external: true

networks:
  app-network:
    driver: overlay
```

## Reading Secrets in Application Code

Applications should read secrets from files, not environment variables:

```python
# Python example: reading Docker secrets
def read_secret(secret_name: str, default: str = None) -> str:
    """Read a Docker secret from /run/secrets/"""
    secret_path = f"/run/secrets/{secret_name}"
    try:
        with open(secret_path, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Fall back to environment variable for local development
        import os
        env_value = os.environ.get(secret_name.upper())
        if env_value:
            return env_value
        if default is not None:
            return default
        raise ValueError(f"Secret {secret_name} not found")

# Usage
db_password = read_secret('db_password')
secret_key = read_secret('app_secret_key')
```

```bash
# Shell script reading secrets
#!/bin/bash
PGPASSFILE=$(mktemp)
trap 'rm -f "$PGPASSFILE"' EXIT
chmod 600 "$PGPASSFILE"
printf 'db:5432:mydb:user:%s\n' "$(cat /run/secrets/db_password)" > "$PGPASSFILE"

# Use a temporary password file instead of exposing the password in argv
PGPASSFILE="$PGPASSFILE" psql -h db -U user -d mydb
```

## Rotating Secrets

```bash
# Create a new version of the secret
printf '%s' "NewPassword456!" | docker secret create db_password_v2 -

# Update service to use new secret (causes rolling update)
docker service update \
  --secret-rm db_password \
  --secret-add source=db_password_v2,target=db_password \
  my_service

# After confirming new secret works, remove the old one
docker secret rm db_password
```

## Secrets vs Environment Variables

| Feature | Docker Secrets | Environment Variables |
|---------|---------------|----------------------|
| Encryption at rest | Yes | No |
| Encryption in transit | Yes | No |
| Visible in `docker inspect` | No | Yes |
| Visible in process list | No | Yes |
| Accessible outside Swarm | No | Yes |
| Version control safe | Yes | No |

## Conclusion

Docker Swarm secrets with Portainer provide a secure, auditable way to manage sensitive configuration. Secrets are encrypted at rest and in transit, never appear in `docker inspect` output, and are only accessible within the container at runtime. Portainer's UI makes creating and managing secrets straightforward, eliminating the need to memorize CLI commands.
