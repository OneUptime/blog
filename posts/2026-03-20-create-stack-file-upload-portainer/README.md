# How to Create a Stack from a File Upload in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Docker Compose, Upload, Deployment

Description: Upload a docker-compose.yml file to Portainer to create and deploy a stack on a connected environment.

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

version: "3.8"

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
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a stack with environment variables via API
curl -X POST \
  "https://localhost:9443/api/stacks/create/standalone/string?endpointId=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "myapp",
    "stackFileContent": "version: \"3.8\"\nservices:\n  web:\n    image: nginx:latest",
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
# Trigger stack redeployment via webhook
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# Portainer pulls the latest image of the same tag and redeploys the stack
# Use ?pullimage=false to redeploy without pulling, or ?tag=<newtag> to update the image tag
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: Docker Compose expects a .env file in the same directory as compose.yml

# Fix 1: Upload .env file via Portainer UI (Stack > .env file tab)
# Fix 2: Remove ${VARIABLE} references and use Portainer env vars instead
# Fix 3: Create the .env file in the Git repository alongside compose.yml
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
