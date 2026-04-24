# How to Automate Environment Provisioning with the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, DevOps, Infrastructure

Description: Automate the provisioning of complete Portainer environments including endpoints, networks, volumes, and stacks using the Portainer REST API.

## Introduction

Manually creating environments in Portainer is fine for small teams, but at scale you need automation. The Portainer API allows you to script the entire provisioning workflow-creating environments, configuring users and teams, deploying networks, volumes, and stacks-all from a single script.

## Prerequisites

- Portainer CE or BE with API access
- `curl` and `jq` installed on your automation host
- Docker hosts running the Portainer Agent and reachable from the Portainer Server

## Step 1: Authenticate and Get a Token

```bash
#!/bin/bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_USER="admin"
ADMIN_PASS="yourpassword"

# Get JWT token

TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" \
  "$PORTAINER_URL/api/auth" | jq -r '.jwt')

echo "Authenticated. Token: ${TOKEN:0:20}..."
```

## Step 2: Register a New Environment

```bash
# Add a Docker standalone environment via agent
register_environment() {
    local NAME=$1
    local AGENT_URL=$2

    RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        --form "Name=$NAME" \
        --form "EndpointCreationType=2" \
        --form "URL=$AGENT_URL" \
        --form "TLS=true" \
        --form "TLSSkipVerify=true" \
        --form "TLSSkipClientVerify=true" \
        "$PORTAINER_URL/api/endpoints")

    ENDPOINT_ID=$(jq -r '.Id' <<< "$RESPONSE")
    echo "Created environment: $NAME (ID: $ENDPOINT_ID)" >&2
    echo "$ENDPOINT_ID"
}

# Register a new environment
ENV_ID=$(register_environment "production-web" "192.168.1.100:9001")
```

## Step 3: Create Docker Networks

```bash
# Create application networks on the new environment
create_network() {
    local ENDPOINT_ID=$1
    local NETWORK_NAME=$2
    local DRIVER=${3:-"bridge"}

    curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"Name\": \"$NETWORK_NAME\",
            \"Driver\": \"$DRIVER\",
            \"IPAM\": {
                \"Driver\": \"default\"
            }
        }" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks/create" \
        | jq -r '.Id'
}

# Create frontend and backend networks
create_network $ENV_ID "frontend-net" "bridge"
create_network $ENV_ID "backend-net" "bridge"
echo "Networks created"
```

## Step 4: Create Docker Volumes

```bash
# Create persistent volumes
create_volume() {
    local ENDPOINT_ID=$1
    local VOLUME_NAME=$2

    curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"Name\": \"$VOLUME_NAME\",
            \"Driver\": \"local\"
        }" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/volumes/create" \
        | jq -r '.Name'
}

create_volume $ENV_ID "app-data"
create_volume $ENV_ID "db-data"
echo "Volumes created"
```

## Step 5: Deploy a Stack

```bash
# Deploy a stack from a compose file
deploy_stack() {
    local ENDPOINT_ID=$1
    local STACK_NAME=$2
    local COMPOSE_FILE=$3

    COMPOSE_CONTENT=$(jq -Rs . < "$COMPOSE_FILE")

    curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"Name\": \"$STACK_NAME\",
            \"StackFileContent\": $COMPOSE_CONTENT,
            \"Env\": []
        }" \
        "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
        | jq -r '.Id'
}

# Create a sample compose file
cat > /tmp/app-stack.yml << 'EOF'
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - app-data:/usr/share/nginx/html
    networks:
      - frontend-net
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend-net
volumes:
  app-data:
    external: true
  db-data:
    external: true
networks:
  frontend-net:
    external: true
  backend-net:
    external: true
EOF

STACK_ID=$(deploy_stack $ENV_ID "my-app" /tmp/app-stack.yml)
echo "Stack deployed with ID: $STACK_ID"
```

## Step 6: Create Teams and Assign Access

```bash
# Create a team
create_team() {
    local TEAM_NAME=$1

    curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"Name\": \"$TEAM_NAME\"}" \
        "$PORTAINER_URL/api/teams" | jq -r '.Id'
}

# Assign team to environment
assign_team_to_env() {
    local ENDPOINT_ID=$1
    local TEAM_ID=$2
    local ROLE_ID=${3:-3}  # 1=Environment admin, 2=Helpdesk, 3=Standard user, 4=Read-only user

    curl -s -X PUT \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"TeamAccessPolicies\": {
                \"$TEAM_ID\": {\"RoleId\": $ROLE_ID}
            }
        }" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID"
}

TEAM_ID=$(create_team "devops-team")
assign_team_to_env $ENV_ID $TEAM_ID 3
echo "Team assigned to environment"
```

## Complete Provisioning Script

```bash
#!/bin/bash
# provision-environment.sh
set -euo pipefail

PORTAINER_URL="https://portainer.example.com"
ENV_NAME="${1:-new-environment}"
AGENT_URL="${2:-192.168.1.200:9001}"

# Authenticate
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  "$PORTAINER_URL/api/auth" | jq -r '.jwt')

echo "[1/4] Registering environment: $ENV_NAME"
# ... (steps as above)

echo "[2/4] Creating networks..."
# ... 

echo "[3/4] Creating volumes..."
# ...

echo "[4/4] Deploying initial stacks..."
# ...

echo "Environment $ENV_NAME provisioned successfully!"
```

## Conclusion

Automating Portainer environment provisioning using the API eliminates manual setup steps, ensures consistency across environments, and enables self-service infrastructure workflows. This approach scales from a few environments to hundreds, making it ideal for MSPs, large enterprises, and DevOps teams managing multiple deployment targets.
