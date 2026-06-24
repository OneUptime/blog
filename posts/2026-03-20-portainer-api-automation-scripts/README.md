# How to Automate Portainer Configuration with API Scripts - Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, DevOps, Infrastructure

Description: Learn how to write comprehensive automation scripts using the Portainer API to configure environments, users, registries, and stacks in a repeatable, infrastructure-as-code style.

## Introduction

The Portainer API enables you to script your entire Portainer configuration - from initial setup through team creation, registry configuration, and stack deployments. This guide shows how to build idempotent automation scripts that can provision a fresh Portainer instance or safely re-run against an existing one without creating duplicate resources.

## Prerequisites

- Portainer CE or BE instance (fresh or existing)
- Bash, Python, or similar scripting environment
- `curl`, `jq` installed
- Access to your container image registry credentials

## Script Design Principles

1. **Idempotent**: Running the script multiple times produces the same result
2. **Check before create**: Avoid duplicates by checking if resources exist first
3. **Use environment variables**: Never hardcode credentials in scripts
4. **Log clearly**: Output progress and errors with timestamps
5. **Exit on error**: Use `set -euo pipefail` in bash scripts

## Complete Portainer Bootstrap Script

```bash
#!/bin/bash
# portainer-bootstrap.sh - Idempotent Portainer configuration

set -euo pipefail

# ===== Configuration (set via environment variables) =====

PORTAINER_URL="${PORTAINER_URL:-https://portainer.example.com}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:?ADMIN_PASS is required}"
DOCKER_HOST_URL="${DOCKER_HOST_URL:-unix:///var/run/docker.sock}"
REGISTRY_URL="${REGISTRY_URL:-registry.company.com}"
REGISTRY_USER="${REGISTRY_USER:-portainer-svc}"
REGISTRY_PASS="${REGISTRY_PASS:?REGISTRY_PASS is required}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ===== Helper Functions =====

api_get() {
  curl -fsS -H "Authorization: Bearer $TOKEN" "$PORTAINER_URL/api/$1"
}

api_post() {
  curl -fsS -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/$1" -d "$2"
}

api_put() {
  curl -fsS -X PUT -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/$1" -d "$2"
}

# ===== Step 1: Wait for Portainer =====
log "Waiting for Portainer to start..."
until curl -sf "$PORTAINER_URL/api/system/status" > /dev/null 2>&1; do
  sleep 3
done
log "Portainer is ready."

# ===== Step 2: Initialize or authenticate =====
ADMIN_CHECK_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$PORTAINER_URL/api/users/admin/check")

if [ "$ADMIN_CHECK_STATUS" = "404" ]; then
  log "Initializing admin user..."
  INIT_PAYLOAD=$(jq -n --arg username "$ADMIN_USER" --arg password "$ADMIN_PASS" \
    '{Username: $username, Password: $password}')
  curl -fsS -X POST "$PORTAINER_URL/api/users/admin/init" \
    -H "Content-Type: application/json" \
    -d "$INIT_PAYLOAD" > /dev/null
  log "Admin user created."
elif [ "$ADMIN_CHECK_STATUS" != "204" ]; then
  log "Admin check returned unexpected status: $ADMIN_CHECK_STATUS"
  exit 1
fi

AUTH_PAYLOAD=$(jq -n --arg username "$ADMIN_USER" --arg password "$ADMIN_PASS" \
  '{Username: $username, Password: $password}')
TOKEN=$(curl -fsS -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d "$AUTH_PAYLOAD" | jq -er '.jwt')
log "Authenticated."

# ===== Step 3: Configure settings =====
log "Configuring global settings..."
api_put "settings" '{
  "AuthenticationMethod": 1,
  "SnapshotInterval": "5m"
}' > /dev/null
log "Settings updated."

# ===== Step 4: Add environment (idempotent) =====
EXISTING_EP=$(api_get "endpoints" | jq -r '.[] | select(.Name == "production") | .Id // empty')

if [ -z "$EXISTING_EP" ]; then
  log "Creating 'production' environment..."
  EP=$(curl -fsS -X POST -H "Authorization: Bearer $TOKEN" \
    -F "Name=production" \
    -F "EndpointCreationType=1" \
    -F "URL=$DOCKER_HOST_URL" \
    "$PORTAINER_URL/api/endpoints")
  EP_ID=$(echo "$EP" | jq -er '.Id')
  log "Environment 'production' created (ID: $EP_ID)."
else
  EP_ID=$EXISTING_EP
  log "Environment 'production' already exists (ID: $EP_ID)."
fi

# ===== Step 5: Add registry (idempotent) =====
EXISTING_REG=$(api_get "registries" | jq -r --arg url "$REGISTRY_URL" '.[] | select(.URL == $url) | .Id // empty')

if [ -z "$EXISTING_REG" ]; then
  log "Adding registry '$REGISTRY_URL'..."
  REGISTRY_PAYLOAD=$(jq -n \
    --arg url "$REGISTRY_URL" \
    --arg user "$REGISTRY_USER" \
    --arg pass "$REGISTRY_PASS" \
    '{
      Name: "Company Registry",
      Type: 3,
      URL: $url,
      Authentication: true,
      Username: $user,
      Password: $pass
    }')
  api_post "registries" "$REGISTRY_PAYLOAD" > /dev/null
  log "Registry added."
else
  log "Registry '$REGISTRY_URL' already exists."
fi

# ===== Step 6: Create teams (idempotent) =====
for TEAM in "devops" "backend" "frontend"; do
  EXISTING=$(api_get "teams" | jq -r --arg n "$TEAM" '.[] | select(.Name == $n) | .Id // empty')
  if [ -z "$EXISTING" ]; then
    TEAM_PAYLOAD=$(jq -n --arg name "$TEAM" '{Name: $name}')
    api_post "teams" "$TEAM_PAYLOAD" > /dev/null
    log "Team '$TEAM' created."
  else
    log "Team '$TEAM' already exists."
  fi
done

# ===== Step 7: Deploy a sample stack (idempotent) =====
STACK_NAME="sample-web"
EXISTING_STACK=$(api_get "stacks" | jq -r --arg n "$STACK_NAME" --arg eid "$EP_ID" '.[] | select(.Name == $n and (.EndpointId | tostring) == $eid) | .Id // empty')

COMPOSE_CONTENT=$(cat << 'EOF'
version: "3.8"
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    restart: unless-stopped
EOF
)

if [ -z "$EXISTING_STACK" ]; then
  log "Creating stack '$STACK_NAME'..."
  STACK_PAYLOAD=$(jq -n --arg name "$STACK_NAME" --arg content "$COMPOSE_CONTENT" '{
    Name: $name,
    StackFileContent: $content
  }')
  api_post "stacks/create/standalone/string?endpointId=${EP_ID}" "$STACK_PAYLOAD" > /dev/null
  log "Stack '$STACK_NAME' deployed."
else
  log "Stack '$STACK_NAME' already exists."
fi

log "=== Portainer bootstrap complete ==="
```

## Running the Script

```bash
# Set environment variables and run
export PORTAINER_URL="https://portainer.example.com"
export ADMIN_PASS="SecureAdminPass123!"
export REGISTRY_URL="registry.company.com"
export REGISTRY_PASS="registry-service-password"

chmod +x portainer-bootstrap.sh
./portainer-bootstrap.sh
```

## Integrating with Terraform or Ansible

```bash
# Use from Terraform null_resource
# null_resource.tf
resource "null_resource" "portainer_bootstrap" {
  provisioner "local-exec" {
    command = "./portainer-bootstrap.sh"
    environment = {
      PORTAINER_URL = var.portainer_url
      ADMIN_PASS    = var.portainer_admin_pass
      REGISTRY_PASS = var.registry_password
    }
  }
  depends_on = [docker_container.portainer]
}
```

## Conclusion

API-driven Portainer configuration enables reproducible, version-controlled infrastructure setup. Write idempotent scripts that check before creating, use environment variables for all secrets, and integrate with your IaC toolchain. These scripts can be committed to your infrastructure repository and run as part of your environment provisioning pipeline, ensuring Portainer is always configured consistently across all deployments.
