# How to Use Docker Secrets in Swarm and Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Secrets, Security, Docker Swarm, Docker Compose

Description: Learn how to securely manage sensitive data like passwords, API keys, and certificates using Docker Secrets in Swarm mode and Docker Compose for both development and production environments.

---

Hardcoding passwords in environment variables or Docker Compose files is a security risk. Docker Secrets provides a secure way to manage sensitive data, keeping credentials encrypted at rest and only exposing them to containers that need them.

## Docker Secrets Overview

Docker Secrets are designed for sensitive data:
- Passwords and API keys
- TLS certificates and private keys
- SSH keys
- Database connection strings
- Any data you wouldn't want in a Dockerfile or version control

Secrets are:
- Encrypted at rest and in transit
- Only mounted into containers that explicitly request them
- Stored in memory (tmpfs), never written to disk in containers
- Available as files at `/run/secrets/<secret_name>`

## Secrets in Docker Swarm

Docker Swarm has native secret management. Secrets are encrypted and distributed only to nodes running services that need them.

### Creating Secrets

```bash
# Create secret from a file
echo "my-super-secret-password" > db_password.txt
docker secret create db_password db_password.txt
rm db_password.txt  # Remove the file after creating secret

# Create secret from stdin (more secure - no file on disk)
echo "my-super-secret-password" | docker secret create db_password -

# Create secret with specific content
printf "api_key_12345" | docker secret create api_key -
```

### Listing and Inspecting Secrets

```bash
# List all secrets
docker secret ls

# Inspect secret metadata (content is never shown)
docker secret inspect db_password

# Output shows metadata but NOT the secret value
```

### Using Secrets in Services

```bash
# Create a service with access to a secret
docker service create \
  --name db \
  --secret db_password \
  postgres

# The secret is available at /run/secrets/db_password inside the container
```

### Using Secrets with Custom Paths

```bash
# Mount secret at a specific path
docker service create \
  --name web \
  --secret source=tls_cert,target=/etc/nginx/ssl/cert.pem \
  --secret source=tls_key,target=/etc/nginx/ssl/key.pem,mode=0400 \
  nginx
```

### Complete Swarm Stack Example

```yaml
# docker-stack.yml
version: '3.8'

services:
  api:
    image: my-api
    secrets:
      - db_password
      - api_key
    environment:
      # Tell the app where to find secrets
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

  postgres:
    image: postgres:15
    secrets:
      - db_password
    environment:
      # Postgres supports _FILE suffix natively
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    external: true  # Secret must be created beforehand
  api_key:
    external: true
```

Deploy with:
```bash
# Create secrets first
echo "super-secret-db-pass" | docker secret create db_password -
echo "api-key-12345" | docker secret create api_key -

# Deploy stack
docker stack deploy -c docker-stack.yml myapp
```

## Secrets in Docker Compose (Development)

Docker Compose supports secrets for development, though they're less secure than Swarm secrets (they're bind-mounted files).

### File-Based Secrets

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    image: my-api
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

  postgres:
    image: postgres:15
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

Create the secrets directory:
```bash
mkdir secrets
echo "dev-password-123" > secrets/db_password.txt
echo "dev-api-key-456" > secrets/api_key.txt

# Add to .gitignore!
echo "secrets/" >> .gitignore
```

### Environment Variable Secrets (Compose v2.23+)

Newer Compose versions support secrets from environment variables.

```yaml
version: '3.8'

services:
  api:
    image: my-api
    secrets:
      - db_password

secrets:
  db_password:
    environment: DB_PASSWORD_VAR
```

Run with:
```bash
DB_PASSWORD_VAR="my-password" docker-compose up
```

## Reading Secrets in Applications

### Shell Script

```bash
#!/bin/sh
# Read secret from file
DB_PASSWORD=$(cat /run/secrets/db_password)
export DATABASE_URL="postgres://user:${DB_PASSWORD}@db:5432/mydb"
exec "$@"
```

### Node.js

