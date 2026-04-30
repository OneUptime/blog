# How to Fix stack.env Not Found Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Error, .env, Troubleshooting

Description: Resolve the common 'stack.env not found' error when deploying Docker Compose stacks in Portainer.

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
# Define DB_PASSWORD in Portainer before deploying

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

1. Select **Git Repository** as the build method
2. Enter the repository URL: `https://github.com/org/repo`
3. Optionally set a branch and compose file path
4. Enable **GitOps updates** for automatic updates
5. Click **Deploy the stack**

## Environment Variables

```bash
# Create a Portainer API access token first, then create a standalone stack
curl -X POST \
  "https://localhost:9443/api/stacks/create/standalone/string?endpointId=1" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "myapp",
    "StackFileContent": "services:\n  web:\n    image: nginx:latest\n    environment:\n      APP_ENV: ${APP_ENV}\n      DB_PASSWORD: ${DB_PASSWORD}",
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

```bash
# Portainer Business Edition only; not available on Edge environments
# Trigger stack redeployment via webhook
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# Portainer redeploys the stack and pulls the latest image for the same tag
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: The stack references env_file: - stack.env
# Portainer uses stack.env on Docker Standalone and Podman, not Docker Swarm

# Fix 1: On Docker Standalone or Podman, use Portainer's "Load variables from .env file" option
# Fix 2: On Docker Swarm, remove env_file: - stack.env and define variables in Portainer
# Fix 3: For Git-based standalone stacks, keep a .env file beside compose.yml if Compose should load it
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
