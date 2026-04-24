# How to Use Portainer Environment Variables for Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment Variable, Secret, Docker, Security, DevOps

Description: Learn how to manage environment variables and secrets in Portainer stacks, including best practices for keeping sensitive values out of your Compose files.

---

Environment variables are the most common way to pass configuration to containers. Portainer provides several mechanisms for managing them - from inline Compose definitions to Portainer's own stack environment variable store. This guide covers best practices for using environment variables for secrets without hardcoding sensitive values.

---

## The Problem with Hardcoded Secrets

Never put secrets directly in your Compose files. They'll end up in version control.

```yaml
# BAD: secrets hardcoded in Compose file

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: mysecretpassword  # visible in git history forever
```

---

## Option 1: Portainer Stack Environment Variables

Portainer lets you define environment variables in the stack editor and inject them at deployment time.

In Portainer's Stack editor:
1. Open the **Environment variables** section
2. Add key/value pairs (e.g., `DB_PASSWORD` → `mysecretpassword`)
3. Reference them in the Compose file with `${DB_PASSWORD}`

```yaml
# Compose file using Portainer-managed env vars
version: "3.8"

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}      # resolved from Portainer-managed values
      POSTGRES_USER: ${DB_USER}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

The values are stored by Portainer rather than in the Compose file, so they stay out of version control. Users who can edit the stack can still view and change them in Portainer.

---

## Option 2: .env Files with Portainer

Portainer can import variables from a `.env` file using **Load variables from .env file** in the stack editor, including for stacks deployed from Git repositories.

```bash
# .env.example - committed without real values
DB_PASSWORD=changeme
DB_USER=appuser
DB_NAME=myapp
API_KEY=your-api-key-here

# .env - NOT committed, contains the real values you upload to Portainer
DB_PASSWORD=production-super-secret-password
DB_USER=produser
DB_NAME=prodapp
API_KEY=real-production-api-key
```

In Portainer's stack editor, click **Load variables from .env file** and upload your real `.env` file.

---

## Option 3: Docker Swarm Secrets (Most Secure)

For Swarm deployments, use Docker secrets instead of environment variables when your image supports reading secret values from files.

```yaml
# swarm-stack.yml - using secrets instead of env vars
version: "3.8"

services:
  db:
    image: postgres:15
    secrets:
      - db_password
    environment:
      # Postgres supports the _FILE convention for secrets
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    external: true   # created separately via: echo "value" | docker secret create db_password -
```

---

## Option 4: Portainer API for Programmatic Secret Injection

For Git-deployed stacks, use the Portainer API to redeploy the stack with updated environment variables from a CI/CD pipeline without editing the Compose file in Portainer.

```bash
# Redeploy a Git-based stack with updated environment variables
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-portainer-api-key"
STACK_ID="5"
ENDPOINT_ID="4"

# Redeploy the stack with new env vars
curl -X PUT \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Env": [
      {"name": "DB_PASSWORD", "value": "new-secure-password"},
      {"name": "API_KEY", "value": "new-api-key"}
    ],
    "Prune": false
  }' \
  "$PORTAINER_URL/api/stacks/$STACK_ID/git/redeploy?endpointId=$ENDPOINT_ID"
```

---

## Best Practices Summary

| Approach | Use Case | Security Level |
|---|---|---|
| Hardcoded in Compose | Never | Low |
| Portainer env var store | Small teams, simple setups | Medium |
| `.env` file uploaded to Portainer | Simple Portainer stack deployments | Medium |
| Docker Swarm secrets | Production Swarm workloads | High |
| External secrets manager (Vault, Infisical) | Enterprise, compliance | Very High |

---

## Summary

Portainer's environment variable store is the easiest way to keep sensitive values out of your Compose files for small deployments, but it is still Portainer-managed configuration rather than a dedicated secret mechanism. For production Swarm workloads, Docker secrets provide stronger protection by mounting values as files rather than environment variables. Always pair any approach with a `.gitignore` entry for `.env` files containing real credentials.
