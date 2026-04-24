# How to Create the Initial Admin User via the Portainer API - User

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, DevOps, Installation

Description: Learn how to create the initial Portainer administrator user via the API during automated deployments, eliminating the need for manual browser-based setup.

## Introduction

When deploying Portainer in automated environments (CI/CD, infrastructure-as-code, scripts), you need to initialize the admin user without browser interaction. Portainer provides an API endpoint specifically for this purpose, allowing you to fully automate the initial setup. This endpoint is only available before an administrator is created and before the initial setup window expires.

## Prerequisites

- Portainer CE or BE freshly installed with no admin user created yet
- `curl` and `jq` available on your automation machine
- Network access to the Portainer instance

## Understanding the Initialization Window

After installing Portainer, there is a time window (5 minutes by default) during which an admin user can be created without authentication. If no admin user is created before that window closes, Portainer times out for security purposes and you must restart the Portainer container before retrying the initial setup.

When you access Portainer for the first time, it shows the "Create initial admin user" screen - the API replicates this behavior.

## Step 1: Check If Portainer Needs Initialization

```bash
PORTAINER_URL="https://portainer.example.com"

# Check whether an administrator already exists
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${PORTAINER_URL}/api/users/admin/check")

if [ "$HTTP_CODE" = "204" ]; then
  echo "Portainer is already initialized."
elif [ "$HTTP_CODE" = "404" ]; then
  echo "Portainer still needs initial admin setup."
elif [ "$HTTP_CODE" = "303" ]; then
  echo "Initialization window expired. Restart Portainer and try again."
else
  echo "Unexpected response while checking initialization status: HTTP $HTTP_CODE"
fi
```

## Step 2: Create the Initial Admin User

```bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?Set ADMIN_PASSWORD to a strong password}"

# Create the initial admin user
RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/users/admin/init" \
  -H "Content-Type: application/json" \
  -d "{
    \"Username\": \"admin\",
    \"Password\": \"${ADMIN_PASSWORD}\"
  }")

# Check for success
USER_ID=$(echo "$RESPONSE" | jq -r '.Id // empty' 2>/dev/null)

if [ -n "$USER_ID" ]; then
  echo "Admin user created successfully!"
  echo "User ID: $USER_ID"
else
  echo "Error creating admin user: $RESPONSE"
fi
```

## Step 3: Verify Admin Was Created

After creation, verify you can authenticate:

```bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?Set ADMIN_PASSWORD to the password you used for initialization}"

# Try to authenticate with the new admin credentials
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{
    \"Username\": \"admin\",
    \"Password\": \"${ADMIN_PASSWORD}\"
  }" | jq -r '.jwt')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "Authentication successful! Token obtained."
  echo "Token: ${TOKEN:0:50}..."  # Show first 50 chars
else
  echo "Authentication failed."
fi
```

## Step 4: Full Automation Script

Here is a complete script for automated Portainer initialization:

```bash
#!/bin/bash
# init-portainer.sh - Fully automated Portainer initialization

set -euo pipefail

PORTAINER_URL="${PORTAINER_URL:-https://portainer.example.com}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:?Set ADMIN_PASS to a strong password}"
MAX_WAIT_SECONDS=120  # Wait up to 2 minutes for Portainer to start
SLEEP_INTERVAL=5

echo "=== Portainer Initialization Script ==="
echo "URL: $PORTAINER_URL"

# Step 1: Wait for Portainer to be ready
echo "Waiting for Portainer to be ready..."
elapsed=0
until curl -sf "${PORTAINER_URL}/api/system/status" > /dev/null 2>&1; do
  sleep $SLEEP_INTERVAL
  elapsed=$((elapsed + SLEEP_INTERVAL))
  if [ $elapsed -ge $MAX_WAIT_SECONDS ]; then
    echo "Timeout: Portainer did not become ready in ${MAX_WAIT_SECONDS}s"
    exit 1
  fi
  echo "  Still waiting... (${elapsed}s)"
done
echo "Portainer is ready!"

# Step 2: Check if already initialized
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${PORTAINER_URL}/api/users/admin/check")

if [ "$HTTP_CODE" = "204" ]; then
  echo "Portainer is already initialized. Skipping admin creation."
  exit 0
elif [ "$HTTP_CODE" = "303" ]; then
  echo "Portainer initialization window has expired. Restart Portainer and try again." >&2
  exit 1
elif [ "$HTTP_CODE" != "404" ]; then
  echo "Unexpected status while checking admin existence: HTTP $HTTP_CODE" >&2
  exit 1
fi

# Step 3: Create initial admin user
echo "Creating initial admin user..."
RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/users/admin/init" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${ADMIN_USER}\",\"Password\":\"${ADMIN_PASS}\"}")

USER_ID=$(echo "$RESPONSE" | jq -r '.Id // empty' 2>/dev/null || true)

if [ -n "$USER_ID" ]; then
  echo "Admin user '${ADMIN_USER}' created successfully (ID: $USER_ID)"
else
  echo "ERROR creating admin: $RESPONSE" >&2
  exit 1
fi

# Step 4: Obtain JWT token
echo "Authenticating..."
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${ADMIN_USER}\",\"Password\":\"${ADMIN_PASS}\"}" | jq -r '.jwt // empty' 2>/dev/null || true)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "ERROR authenticating with the new admin credentials" >&2
  exit 1
fi

echo "Authentication successful."

# Step 5: Additional setup tasks (optional)
# Example: set the user session timeout
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/settings" \
  -d '{"UserSessionTimeout":"8h"}' > /dev/null

echo "=== Portainer initialization complete ==="
echo "URL:      $PORTAINER_URL"
echo "Username: $ADMIN_USER"
```

## Step 5: Docker Compose with Auto-Init

Use the script in a Docker Compose setup with a wait loop:

```yaml
# docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    ports:
      - "9443:9443"

  portainer-init:
    image: curlimages/curl:latest
    depends_on:
      - portainer
    environment:
      PORTAINER_URL: https://portainer:9443
      ADMIN_PASS: ${PORTAINER_ADMIN_PASS:?set PORTAINER_ADMIN_PASS}
    command: >
      sh -ec "
        until curl -skf \"$${PORTAINER_URL}/api/system/status\" > /dev/null; do
          sleep 5
        done
        STATUS_CODE=$$(curl -sk -o /dev/null -w '%{http_code}' \"$${PORTAINER_URL}/api/users/admin/check\")
        if [ \"$$STATUS_CODE\" = '204' ]; then
          echo 'Portainer already initialized'
          exit 0
        elif [ \"$$STATUS_CODE\" != '404' ]; then
          echo \"Unexpected admin check status: $$STATUS_CODE\" >&2
          exit 1
        fi
        curl -skf -X POST \"$${PORTAINER_URL}/api/users/admin/init\" \
          -H 'Content-Type: application/json' \
          -d \"{\\\"Username\\\":\\\"admin\\\",\\\"Password\\\":\\\"$${ADMIN_PASS}\\\"}\" &&
        echo 'Admin initialized'
      "
    restart: "no"

volumes:
  portainer_data:
```

## Conclusion

Creating the initial Portainer admin user via the API is essential for fully automated, reproducible deployments. Use the `/api/users/admin/init` endpoint during the initial 5-minute setup window, pair it with readiness checks against `/api/system/status` and initialization checks against `/api/users/admin/check`, and run it as part of your infrastructure provisioning scripts. If the setup window expires before an admin is created, restart Portainer and try again. Never store the admin password in the script file itself - always use environment variables or a secrets manager.
