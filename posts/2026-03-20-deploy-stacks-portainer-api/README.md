# How to Deploy Stacks via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Stack, Automation, CI/CD

Description: Learn how to create, update, and manage Docker Compose stacks programmatically using the Portainer REST API.

## Stack Deployment Methods

For Docker standalone environments, the Portainer API exposes separate endpoints for three stack creation methods:

| Method | Endpoint | Description |
|--------|----------|-------------|
| String (inline) | `/api/stacks/create/standalone/string` | Pass Compose content as a string |
| File Upload | `/api/stacks/create/standalone/file` | Upload a Compose file |
| Git Repository | `/api/stacks/create/standalone/repository` | Deploy from a Git URL |

## Deploy Stack from Inline Compose Content

```bash
#!/bin/bash
# Deploy a stack using inline Compose content

API_TOKEN="your_access_token"
PORTAINER_URL="https://portainer.mycompany.com"
ENDPOINT_ID=1  # Your Docker environment ID

# Read the compose file content

STACK_CONTENT=$(cat docker-compose.yml)

# Deploy the stack
curl -X POST "${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"Name\": \"my-stack\",
    \"StackFileContent\": $(echo "$STACK_CONTENT" | jq -Rs .),
    \"Env\": [
      {\"name\": \"APP_VERSION\", \"value\": \"2.0.0\"},
      {\"name\": \"DB_HOST\", \"value\": \"postgres\"}
    ]
  }"
```

## Deploy Stack from a Git Repository

```bash
# Deploy a stack from a private Git repository
curl -X POST "${PORTAINER_URL}/api/stacks/create/standalone/repository?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "my-git-stack",
    "RepositoryURL": "https://github.com/myorg/my-repo",
    "RepositoryReferenceName": "refs/heads/main",
    "ComposeFile": "docker-compose.yml",
    "RepositoryAuthentication": true,
    "RepositoryUsername": "git-user",
    "RepositoryPassword": "'"${GIT_TOKEN}"'"
  }'
```

## Listing Stacks

```bash
# List all stacks (filter by endpoint)
FILTERS=$(printf '{"EndpointID":"%s"}' "$ENDPOINT_ID" | jq -sRr @uri)

curl -s "${PORTAINER_URL}/api/stacks?filters=${FILTERS}" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | {id: .Id, name: .Name, status: .Status}]'
```

## Updating an Existing File-Based Stack

```bash
# This endpoint updates file-based stacks created from inline content or uploaded files.
FILTERS=$(printf '{"EndpointID":"%s"}' "$ENDPOINT_ID" | jq -sRr @uri)

# Get the current stack ID
STACK_ID=$(curl -s "${PORTAINER_URL}/api/stacks?filters=${FILTERS}" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '.[] | select(.Name == "my-stack") | .Id')

# Update the stack (repulls images and re-deploys)
curl -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"StackFileContent\": $(cat docker-compose.yml | jq -Rs .),
    \"Env\": [
      {\"name\": \"APP_VERSION\", \"value\": \"3.0.0\"}
    ],
    \"Prune\": false,
    \"RepullImageAndRedeploy\": true
  }"
```

## Stopping and Starting Stacks

```bash
# Stop a stack
curl -X POST "${PORTAINER_URL}/api/stacks/${STACK_ID}/stop?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}"

# Start a stopped stack
curl -X POST "${PORTAINER_URL}/api/stacks/${STACK_ID}/start?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}"
```

## Deleting a Stack

```bash
# Delete a stack (and its containers)
curl -X DELETE "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}"
```

## CI/CD Integration Example

```bash
#!/bin/bash
# ci-deploy.sh - Update a file-based Portainer stack from CI/CD

set -e

PORTAINER_URL="${PORTAINER_URL}"
API_TOKEN="${PORTAINER_API_TOKEN}"
ENDPOINT_ID="${PORTAINER_ENDPOINT_ID}"
STACK_NAME="${1:-my-app}"
IMAGE_TAG="${2:-latest}"

FILTERS=$(printf '{"EndpointID":"%s"}' "$ENDPOINT_ID" | jq -sRr @uri)

# Find the stack ID
STACK_ID=$(curl -s "${PORTAINER_URL}/api/stacks?filters=${FILTERS}" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq --arg name "$STACK_NAME" '.[] | select(.Name == $name) | .Id')

[ -z "$STACK_ID" ] && { echo "Stack not found: $STACK_NAME"; exit 1; }

# Update the stack with new image tag
sed "s/IMAGE_TAG_PLACEHOLDER/${IMAGE_TAG}/g" docker-compose.yml > /tmp/compose.tmp

curl -sf -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"StackFileContent\": $(cat /tmp/compose.tmp | jq -Rs .), \"RepullImageAndRedeploy\": true}"

echo "Deployed ${STACK_NAME} with tag ${IMAGE_TAG}"
```

## Conclusion

The Portainer stacks API enables full lifecycle management of Docker Compose deployments. Combined with access tokens and CI/CD pipelines, it provides a powerful automation interface for production deployments without requiring direct Docker socket access.
