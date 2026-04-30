# How to Force Pull Latest Images When Updating Stacks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Image, Force Pull, CI/CD

Description: Configure Portainer stacks to always pull the latest image version when redeploying, ensuring containers use the most current images.

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

1. Select **Git Repository** as the build method
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

# Create a Docker Standalone stack with environment variables via API
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
    ]
  }' \
  --insecure
```

## Auto-Update from Git (Polling)

Configure polling interval in the GitOps update settings:
- Set the fetch interval to control how often Portainer checks the repository
- Portainer checks for new commits and redeploys if changes are found

## Stack Webhook

```bash
# Trigger stack redeployment via webhook
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# By default, Portainer redeploys the stack and pulls the latest image for the same tag
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: The compose file references env_file: - stack.env, but that file is not available in this deployment context
# .env and stack.env are different: .env is for variable substitution, while stack.env is Portainer's env_file for Docker Standalone/Podman

# Fix 1: On Docker Standalone or Podman, define variables in Portainer or upload a .env file so Portainer can expose them as stack.env
# Fix 2: On Docker Swarm, remove env_file: - stack.env and define each variable manually in Portainer using ${VARIABLE} in environment:
# Fix 3: If you want to use a repository-managed env_file instead, reference the actual file name in env_file and keep that file alongside the compose file
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
