# How to Use Compose Secrets with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Secret, Security

Description: Learn how to use the Compose secrets directive with Podman to securely inject sensitive data into containers.

---

> Compose secrets mount sensitive data as files inside containers, keeping passwords and keys out of environment variables and image layers.

The Compose `secrets` directive provides a secure way to pass sensitive information like passwords, API keys, and certificates to containers. Instead of using environment variables, secrets are mounted as files, reducing the risk of accidental exposure in logs or the process environment.

---

## Defining File-Based Secrets

```yaml
# docker-compose.yml

version: "3.8"
services:
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

```bash
# Create the secret file
mkdir -p secrets
echo -n "supersecretpassword" > secrets/db_password.txt

# Deploy
podman-compose up -d

# Verify the secret is mounted
podman exec project_db_1 cat /run/secrets/db_password
# Output: supersecretpassword
```

## Multiple Secrets

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    image: docker.io/library/node:20-alpine
    command: node server.js
    secrets:
      - db_password
      - api_key
      - tls_cert
      - tls_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
  tls_cert:
    file: ./secrets/tls.crt
  tls_key:
    file: ./secrets/tls.key
```

```bash
# All secrets are mounted under /run/secrets/
podman exec project_app_1 ls /run/secrets/
# Output: api_key  db_password  tls_cert  tls_key
```

## Custom Mount Path

```yaml
services:
  app:
    image: docker.io/library/nginx:alpine
    secrets:
      - source: tls_cert
        target: /etc/ssl/certs/app.crt
      - source: tls_key
        target: /etc/ssl/private/app.key

secrets:
  tls_cert:
    file: ./secrets/tls.crt
  tls_key:
    file: ./secrets/tls.key
```

## Using Secrets with Custom Permissions

For `podman-compose`, `uid`, `gid`, and `mode` are applied to external Podman secrets. File-based secrets are mounted from the host file and do not have their ownership or mode remapped by the Compose provider.

```bash
echo -n "private-key-data" | podman secret create tls_key -
```

```yaml
services:
  app:
    image: docker.io/library/nginx:alpine
    secrets:
      - source: tls_key
        target: /etc/ssl/private/app.key
        uid: "0"
        gid: "0"
        mode: 0o400

secrets:
  tls_key:
    external: true
```

## Reading Secrets in Application Code

```python
# app.py - reading a secret from file
import os

def read_secret(name):
    secret_path = f"/run/secrets/{name}"
    with open(secret_path, "r") as f:
        return f.read().strip()

db_password = read_secret("db_password")
api_key = read_secret("api_key")
```

## Secrets vs Environment Variables

```yaml
# Environment variables - visible in the process environment and easy to log
services:
  app:
    environment:
      DB_PASSWORD: exposed_in_env  # Less secure

# Secrets - mounted as files, not stored directly in the process environment
services:
  app:
    secrets:
      - db_password  # More secure
```

## Summary

Compose secrets mount sensitive data as files under `/run/secrets/` inside containers. Define secrets with `file:` to reference local files, and use custom targets for specific mount paths. Secrets are more secure than environment variables because secret values are not stored directly in the process environment or container inspect output.
