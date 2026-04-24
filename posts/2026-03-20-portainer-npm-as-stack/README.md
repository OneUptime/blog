# How to Deploy Nginx Proxy Manager as a Portainer Stack - Npm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, Stack, Docker Compose, Deployment

Description: Learn how to deploy Nginx Proxy Manager as a Portainer stack with both SQLite and MariaDB backends, manage it through the Portainer UI, and integrate it with other stacks.

## Introduction

Deploying Nginx Proxy Manager as a Portainer stack brings NPM under Portainer's lifecycle management - you can deploy, update, and monitor NPM through the same interface you use for all other containers. This creates a cohesive infrastructure where Portainer manages everything, including the proxy that sits in front of it.

## Prerequisites

- Portainer CE or BE running
- A Docker Standalone environment in Portainer (these Compose examples are not for Docker Swarm stacks)
- Admin access to Portainer
- Domain names pointing to your server (for NPM SSL provisioning)

## Step 1: Create the NPM Stack in Portainer

Navigate to **Stacks** → **Add Stack** in Portainer.

Name the stack: `nginx-proxy-manager`

**Option A: SQLite Backend (Simpler - recommended for single-host)**

```yaml
version: "3.8"

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"      # HTTP
      - "443:443"    # HTTPS
      - "81:81"      # NPM admin UI
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - proxy
    healthcheck:
      test: ["CMD", "/usr/bin/check-health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  proxy:
    name: proxy
    driver: bridge

volumes:
  npm_data:
    driver: local
  npm_letsencrypt:
    driver: local
```

## Step 2: MariaDB Backend Stack (Production Recommended)

**Option B: MariaDB Backend with Portainer environment variables**

In Portainer's Stack editor, use the **Environment Variables** section:

```yaml
version: "3.8"

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    environment:
      DB_MYSQL_HOST: "npm-db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "${DB_USER}"          # Portainer env var
      DB_MYSQL_PASSWORD: "${DB_PASSWORD}"  # Portainer env var
      DB_MYSQL_NAME: "npm"
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - npm-internal
      - proxy
    depends_on:
      npm-db:
        condition: service_healthy

  npm-db:
    image: jc21/mariadb-aria:latest
    container_name: npm-mariadb
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "${DB_ROOT_PASSWORD}"
      MYSQL_DATABASE: "npm"
      MYSQL_USER: "${DB_USER}"
      MYSQL_PASSWORD: "${DB_PASSWORD}"
      MARIADB_AUTO_UPGRADE: "1"
    volumes:
      - npm_db_data:/var/lib/mysql
    networks:
      - npm-internal
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  npm-internal:
    driver: bridge
  proxy:
    name: proxy
    driver: bridge

volumes:
  npm_data:
  npm_letsencrypt:
  npm_db_data:
```

Set Portainer environment variables:
- `DB_USER`: npm
- `DB_PASSWORD`: your-secure-db-password
- `DB_ROOT_PASSWORD`: your-secure-root-password

## Step 3: Configure the Proxy Network for Other Stacks

Other stacks that need NPM to proxy them should join the `proxy` network:

```yaml
# In any other Portainer stack

version: "3.8"

services:
  myapp:
    image: myapp:latest
    networks:
      - proxy    # Joins the proxy network - NPM can forward to it

networks:
  proxy:
    external: true    # Reference the existing proxy network
    name: proxy
```

## Step 4: Stack Management via Portainer

After deploying, Portainer shows the NPM stack in the Stacks list. In a Docker Standalone environment, you'll see:

```text
Stack: nginx-proxy-manager
Containers: nginx-proxy-manager (running), npm-mariadb (running if using MariaDB)
Status: Running

Actions available:
  Start/Stop - Bring NPM down for maintenance
  Update - Redeploy the stack with updated settings or image tags
  Edit - Modify compose file inline
  Logs - View NPM and MariaDB container logs
  Console - Access a container shell for debugging
```

## Step 5: Update NPM Through Portainer

```bash
# Method 1: Through Portainer UI
# Go to Stacks → nginx-proxy-manager → Edit
# Change: jc21/nginx-proxy-manager:latest → jc21/nginx-proxy-manager:2.14.0
# Click Update the stack
# Optionally enable "Pull latest image" before updating

# Method 2: Via Portainer API for a stack created in the Web Editor
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-access-token"

# Get stack and environment identifiers
STACK_JSON=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/stacks" | \
  jq '.[] | select(.Name == "nginx-proxy-manager")')

STACK_ID=$(jq -r '.Id' <<<"$STACK_JSON")
ENDPOINT_ID=$(jq -r '.EndpointId' <<<"$STACK_JSON")

# Fetch the current stack file, update the image tag, then redeploy
UPDATED_STACK_FILE=$(
  curl -s -H "X-API-Key: $API_KEY" \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}/file" | \
  jq -r '.StackFileContent' | \
  sed 's#jc21/nginx-proxy-manager:latest#jc21/nginx-proxy-manager:2.14.0#'
)

jq -n \
  --arg stackFileContent "$UPDATED_STACK_FILE" \
  '{StackFileContent: $stackFileContent, RepullImageAndRedeploy: true}' | \
curl -s -X PUT -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  --data @-
```

## Step 6: Backup NPM Configuration via Portainer

```bash
# For SQLite, stop the stack in Portainer first so the database file is copied consistently.
# Then back up the mounted NPM volumes:
#   - npm_data (contains /data/database.sqlite and application state)
#   - npm_letsencrypt (contains certificates)
#
# For MariaDB, back up the npm-db database volume/container instead of /data/database.sqlite.
```

## Conclusion

Deploying Nginx Proxy Manager as a Portainer stack brings all lifecycle management under a single interface. The SQLite backend is appropriate for single-host deployments while the MariaDB option provides better reliability for production. Use Portainer's environment variables to keep database credentials out of the compose file, and use a shared `proxy` network with a fixed name so other managed stacks can be reached by NPM.
