# How to Recover Orphaned Stacks in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Orphaned, Recovery, Troubleshooting

Description: Recover stacks that appear as orphaned in Portainer after database loss or migration issues.

---

Stacks in Portainer are Docker Compose applications deployed and managed through the UI. If an environment was deleted and later recreated on the same node, open **Stacks**, select the three-dot menu, choose **Show all orphaned stacks**, then open the orphaned stack and click **Associate** to reattach it. Once re-associated, Portainer provides lifecycle management, environment variable configuration, and Git-based GitOps workflows.

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
4. Enable **GitOps updates** for automatic update checks and redeployment when changes are detected
5. Click **Deploy the stack**

## Environment Variables

```bash
PORTAINER_API_KEY="your_api_key_here"

# Create a standalone stack with environment variables via API
curl -X POST \
  "https://localhost:9443/api/stacks/create/standalone/string?endpointId=1" \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "myapp",
    "stackFileContent": "services:\n  web:\n    image: nginx:latest\n    environment:\n      APP_ENV: ${APP_ENV}\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_PASSWORD: ${DB_PASSWORD}",
    "env": [
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
# Stack webhooks require Portainer Business Edition and a non-Edge environment
# Trigger a GitOps update check via webhook
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# Portainer checks the Git repository and redeploys if changes are found
# Add ?pullimage=false to the webhook URL to skip image pulls
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: your compose file references env_file: - stack.env, but Portainer
# only auto-creates stack.env for Web editor, Upload, or Custom template
# deployments when you define environment variables in Portainer.
# For Repository deployments, stack.env must already exist in the Git repository.

# Fix 1: For Git-based stacks, commit stack.env alongside your compose file
# Fix 2: For Web editor/Upload/Custom template stacks, define the variables in Portainer so it can generate stack.env
# Fix 3: Use a .env file for Compose variable substitution, or switch to explicit environment: entries instead of env_file: - stack.env
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
