# How to Deploy Infisical Secrets Manager via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Infisical, Secrets Management, Docker, DevOps, Security

Description: Learn how to self-host Infisical secrets manager via Portainer and use it to inject secrets into your containerized applications.

---

Infisical is an open-source secrets manager with end-to-end encryption, a developer-friendly CLI, SDKs for multiple languages, and a Kubernetes operator. You can self-host it entirely using Portainer, giving your team a HashiCorp Vault alternative that's easier to set up and use. This guide covers deploying Infisical via Portainer and integrating it with your container workloads.

---

## Step 1: Deploy Infisical via Portainer Stack

Infisical requires PostgreSQL for storage and Redis for caching. Deploy them together as a stack.

```yaml
# infisical-stack.yml - complete Infisical self-hosted deployment

version: "3.8"

services:
  infisical:
    image: infisical/infisical:latest
    container_name: infisical
    restart: unless-stopped
    depends_on:
      - db
      - redis
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: production
      ENCRYPTION_KEY: "your-32-char-encryption-key-here"   # generate with: openssl rand -hex 16
      AUTH_SECRET: "your-auth-secret-here"                  # generate with: openssl rand -base64 32
      DB_CONNECTION_URI: "postgresql://infisical:infisical-db-password@db:5432/infisical"
      REDIS_URL: "redis://redis:6379"
      SITE_URL: "https://infisical.example.com"

  db:
    image: postgres:14
    restart: unless-stopped
    environment:
      POSTGRES_DB: infisical
      POSTGRES_USER: infisical
      POSTGRES_PASSWORD: infisical-db-password
    volumes:
      - infisical_db:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - infisical_redis:/data

volumes:
  infisical_db:
  infisical_redis:
```

---

## Step 2: Complete the Setup

1. Open Infisical at `http://<server-ip>:8080`
2. Create your admin account
3. Create a new project (e.g., `myapp`)
4. Add secrets to the project under **Environments > Development/Staging/Production**

---

## Step 3: Install the Infisical CLI

```bash
# Install Infisical CLI
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo bash
sudo apt-get update && sudo apt-get install -y infisical

# Or via npm
npm install -g @infisical/cli

# Authenticate
infisical login --domain http://localhost:8080

# Verify connection
infisical secrets --projectId your-project-id --env dev
```

---

## Step 4: Inject Infisical Secrets into Portainer Containers

Use the Infisical CLI to export secrets as environment variables when starting containers, or use the Infisical Agent.

```bash
# Export secrets and run your application with injected env vars
infisical run \
  --projectId "your-project-id" \
  --env "production" \
  --domain "http://infisical:8080" \
  -- node server.js
```

For Portainer stacks, use the Infisical CLI as an entrypoint wrapper:

```yaml
# app-with-infisical-stack.yml
version: "3.8"

services:
  app:
    image: node:18
    restart: unless-stopped
    environment:
      INFISICAL_TOKEN: ${INFISICAL_MACHINE_IDENTITY_TOKEN}
      INFISICAL_PROJECT_ID: "your-project-id"
      INFISICAL_ENVIRONMENT: "production"
      INFISICAL_DOMAIN: "http://infisical:8080"
    entrypoint: ["infisical", "run", "--", "node", "server.js"]
    volumes:
      - ./app:/app
    working_dir: /app
    depends_on:
      - infisical
```

---

## Step 5: Use Infisical SDK in Python

```python
# app.py - fetching secrets from Infisical using the Python SDK
from infisical_sdk import InfisicalSDKClient

# Initialize the Infisical client against your self-hosted instance
client = InfisicalSDKClient(host="http://infisical:8080")

# Authenticate with a machine identity using Universal Auth
client.auth.universal_auth.login(
    client_id="your-machine-identity-client-id",
    client_secret="your-machine-identity-client-secret"
)

# Fetch a specific secret
secret = client.secrets.get_secret_by_name(
    secret_name="DB_PASSWORD",
    project_id="your-project-id",
    environment_slug="prod",
    secret_path="/"
)

db_password = secret.secretValue
print("Database password loaded from Infisical")
```

---

## Summary

Infisical self-hosted via Portainer gives your team a modern, open-source secrets manager with a great developer experience. Deploy the full stack (Infisical + PostgreSQL + Redis) with a single Portainer stack deployment, then use the CLI or SDK to inject secrets into your containers at runtime. No secrets ever touch your Compose files or version control.
