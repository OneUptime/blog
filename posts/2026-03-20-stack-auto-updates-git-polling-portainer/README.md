# How to Set Up Stack Auto-Updates from Git in Portainer (Polling) (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Git, Auto-Update, CI/CD

Description: Configure Portainer to automatically update stacks when changes are pushed to a Git repository using polling.

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
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a stack with environment variables via API
curl -X POST \
  "https://localhost:9443/api/stacks/create/standalone/string?endpointId=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "myapp",
    "StackFileContent": "services:\n  web:\n    image: nginx:latest",
    "Env": [
      {"name": "DB_PASSWORD", "value": "secretpassword"},
      {"name": "APP_ENV", "value": "production"}
    ],
    "FromAppTemplate": false
  }' \
  --insecure
```

## Auto-Update from Git (Polling)

Configure polling interval in the stack settings:
- Interval: e.g., `5m` for 5-minute polling
- Portainer checks for new commits and redeploys if changes are found

## Stack Webhook

```bash
# Trigger stack redeployment via webhook
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# Regular stack webhooks redeploy and pull images by default; add ?pullimage=false to skip pulling.
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: The compose file references an env_file such as stack.env, but that file is not available relative to compose.yml

# Fix 1: Add the referenced env file to the Git repository alongside compose.yml
# Fix 2: Load variables from an .env file in Portainer's Environment variables section and reference stack.env via env_file where supported
# Fix 3: Remove the env_file reference and define variables with environment entries using ${VARIABLE} values supplied by Portainer
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
