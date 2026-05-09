# How to Use Secrets with Podman Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Podman Compose, Docker Compose

Description: Learn how to define and use secrets in Podman Compose files for multi-container applications.

---

Podman's `podman compose` command runs an external Compose provider such as Docker Compose or podman-compose. With a provider that supports Compose secrets, you can manage sensitive data declaratively in your multi-container application stack.

When running multi-container applications with Podman Compose, you can define secrets in your compose file to securely deliver passwords, API keys, and other sensitive data to your services. This keeps credentials out of environment variables and image layers.

---

## Basic Secrets in Compose

```yaml
# docker-compose.yml

services:
  web:
    image: my-web-app:latest
    secrets:
      - db_password
      - api_key

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

## Setting Up the Secret Files

```bash
# Create a secrets directory
mkdir -p secrets

# Create the secret files
echo -n "my-database-password" > secrets/db_password.txt
echo -n "sk-my-api-key-123" > secrets/api_key.txt

# Set restrictive permissions
chmod 600 secrets/*.txt

# Start the stack
podman compose up -d
```

## Using External Secrets

```bash
# Pre-create secrets with Podman
echo -n "my-password" | podman secret create db_password -
echo -n "my-api-key" | podman secret create api_key -
```

```yaml
# docker-compose.yml using pre-existing Podman secrets
services:
  web:
    image: my-web-app:latest
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    external: true
  api_key:
    external: true
```

## Secrets with Custom Mount Targets

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:latest
    ports:
      - "443:443"
    secrets:
      - source: tls_cert
        target: /etc/nginx/ssl/server.crt
        mode: 0444
      - source: tls_key
        target: /etc/nginx/ssl/server.key
        mode: 0400

secrets:
  tls_cert:
    file: ./certs/server.crt
  tls_key:
    file: ./certs/server.key
```

## Secrets with File Path Environment Variables

Compose secrets are mounted as files. Many images and applications support `*_FILE` environment variables that point to those files.

```yaml
# docker-compose.yml
services:
  app:
    image: my-app:latest
    environment:
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

## Full Application Stack Example

```yaml
# docker-compose.yml
services:
  app:
    image: my-app:latest
    ports:
      - "8080:8080"
    secrets:
      - db_password
      - api_key
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: myapp
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    command: >
      sh -c 'redis-server --requirepass "$$(cat /run/secrets/redis_password)"'
    secrets:
      - redis_password

volumes:
  db_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
  redis_password:
    file: ./secrets/redis_password.txt
```

## Summary

Podman's Compose support can use secrets with the Compose syntax supported by the configured provider. Define secrets in the `secrets` top-level key using either file-based or external (pre-created) secrets. Attach them to services to make them available as files under `/run/secrets/`, then have your application read those files directly or use image-supported `*_FILE` environment variables. This approach keeps sensitive data out of your compose file and image layers while providing a declarative way to manage credentials across multi-container applications.
