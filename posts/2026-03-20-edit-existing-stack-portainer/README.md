# How to Edit an Existing Stack in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack, Docker Compose, Edit, DevOps

Description: Update the configuration of an existing stack in Portainer using the web editor or by modifying environment variables.

---

Stacks in Portainer are Compose-based applications deployed and managed through the UI. How you edit an existing stack depends on how it was deployed: file-based stacks can be updated in the Editor tab, while Git-based stacks must be updated in the repository or detached from Git first. Portainer also provides environment variable management and Git-based GitOps workflows.

## Editing a Stack

Navigate to **Stacks** and select the stack you want to update. You can:
- Use the **Editor** tab to update the compose file for stacks created with the **Web editor** or **Upload**
- Update **Environment variables** from the same stack view
- For stacks deployed from a **Git repository**, edit the compose file in Git, then use **Pull and redeploy** or GitOps updates
- **Detach from Git** if you need to edit a Git-based stack directly in Portainer

## Stack from Web Editor

```yaml
# Edit this in the Portainer Editor tab

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

1. Update the compose file in your Git repository
2. Commit and push the change
3. In Portainer, open the stack and click **Pull and redeploy**, or let **GitOps updates** redeploy it
4. You can still view and edit the stack's environment variables in Portainer
5. If you want to edit the compose file directly in Portainer, **Detach from Git** first

## Environment Variables

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

STACK_ID=1
STACK_FILE_CONTENT=$(curl -s \
  https://localhost:9443/api/stacks/$STACK_ID/file \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['StackFileContent']))")

# Update an existing stack's environment variables via API
curl -X PUT \
  "https://localhost:9443/api/stacks/$STACK_ID?endpointId=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"stackFileContent\": $STACK_FILE_CONTENT,
    \"env\": [
      {\"name\": \"DB_PASSWORD\", \"value\": \"secretpassword\"},
      {\"name\": \"APP_ENV\", \"value\": \"production\"}
    ]
  }" \
  --insecure
```

## Auto-Update from Git (Polling)

Configure polling interval in the stack settings:
- Interval: e.g., `5m` for 5-minute polling
- Portainer checks for new commits and redeploys if changes are found

## Stack Webhook

```bash
# Trigger stack redeployment via webhook (Portainer Business Edition)
STACK_WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/<uuid>"

curl -X POST "$STACK_WEBHOOK_URL"
# Portainer redeploys the stack and pulls the latest image for the current tag by default
```

## Fix stack.env Not Found

```bash
# Error: "stack.env: no such file or directory"
# Cause: `stack.env` is a Portainer-generated `env_file` for Docker Standalone/Podman.
# It is not the same as Docker Compose's `.env` file used for general variable substitution.

# Fix 1: Add variables in Portainer's Environment variables section or use Load variables from .env file
# Fix 2: Use `env_file: - stack.env` only on Docker Standalone or Podman
# Fix 3: On Docker Swarm, remove `env_file: - stack.env` and define each variable manually in Portainer
# Fix 4: If you need Compose interpolation for non-environment fields, keep a real `.env` file next to the compose file
```

---

*Monitor deployed stacks and services with [OneUptime](https://oneuptime.com) for production reliability.*
