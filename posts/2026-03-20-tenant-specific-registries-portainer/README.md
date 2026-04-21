# How to Set Up Tenant-Specific Registries in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Registry, Multi-Tenant, Container Image, Access Control

Description: Configure separate Docker registries per tenant in Portainer so each team can only access and deploy their own images, providing image-level multi-tenancy isolation.

## Introduction

In multi-tenant environments, image registry access is as important as environment access control. Without registry isolation, one team could accidentally (or intentionally) pull and deploy another team's proprietary images. Portainer's registry management feature lets you register multiple registries and control which teams can use each one. This guide covers setting up tenant-specific registries and restricting access by team.

## Step 1: Deploy Per-Tenant Private Registries

```yaml
# docker-compose.yml - Tenant-isolated registries

services:
  # Registry for Team Alpha
  registry-alpha:
    image: registry:3
    container_name: registry_alpha
    restart: unless-stopped
    environment:
      REGISTRY_HTTP_ADDR: 0.0.0.0:5001
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/registry.crt
      REGISTRY_HTTP_TLS_KEY: /certs/registry.key
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
      # Basic auth for registry access
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Alpha Corp Registry
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    volumes:
      - registry_alpha_data:/data
      - ./auth/alpha:/auth:ro
      - ./certs/alpha:/certs:ro
    ports:
      - "5001:5001"

  # Registry for Team Beta
  registry-beta:
    image: registry:3
    container_name: registry_beta
    restart: unless-stopped
    environment:
      REGISTRY_HTTP_ADDR: 0.0.0.0:5002
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/registry.crt
      REGISTRY_HTTP_TLS_KEY: /certs/registry.key
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Beta Inc Registry
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    volumes:
      - registry_beta_data:/data
      - ./auth/beta:/auth:ro
      - ./certs/beta:/certs:ro
    ports:
      - "5002:5002"

volumes:
  registry_alpha_data:
  registry_beta_data:
```

```bash
# Generate htpasswd credentials for each team
mkdir -p auth/alpha auth/beta certs/alpha certs/beta

# Place TLS certificates trusted by Docker and Portainer:
# certs/alpha/registry.crt and certs/alpha/registry.key
# certs/beta/registry.crt and certs/beta/registry.key

# Team Alpha credentials
htpasswd -Bbn alpha-user alpha-password > auth/alpha/htpasswd

# Team Beta credentials
htpasswd -Bbn beta-user beta-password > auth/beta/htpasswd
```

## Step 2: Register Tenant Registries in Portainer

```bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_API_KEY="admin_api_key"

# Register Alpha Corp's registry
ALPHA_REGISTRY_ID=$(curl -s -X POST \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/registries" \
  -d '{
    "Name": "Alpha Corp Registry",
    "Type": 3,
    "URL": "registry-alpha.internal:5001",
    "TLS": true,
    "Authentication": true,
    "Username": "alpha-user",
    "Password": "alpha-password"
  }' | jq -r '.Id')

echo "Alpha registry ID: $ALPHA_REGISTRY_ID"

# Register Beta Inc's registry
BETA_REGISTRY_ID=$(curl -s -X POST \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/registries" \
  -d '{
    "Name": "Beta Inc Registry",
    "Type": 3,
    "URL": "registry-beta.internal:5002",
    "TLS": true,
    "Authentication": true,
    "Username": "beta-user",
    "Password": "beta-password"
  }' | jq -r '.Id')

echo "Beta registry ID: $BETA_REGISTRY_ID"
```

## Step 3: Restrict Registry Access by Team

```bash
# Registry access is configured per Docker environment in Portainer
ENVIRONMENT_ID="1"

# Get team IDs
ALPHA_TEAM_ID=$(curl -s \
  -H "X-API-Key: $ADMIN_API_KEY" \
  "$PORTAINER_URL/api/teams" | \
  jq -r '.[] | select(.Name == "Alpha Corp") | .Id')

BETA_TEAM_ID=$(curl -s \
  -H "X-API-Key: $ADMIN_API_KEY" \
  "$PORTAINER_URL/api/teams" | \
  jq -r '.[] | select(.Name == "Beta Inc") | .Id')

# Restrict Alpha registry to Alpha team ONLY
curl -s -X PUT \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/$ENVIRONMENT_ID/registries/$ALPHA_REGISTRY_ID" \
  -d "{
    \"TeamAccessPolicies\": {
      \"$ALPHA_TEAM_ID\": {\"RoleId\": 0}
    },
    \"UserAccessPolicies\": {}
  }"

# Restrict Beta registry to Beta team ONLY
curl -s -X PUT \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/$ENVIRONMENT_ID/registries/$BETA_REGISTRY_ID" \
  -d "{
    \"TeamAccessPolicies\": {
      \"$BETA_TEAM_ID\": {\"RoleId\": 0}
    },
    \"UserAccessPolicies\": {}
  }"

echo "Registry access restrictions applied."
```

