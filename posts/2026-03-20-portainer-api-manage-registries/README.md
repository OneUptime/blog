# How to Manage Registries via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Registry, Docker, Automation

Description: Learn how to add, configure, and manage container image registries in Portainer via the REST API to enable private image deployments across your environments.

## Introduction

Container image registries store and serve container images. Portainer supports connecting to multiple private and public registries, storing credentials securely so containers can pull images without exposing credentials to end users. The Portainer API lets you automate registry management for consistent multi-environment setups.

## Prerequisites

- Portainer CE or BE with admin access (GitHub registry examples require BE)
- Valid admin JWT token or API access token sent in the `X-API-Key` header
- Registry credentials (URL, username, password)

## Supported Registry Types

| Type | Value | Examples |
|------|-------|---------|
| Quay.io | 1 | quay.io |
| Azure ACR | 2 | yourregistry.azurecr.io |
| Custom (generic) | 3 | Any registry with Docker Registry API v2 |
| GitLab | 4 | registry.gitlab.com |
| ProGet | 5 | proget.yourcompany.com |
| DockerHub | 6 | docker.io |
| AWS ECR | 7 | 123456789012.dkr.ecr.us-east-1.amazonaws.com |
| GitHub CR (BE only) | 8 | ghcr.io |

## Step 1: List All Configured Registries

```bash
PORTAINER_URL="https://portainer.example.com"
JWT="your-admin-jwt"
# Or use an API access token instead:
# API_KEY="your-api-key"
# AUTH_HEADER="X-API-Key: $API_KEY"
AUTH_HEADER="Authorization: Bearer $JWT"

# List all registries

curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/registries" | \
  jq '.[] | {id: .Id, name: .Name, type: .Type, url: .URL}'
```

## Step 2: Add a Private Registry

```bash
# Add a generic private registry (e.g., self-hosted Harbor or generic registry)
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries" \
  -d '{
    "Name": "Company Harbor",
    "Type": 3,
    "URL": "registry.company.com",
    "Authentication": true,
    "Username": "portainer-svc",
    "Password": "registrypassword"
  }' | jq .
```

## Step 3: Add Docker Hub (Private)

```bash
# Add Docker Hub with credentials (for private repos and rate limit bypass)
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries" \
  -d '{
    "Name": "Docker Hub",
    "Type": 6,
    "URL": "docker.io",
    "Authentication": true,
    "Username": "your-dockerhub-username",
    "Password": "your-dockerhub-token"
  }' | jq .
```

## Step 4: Add GitHub Container Registry (GHCR, BE only)

```bash
# Add GitHub Container Registry
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries" \
  -d '{
    "Name": "GitHub Container Registry",
    "Type": 8,
    "URL": "ghcr.io",
    "Authentication": true,
    "Username": "your-github-username",
    "Password": "your-github-classic-pat",
    "Github": {
      "UseOrganisation": false
    }
  }' | jq .
```

## Step 5: Add Azure Container Registry (ACR)

```bash
# Add Azure Container Registry
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries" \
  -d '{
    "Name": "Azure Production ACR",
    "Type": 2,
    "URL": "yourregistry.azurecr.io",
    "Authentication": true,
    "Username": "service-principal-client-id",
    "Password": "service-principal-secret"
  }' | jq .
```

## Step 6: Inspect a Registry

```bash
REGISTRY_ID=2

# Get registry details
curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/registries/${REGISTRY_ID}" | jq .

# Note: Password is never returned in API responses
```

## Step 7: Update a Registry

```bash
REGISTRY_ID=2

# Update registry credentials
curl -s -X PUT \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries/${REGISTRY_ID}" \
  -d '{
    "Name": "Company Harbor (Updated)",
    "URL": "registry.company.com",
    "Authentication": true,
    "Username": "portainer-svc",
    "Password": "new-registry-password"
  }' | jq .
```

## Step 8: Delete a Registry

```bash
REGISTRY_ID=2

# Delete registry configuration from Portainer
curl -s -X DELETE \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/registries/${REGISTRY_ID}"

echo "Registry $REGISTRY_ID removed."
```

## Step 9: Test a Registry Connection

```bash
# Test connectivity and credentials before saving a registry
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries/ping" \
  -d '{
    "Type": 3,
    "URL": "registry.company.com",
    "Username": "portainer-svc",
    "Password": "registrypassword",
    "TLS": true
  }' | jq .
```

## Step 10: Automated Registry Setup Script

```bash
#!/bin/bash
# setup-registries.sh - Configure all registries from environment variables

set -euo pipefail

PORTAINER_URL="https://portainer.example.com"
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r '.jwt')

# Registry configurations
declare -A REGISTRIES
REGISTRIES["Company Harbor"]="3|registry.company.com|harbor-svc|${HARBOR_PASSWORD}"
REGISTRIES["Docker Hub"]="6|docker.io|${DOCKERHUB_USER}|${DOCKERHUB_TOKEN}"
REGISTRIES["GitHub CR"]="8|ghcr.io|${GITHUB_USER}|${GITHUB_TOKEN}"

for REG_NAME in "${!REGISTRIES[@]}"; do
  IFS='|' read -r TYPE URL USERNAME PASSWORD <<< "${REGISTRIES[$REG_NAME]}"

  echo "Adding registry: $REG_NAME..."

  EXTRA_FIELDS=""
  if [ "$TYPE" -eq 8 ]; then
    EXTRA_FIELDS=',"Github":{"UseOrganisation":false}'
  fi

  RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/registries" \
    -d "{
      \"Name\": \"$REG_NAME\",
      \"Type\": $TYPE,
      \"URL\": \"$URL\",
      \"Authentication\": true,
      \"Username\": \"$USERNAME\",
      \"Password\": \"$PASSWORD\"${EXTRA_FIELDS}
    }")

  ID=$(printf '%s\n' "$RESPONSE" | jq -r '.Id // empty')
  if [ -n "$ID" ]; then
    echo "  Added '$REG_NAME' (ID: $ID)"
  else
    echo "  ERROR: $RESPONSE"
  fi
done

echo "Registry setup complete."
```

## Conclusion

Managing container registries via the Portainer API enables consistent, automated credential management across multiple Portainer instances. Configure registries as part of your infrastructure provisioning pipeline, rotate credentials programmatically when they expire, and ensure all environments have access to the same registries. Always use service accounts or access tokens for registry credentials rather than personal user credentials.
