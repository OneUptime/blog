# How to Set Up Stack Webhooks for Remote Redeployment in Portainer - Remote

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Webhook, CI/CD, Automation

Description: Enable Portainer stack webhooks to trigger stack redeployments from CI/CD pipelines and external systems.

---

Stacks in Portainer are Docker Compose applications deployed and managed through the UI. They provide lifecycle management, environment variable configuration, and Git-based GitOps workflows.

## Creating a Stack

Navigate to **Stacks > Add stack** to create a new stack. You can:
- Use the **Web editor** to write compose YAML directly
- **Upload** a docker-compose.yml file
- Pull from a **Git repository**
- Start from a **Custom template**

## Stack from Web Editor

```yaml
# Paste this in the Portainer web editor

services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

## Stack from Git Repository

1. Select **Repository** as the build method
2. Enter the repository URL: `https://github.com/org/repo`
3. Optionally set a branch and compose file path
4. Enable **GitOps updates** for automatic redeployment
5. Click **Deploy the stack**

## Environment Variables

```bash
PORTAINER_URL="https://localhost:9443"
PORTAINER_API_KEY="your_api_key"
ENDPOINT_ID=1

# Create a stack with environment variables via API
curl -X POST \
  "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "myapp",
    "StackFileContent": "services:\n  web:\n    image: nginx:latest",
    "Env": [
      {"name": "DB_PASSWORD", "value": "secretpassword"},
      {"name": "APP_ENV", "value": "production"}
    ]
  }' \
  --insecure
```

## Auto-Update from Git (Polling)

Configure polling interval in the stack settings:
- Interval: e.g., `5m` for 5-minute polling
- Portainer checks for new commits and redeploys if changes are found

## Stack Webhook

Stack webhooks require Portainer Business Edition and are available on non-Edge environments.

```bash
# Trigger stack redeployment via webhook
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# Portainer redeploys the stack and pulls the latest image for the existing tag by default.
# Add ?pullimage=false to the webhook URL to prevent image pulling.
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: The compose file references env_file: stack.env, but that file is not available in the deployment context

# Fix 1: Define variables in Portainer or use Load variables from .env file, then reference stack.env with env_file on Docker Standalone/Podman
# Fix 2: Remove env_file: stack.env and set values with environment: entries instead
# Fix 3: For Git stacks, commit the referenced env file alongside compose.yml, or define each variable manually on Docker Swarm
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