## Step 4: Configure Registry Proxy with Authentication

```yaml
# For organizations using a shared registry with namespace isolation
# (e.g., ECR, Docker Hub Pro, GHCR)

# docker-compose.yml - Registry proxy with per-tenant namespace enforcement
services:
  registry-proxy:
    image: nginx:alpine
    container_name: registry_proxy
    restart: unless-stopped
    volumes:
      - ./nginx-registry.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./auth:/etc/nginx/auth:ro
    ports:
      - "5443:443"
```

```nginx
# nginx-registry.conf - Namespace-enforcing registry proxy
events {}

http {
  upstream registry_backend {
    server registry.internal:5000;
  }

  server {
    listen 443 ssl;

    ssl_certificate /etc/nginx/certs/registry.crt;
    ssl_certificate_key /etc/nginx/certs/registry.key;

    add_header Docker-Distribution-Api-Version "registry/2.0" always;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;

    location = /v2/ {
      proxy_pass http://registry_backend;
    }

    # Use the repository namespace in the URL to select the htpasswd file.

    location /v2/alpha/ {
      # Only allow requests authenticated as alpha users
      auth_basic "Alpha Corp Registry";
      auth_basic_user_file /etc/nginx/auth/alpha/htpasswd;
      proxy_pass http://registry_backend;
    }

    location /v2/beta/ {
      # Only allow requests authenticated as beta users
      auth_basic "Beta Inc Registry";
      auth_basic_user_file /etc/nginx/auth/beta/htpasswd;
      proxy_pass http://registry_backend;
    }

    location /v2/ {
      return 403;
    }
  }
}
```

## Step 5: Push Images to Tenant-Specific Registry

```bash
# Team Alpha: tag and push to their registry
printf '%s\n' 'alpha-password' | docker login registry-alpha.internal:5001 --username alpha-user --password-stdin
docker tag myapp/api:latest registry-alpha.internal:5001/alpha/api:latest
docker push registry-alpha.internal:5001/alpha/api:latest

# docker-compose.yml for Team Alpha uses their registry
# services:
#   api:
#     image: registry-alpha.internal:5001/alpha/api:latest

# Team Beta: cannot authenticate to Alpha's registry with Beta credentials
printf '%s\n' 'beta-password' | docker login registry-alpha.internal:5001 --username beta-user --password-stdin
# Error: unauthorized
```

## Step 6: Verify Registry Isolation

```bash
# Verify Alpha team user cannot see Beta's registry in Portainer
ALICE_TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/auth" \
  -d '{"Username": "alice", "Password": "alice-password"}' | \
  jq -r '.jwt')

# Alice should only see Alpha Corp Registry
curl -s \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  "$PORTAINER_URL/api/endpoints/$ENVIRONMENT_ID/registries" | \
  jq '.[].Name'
# Returns: "Alpha Corp Registry"
# Does NOT return: "Beta Inc Registry"

# Verify direct registry inspection is restricted
BETA_STATUS=$(curl -s -o /tmp/beta-registry.json -w "%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  "$PORTAINER_URL/api/registries/$BETA_REGISTRY_ID?endpointId=$ENVIRONMENT_ID")

echo "$BETA_STATUS"
# Returns: 403

jq '.message' /tmp/beta-registry.json
# Returns: "Access denied to resource"
```

## Conclusion

Tenant-specific registries close the image supply chain isolation gap. Without registry restrictions, environment access control alone doesn't prevent a team from deploying another team's images if they know the image name. Portainer's registry access control feature restricts which teams can see and use each registry in a given environment, while the registry credentials enforce direct push and pull access. For organizations using cloud registries (ECR, GHCR, Docker Hub), create separate registry credentials in the provider scoped to each team's repository namespace, then add those scoped credentials to Portainer.