```javascript
const fs = require('fs');

function readSecret(name) {
  const secretPath = `/run/secrets/${name}`;
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch (err) {
    // Fall back to environment variable for development
    const envName = name.toUpperCase();
    return process.env[envName];
  }
}

const dbPassword = readSecret('db_password');
const apiKey = readSecret('api_key');
```

### Python

```python
import os

def read_secret(name):
    """Read secret from file or environment variable."""
    secret_path = f'/run/secrets/{name}'
    try:
        with open(secret_path, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Fall back to environment variable
        return os.environ.get(name.upper())

db_password = read_secret('db_password')
api_key = read_secret('api_key')
```

### Go

```go
package main

import (
    "os"
    "strings"
)

func readSecret(name string) string {
    secretPath := "/run/secrets/" + name
    data, err := os.ReadFile(secretPath)
    if err != nil {
        // Fall back to environment variable
        return os.Getenv(strings.ToUpper(name))
    }
    return strings.TrimSpace(string(data))
}
```

## Handling _FILE Suffix Pattern

Many official Docker images support the `_FILE` suffix pattern, reading secrets from files automatically.

### Supported Images

- PostgreSQL: `POSTGRES_PASSWORD_FILE`
- MySQL: `MYSQL_ROOT_PASSWORD_FILE`
- MariaDB: `MARIADB_ROOT_PASSWORD_FILE`
- MongoDB: `MONGO_INITDB_ROOT_PASSWORD_FILE`

```yaml
services:
  postgres:
    image: postgres:15
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_USER: myapp
      POSTGRES_DB: myapp

  mysql:
    image: mysql:8
    secrets:
      - db_root_password
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/db_root_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  db_root_password:
    file: ./secrets/db_root_password.txt
```

### Adding _FILE Support to Your Images

For images that don't support the pattern natively, use an entrypoint script.

```bash
#!/bin/sh
# docker-entrypoint.sh

# Convert _FILE variables to regular variables
for var in $(env | grep '_FILE=' | cut -d= -f1); do
    base_var=${var%_FILE}
    file_path=$(eval echo \$$var)
    if [ -f "$file_path" ]; then
        export "$base_var"=$(cat "$file_path")
    fi
done

exec "$@"
```

```dockerfile
FROM node:18
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

## Secret Rotation

### Rotating Secrets in Swarm

```bash
# Create new version of secret
echo "new-password" | docker secret create db_password_v2 -

# Update service to use new secret
docker service update \
  --secret-rm db_password \
  --secret-add db_password_v2 \
  myservice

# Remove old secret
docker secret rm db_password
```

### Gradual Rotation Pattern

```yaml
# During rotation, mount both old and new secrets
services:
  api:
    secrets:
      - source: db_password_v1
        target: db_password_old
      - source: db_password_v2
        target: db_password
```

## Best Practices

### 1. Never Log Secrets

```javascript
// BAD
console.log(`Connecting with password: ${dbPassword}`);

// GOOD
console.log('Connecting to database...');
```

### 2. Use Restrictive Permissions

```yaml
secrets:
  - source: private_key
    target: /app/key.pem
    uid: '1000'
    gid: '1000'
    mode: 0400  # Read-only for owner
```

### 3. Separate Development and Production

```yaml
# docker-compose.yml (development)
secrets:
  db_password:
    file: ./secrets/db_password.txt

# docker-stack.yml (production)
secrets:
  db_password:
    external: true  # Must be created via docker secret create
```

### 4. Don't Commit Secrets to Git

```bash
# .gitignore
secrets/
*.pem
*.key
.env
```

## Summary

| Context | Method | Security Level |
|---------|--------|----------------|
| Swarm Production | `docker secret create` | High - encrypted at rest |
| Compose Development | File-based secrets | Medium - files on disk |
| Quick Development | Environment variables | Low - visible in process list |

Docker Secrets provides a secure foundation for credential management:

1. **In Swarm**: Use `docker secret create` and external secrets
2. **In Compose**: Use file-based secrets with proper `.gitignore`
3. **In Applications**: Support both file-based secrets and environment variables for flexibility
4. **Always**: Avoid logging secrets and use restrictive file permissions
