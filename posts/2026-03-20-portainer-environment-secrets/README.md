# How to Use Portainer Environment Variables for Secrets - Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Secret, Environment Variable, Security, Docker

Description: Best practices for managing sensitive configuration through Portainer's environment variable system, including stack-level and environment-level secrets.

## Introduction

While Docker Swarm secrets and external secret managers are ideal for production, Portainer's built-in stack environment variable management provides a practical way to handle secrets for smaller deployments. This guide covers secure patterns for using environment variables in Portainer stacks.

## Portainer's Environment Variable Options

Portainer provides three ways to work with environment variables in stacks:

1. **Stack-level env vars** - Defined per stack in the UI
2. **Stack environment file** - Upload a `.env` file per stack
3. **`stack.env` with `env_file`** - Use Portainer-managed variables as a container env file on Docker Standalone and Podman

## Method 1: Stack-Level Environment Variables

In Portainer UI: **Stacks > Your Stack > Environment Variables**

```yaml
# compose.yml - reference env vars without defining values

services:
  app:
    image: myapp:latest
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - API_KEY=${API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
```

Then in Portainer's stack editor, set the values under **Environment Variables** before deploying. Portainer stores the values with the stack in its database. If you need encryption at rest for that data, enable Portainer database encryption.

## Method 2: Stack Environment File

Create a `.env` file for each environment:

```bash
# .env.production
DB_HOST=prod-db.internal
DB_PASSWORD=prod-secure-password-123
API_KEY=prod-api-key-here
JWT_SECRET=prod-jwt-secret-here
SMTP_HOST=smtp.sendgrid.net
SMTP_PASSWORD=prod-smtp-password
LOG_LEVEL=warn
```

Upload via Portainer:
1. Go to **Stacks > Add Stack**
2. Under **Environment Variables**, click "Load variables from .env file"
3. Upload your `.env` file
4. Portainer imports the variables into the stack configuration

## Method 3: `stack.env` with `env_file`

On Docker Standalone and Podman environments, you can expose the variables you defined in Portainer through `stack.env`:

```yaml
services:
  app:
    image: myapp:latest
    env_file:
      - stack.env
```

Portainer populates `stack.env` from the variables you define in the UI or upload from a `.env` file. This does not work on Docker Swarm because `docker stack deploy` does not support `env_file`; on Swarm, define each environment variable manually in Portainer.

## Securing Environment Variables

### Defining Variables Through the Portainer API

You can also create a stack and pass its environment variables in the API request:

```bash
# Via Portainer API: create a stack with environment variables
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "my-app",
    "StackFileContent": "services:\n  app:\n    image: nginx:latest\n    environment:\n      DB_PASSWORD: ${DB_PASSWORD}\n",
    "Env": [
      {
        "name": "DB_PASSWORD",
        "value": "my-secret-password"
      }
    ]
  }' \
  "https://portainer.example.com/api/stacks/create/standalone/string?endpointId=1"
```

### Using Variable Substitution with Defaults

```yaml
# docker-compose.yml with defaults and required variables
services:
  app:
    image: myapp:latest
    environment:
      # Required - will fail if not set
      - DB_PASSWORD=${DB_PASSWORD:?DB_PASSWORD is required}
      
      # Optional with default
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - MAX_CONNECTIONS=${MAX_CONNECTIONS:-100}
      
      # Required with custom error message
      - API_KEY=${API_KEY:?Set API_KEY before deploying}
```

### Creating an Environment Template

Store non-sensitive defaults in the compose file and sensitive values in Portainer:

```yaml
# App template for multiple environments

x-common-env: &common-env
  environment:
    # Non-sensitive (in compose file)
    APP_NAME: MyApplication
    LOG_FORMAT: json
    TIMEZONE: UTC
    
    # Sensitive (set per environment in Portainer)
    DB_PASSWORD: ${DB_PASSWORD}
    API_SECRET: ${API_SECRET}
    ENCRYPTION_KEY: ${ENCRYPTION_KEY}

services:
  app:
    image: myapp:${APP_VERSION:-latest}
    <<: *common-env
    
  worker:
    image: myapp-worker:${APP_VERSION:-latest}
    <<: *common-env
```

## Best Practices

### What to Put in Environment Variables vs Docker Secrets

| Use Environment Variables For | Use Docker Secrets For |
|-------------------------------|----------------------|
| Non-sensitive config (log level) | Passwords |
| Service URLs | API keys |
| Feature flags | TLS certificates |
| Resource limits | Private keys |
| Timeouts | Database credentials |

### Preventing Secret Leakage

```text
# Never put secrets directly in Compose files committed to git
# WRONG:
environment:
  DB_PASSWORD: "hardcoded-password"  # Never do this!

# RIGHT - reference from environment:
environment:
  DB_PASSWORD: ${DB_PASSWORD}

# Add .env to .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore

# Create example file without real values
cat > .env.example << 'EOF'
DB_PASSWORD=your-database-password-here
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here
EOF
```

## Auditing Variable Usage

```bash
# Check which stacks use which variables
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/stacks" \
  | python3 -c "
import sys, json
stacks = json.load(sys.stdin)
for s in stacks:
    for env in (s.get('Env') or []):
        print(f'{s[\"Name\"]}: {env[\"name\"]}')
"
```

## Conclusion

Portainer's environment variable management provides a practical way to keep sensitive values out of Compose files for teams not ready for dedicated secrets managers. By keeping values in Portainer's database rather than in version-controlled Compose files, you reduce accidental exposure in source control. For stronger protection at rest, enable Portainer database encryption. For production workloads, combine this with Docker Swarm secrets or an external secrets manager for defense in depth.
