# How to Deploy Stacks via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Stack, Docker, Automation

Description: Learn how to create, update, and manage Docker Compose stacks in Portainer via the REST API, enabling automated deployments from CI/CD pipelines.

## Introduction

Portainer stacks are multi-container applications defined by Docker Compose files. The Portainer API lets you deploy new stacks, update existing ones, and trigger redeployments - all without touching the Portainer UI. This is the foundation for CI/CD pipeline integration.

## Prerequisites

- Portainer CE or BE with at least one Docker environment
- Valid JWT token or API access token
- A Docker Compose file for your application

## Understanding Stack Types

Portainer API supports several stack creation methods:

| Method | Description |
|--------|-------------|
| `string` | Pass Compose content as a string in the API body |
| `file` | Upload a Compose file as multipart form data |
| `repository` | Deploy from a Git repository |

## Step 1: Deploy a Stack from a String

This is the most common method for CI/CD pipelines:

```bash
PORTAINER_URL="https://portainer.example.com"
JWT_TOKEN="your-jwt-token"
AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
# If you're using an API access token instead, use:
# AUTH_HEADER="X-API-Key: your-api-access-token"
ENDPOINT_ID=1   # Your Docker environment ID

# Create a new stack by passing the Compose content as a string

COMPOSE_CONTENT=$(cat << 'EOF'
services:
  web:
    image: nginx:1.25
    ports:
      - "80:80"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
EOF
)

curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}" \
  -d "{
    \"name\": \"my-web-app\",
    \"stackFileContent\": $(echo "$COMPOSE_CONTENT" | jq -Rs .),
    \"env\": [
      {\"name\": \"APP_ENV\", \"value\": \"production\"},
      {\"name\": \"APP_PORT\", \"value\": \"8080\"}
    ]
  }" | jq .
```

## Step 2: Deploy a Stack from a File

```bash
# Deploy using a Compose file upload
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -F "Name=my-web-app" \
  -F "file=@/path/to/docker-compose.yml" \
  "${PORTAINER_URL}/api/stacks/create/standalone/file?endpointId=${ENDPOINT_ID}" | jq .
```

## Step 3: List All Stacks

```bash
# List all stacks
curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/stacks" | \
  jq '.[] | {id: .Id, name: .Name, status: .Status, endpoint: .EndpointId}'

# Stack status: 1 = active, 2 = inactive, 3 = deploying, 4 = error

# Filter stacks by endpoint
curl -s -G -H "$AUTH_HEADER" \
  --data-urlencode "filters={\"EndpointID\":\"${ENDPOINT_ID}\"}" \
  "${PORTAINER_URL}/api/stacks" | jq .
```

## Step 4: Update an Existing Stack

```bash
STACK_ID=3

# Update stack with new Compose content
NEW_COMPOSE=$(cat << 'EOF'
services:
  web:
    image: nginx:1.26   # Updated version
    ports:
      - "80:80"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
EOF
)

curl -s -X PUT \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -d "{
    \"stackFileContent\": $(echo "$NEW_COMPOSE" | jq -Rs .),
    \"env\": [],
    \"prune\": true,
    \"repullImageAndRedeploy\": true
  }" | jq .
```

## Step 5: Start and Stop Stacks

```bash
STACK_ID=3

# Stop a stack (bring down all services)
curl -s -X POST \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/stop?endpointId=${ENDPOINT_ID}" | jq .

# Start a stopped stack
curl -s -X POST \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/start?endpointId=${ENDPOINT_ID}" | jq .
```

## Step 6: Delete a Stack

```bash
STACK_ID=3

# Delete a stack (successful deletes return HTTP 204 No Content)
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -X DELETE \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}"
```

## Step 7: CI/CD Pipeline Integration

Here is a complete GitHub Actions-style deployment script:

```bash
#!/bin/bash
# deploy-stack.sh - Deploy or update a stack in Portainer

set -euo pipefail

PORTAINER_URL="${PORTAINER_URL:-https://portainer.example.com}"
API_KEY="${PORTAINER_API_KEY:-}"
ENDPOINT_ID="${PORTAINER_ENDPOINT_ID:-1}"
STACK_NAME="${STACK_NAME:-my-app}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Authenticate if using username/password
if [ -z "${API_KEY:-}" ]; then
  : "${PORTAINER_USER:?PORTAINER_USER is required when PORTAINER_API_KEY is not set}"
  : "${PORTAINER_PASS:?PORTAINER_PASS is required when PORTAINER_API_KEY is not set}"

  JWT_TOKEN=$(curl -fsS -X POST "${PORTAINER_URL}/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${PORTAINER_USER}\",\"password\":\"${PORTAINER_PASS}\"}" | jq -er '.jwt')
  AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
else
  AUTH_HEADER="X-API-Key: $API_KEY"
fi

COMPOSE_CONTENT=$(cat "$COMPOSE_FILE")

# Check if stack exists
EXISTING_STACK=$(curl -fsS -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/stacks" | \
  jq -c --arg name "$STACK_NAME" --arg endpoint "$ENDPOINT_ID" \
    '.[] | select(.Name == $name and (.EndpointId | tostring) == $endpoint)')

if [ -n "$EXISTING_STACK" ]; then
  # Update existing stack
  STACK_ID=$(echo "$EXISTING_STACK" | jq -r '.Id')
  echo "Updating existing stack '$STACK_NAME' (ID: $STACK_ID)..."

  curl -fsS -X PUT \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
    -d "{
      \"stackFileContent\": $(echo "$COMPOSE_CONTENT" | jq -Rs .),
      \"env\": [{\"name\": \"IMAGE_TAG\", \"value\": \"$IMAGE_TAG\"}],
      \"prune\": true,
      \"repullImageAndRedeploy\": true
    }" > /dev/null

  echo "Stack updated successfully."
else
  # Create new stack
  echo "Creating new stack '$STACK_NAME'..."

  curl -fsS -X POST \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}" \
    -d "{
      \"name\": \"$STACK_NAME\",
      \"stackFileContent\": $(echo "$COMPOSE_CONTENT" | jq -Rs .),
      \"env\": [{\"name\": \"IMAGE_TAG\", \"value\": \"$IMAGE_TAG\"}]
    }" > /dev/null

  echo "Stack created successfully."
fi
```

## Conclusion

Deploying stacks via the Portainer API is the cornerstone of automated container deployments. Use the string method for CI/CD pipelines where Compose content is templated, the file method for direct file uploads, and the update endpoint for rolling out new image versions. The upsert pattern (create if not exists, update if exists) is particularly useful for idempotent pipeline scripts.
