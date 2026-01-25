# How to Use Docker Secrets for Sensitive Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Security, Secrets, DevOps, Docker Swarm

Description: Protect sensitive data in Docker deployments using Docker secrets, build-time secrets with BuildKit, and external secret managers. Keep passwords, API keys, and certificates out of images and environment variables.

---

Hardcoding passwords, API keys, and certificates in Docker images or environment variables creates security risks. Anyone with image access can extract secrets, and environment variables appear in logs and process listings. Docker secrets provide a secure way to manage sensitive data in containerized applications.

## Why Environment Variables Are Risky

Environment variables seem convenient but have serious drawbacks:

```bash
# BAD: Secrets visible in docker inspect output
docker run -e DATABASE_PASSWORD=supersecret myapp

# Anyone can see them
docker inspect mycontainer | grep -A 5 "Env"

# They appear in process listings
docker exec mycontainer ps eww
```

Environment variables also get inherited by child processes and often end up in logs during debugging.

## Docker Swarm Secrets

Docker Swarm provides built-in secret management. Secrets are encrypted at rest and in transit, mounted as files in containers.

### Creating Secrets

```bash
# Create secret from a file
echo "mysuperpassword" | docker secret create db_password -

# Create secret from a file
docker secret create ssl_cert ./server.crt

# List secrets
docker secret ls
```

### Using Secrets in Services

```bash
# Deploy service with secret
docker service create \
  --name myapp \
  --secret db_password \
  --secret ssl_cert \
  myapp:latest
```

Inside the container, secrets appear as files:

```bash
# Secrets mounted at /run/secrets/
cat /run/secrets/db_password
```

### Docker Compose with Swarm Secrets

```yaml
# docker-compose.yml (for Swarm mode)
version: '3.8'

services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
    environment:
      # Reference secret file path, not the value
      - DB_PASSWORD_FILE=/run/secrets/db_password

  db:
    image: postgres:16
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    external: true
  api_key:
    file: ./secrets/api_key.txt
```

### Reading Secrets in Your Application

Most applications expect environment variables, not files. Read the secret file at startup:

```python
# Python example
import os

def get_secret(name):
    """Read secret from file or fall back to environment variable."""
    secret_file = os.environ.get(f'{name}_FILE')
    if secret_file and os.path.exists(secret_file):
        with open(secret_file, 'r') as f:
            return f.read().strip()
    return os.environ.get(name)

# Usage
db_password = get_secret('DB_PASSWORD')
```

```javascript
// Node.js example
const fs = require('fs');

function getSecret(name) {
  // Check for file-based secret first
  const secretFile = process.env[`${name}_FILE`];
  if (secretFile && fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  // Fall back to environment variable
  return process.env[name];
}

// Usage
const dbPassword = getSecret('DB_PASSWORD');
```

## BuildKit Secrets for Build Time

Sometimes you need secrets during image builds (like private npm registries). BuildKit provides secure build-time secrets:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

# Mount secret during npm install, never stored in image layer
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

Build with the secret:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with secret
docker build \
  --secret id=npm_token,src=$HOME/.npmrc \
  -t myapp:latest .
```

The secret is never stored in any image layer, so it cannot be extracted from the final image.

## Docker Compose Secrets for Development

For local development, Docker Compose supports file-based secrets without Swarm:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    secrets:
      - db_password
      - api_key
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - API_KEY_FILE=/run/secrets/api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

Create the secrets directory:

```bash
mkdir -p secrets
echo "localdevpassword" > secrets/db_password.txt
echo "dev-api-key-12345" > secrets/api_key.txt

# Secure the files
chmod 600 secrets/*

# Add to .gitignore
echo "secrets/" >> .gitignore
```

## Integrating External Secret Managers

For production, integrate with dedicated secret managers like HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault.

### HashiCorp Vault Integration

```yaml
# docker-compose.yml with Vault agent sidecar
version: '3.8'

services:
  vault-agent:
    image: hashicorp/vault:latest
    command: agent -config=/vault/config/agent.hcl
    volumes:
      - ./vault-config:/vault/config:ro
      - secrets-volume:/secrets
    environment:
      VAULT_ADDR: https://vault.example.com:8200

  app:
    image: myapp:latest
    volumes:
      - secrets-volume:/run/secrets:ro
    depends_on:
      - vault-agent

volumes:
  secrets-volume:
```

```hcl
# vault-config/agent.hcl
auto_auth {
  method {
    type = "kubernetes"
    config = {
      role = "myapp"
    }
  }
}

template {
  source      = "/vault/config/db-password.tpl"
  destination = "/secrets/db_password"
}
```

### AWS Secrets Manager with Init Container

```yaml
# docker-compose.yml
version: '3.8'

services:
  secrets-init:
    image: amazon/aws-cli:latest
    command: >
      secretsmanager get-secret-value
      --secret-id myapp/production
      --query SecretString
      --output text > /secrets/config.json
    volumes:
      - secrets-volume:/secrets
    environment:
      AWS_REGION: us-east-1

  app:
    image: myapp:latest
    volumes:
      - secrets-volume:/run/secrets:ro
    depends_on:
      secrets-init:
        condition: service_completed_successfully

volumes:
  secrets-volume:
```

## Secret Rotation

Design your application to handle secret rotation:

```python
import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class SecretWatcher(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback

    def on_modified(self, event):
        if not event.is_directory:
            self.callback(event.src_path)

def watch_secrets(secrets_dir='/run/secrets'):
    """Watch for secret file changes and trigger reload."""
    def reload_secret(path):
        secret_name = os.path.basename(path)
        print(f"Secret {secret_name} changed, reloading...")
        # Implement your reload logic here

    observer = Observer()
    handler = SecretWatcher(reload_secret)
    observer.schedule(handler, secrets_dir, recursive=False)
    observer.start()
```

## Security Best Practices

### 1. Never Log Secrets

```python
import logging

# Configure logging to redact secrets
class SecretFilter(logging.Filter):
    def __init__(self, patterns):
        super().__init__()
        self.patterns = patterns

    def filter(self, record):
        message = record.getMessage()
        for pattern in self.patterns:
            if pattern in message:
                record.msg = record.msg.replace(pattern, '***REDACTED***')
        return True

# Add filter to logger
logger = logging.getLogger()
secret_filter = SecretFilter([os.environ.get('API_KEY', '')])
logger.addFilter(secret_filter)
```

### 2. Use Read-Only Mounts

```yaml
services:
  app:
    secrets:
      - source: db_password
        target: /run/secrets/db_password
        mode: 0400  # Read-only by owner
```

### 3. Minimize Secret Scope

Only give containers the secrets they need:

```yaml
services:
  api:
    secrets:
      - api_key
      - db_password

  worker:
    secrets:
      - db_password
      # No api_key - worker doesn't need it
```

### 4. Audit Secret Access

```bash
# Monitor secret file access in container
docker exec mycontainer sh -c \
  "inotifywait -m /run/secrets -e access -e open"
```

---

Docker secrets provide a foundation for secure credential management. Use Swarm secrets or file-based secrets in Compose for basic deployments, BuildKit secrets for build-time credentials, and external secret managers for production environments. Always design your applications to read secrets from files rather than environment variables, and implement proper secret rotation handling.
