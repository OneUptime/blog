# How to Manage Docker Configs in Portainer on Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, CONFIG, Configuration Management, DevOps

Description: Learn how to create, manage, and attach Docker Swarm configs to services using Portainer for centralized configuration management.

## Introduction

Docker Configs provide a way to store non-sensitive configuration data (like Nginx configuration files, application config files, or certificates) in the Swarm cluster and distribute them to services as files. Unlike environment variables, configs are mounted as files inside containers, making them ideal for complex configurations. This guide covers managing Docker Configs through Portainer.

## Prerequisites

- Portainer on Docker Swarm
- Admin access to Portainer
- Running Swarm cluster
- Access to a Swarm manager node for CLI commands

## What Are Docker Configs

Docker Configs differ from secrets in one key way: configs are **not encrypted at rest**. They are suitable for:

- Nginx, HAProxy, or other proxy configuration files
- Application configuration files
- SSL certificates (public portions)
- Startup scripts

For sensitive data (passwords, private keys), use Docker Secrets instead.

## Step 1: View Existing Configs

1. In Portainer, select your Swarm environment
2. Click **Configs** in the sidebar

You see a table of all configs with:
- Config name
- Creation date
- Services using the config

## Step 2: Create a New Config

1. Click **+ Add config**
2. Enter a **Config name** (e.g., `nginx-config`)
3. Paste the configuration content in the text field:

```nginx
# nginx.conf

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

4. Click **Create config**

## Step 3: Create Config via CLI

```bash
# Create from a file
docker config create nginx-config ./nginx.conf

# Or create from stdin
cat nginx.conf | docker config create nginx-config-stdin -

# List all configs
docker config ls

# Inspect a config
docker config inspect nginx-config

# View config content
docker config inspect --format '{{json .Spec.Data}}' nginx-config | \
  python3 -c "import json,sys,base64; print(base64.b64decode(json.load(sys.stdin)).decode())"
```

## Step 4: Attach Config to a Service

### Via Portainer Service Editor

1. Open a service for editing
2. Scroll to the **Configs** section
3. Click **+ Add a config**
4. Select the config name from the dropdown
5. Set the **Target path** where the file should appear in the container:

```text
Config:       nginx-config
Target path:  /etc/nginx/conf.d/default.conf
```

6. Optionally set:
   - **UID/GID** - File ownership
   - **Mode** - File permissions (e.g., `0444`)

### Via Stack Compose File

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    configs:
      - source: nginx-config           # Config name in Swarm
        target: /etc/nginx/conf.d/default.conf  # Path inside container
        mode: 0444                     # Read-only for all users

configs:
  nginx-config:
    external: true    # Already exists in the Swarm cluster
```

Or define the config from a local file (creates it when deploying the stack):

```yaml
configs:
  nginx-config:
    file: ./nginx.conf    # Create from local file when deploying
```

## Step 5: Update a Config

Docker Configs are **immutable** - you cannot update a config's content in place. Instead, create a new config version and update the service to use it:

```bash
# Create v2 of the config
docker config create nginx-config-v2 ./nginx-v2.conf

# Update the service to use the new config
docker service update \
  --config-rm nginx-config \
  --config-add source=nginx-config-v2,target=/etc/nginx/conf.d/default.conf \
  my-nginx-service
```

In Portainer:
1. Create the new config (`nginx-config-v2`)
2. Edit the service
3. Remove the old config attachment
4. Add the new config attachment

## Step 6: Config Versioning Strategy

Since configs are immutable, use a naming convention for versions:

```bash
# Naming convention: name-vN or name-YYYYMMDD
docker config create nginx-config-v1 nginx-v1.conf
docker config create nginx-config-v2 nginx-v2.conf
docker config create nginx-config-20240115 nginx-current.conf
```

Use scripts to manage config lifecycle:

```bash
#!/bin/bash
# update-config.sh
CURRENT_CONFIG_NAME="nginx-config-v1"   # Currently attached to the service
BASE_CONFIG_NAME="nginx-config"
NEW_CONFIG_FILE="./nginx.conf"
TIMESTAMP=$(date +%Y%m%d%H%M)
NEW_CONFIG_NAME="${BASE_CONFIG_NAME}-${TIMESTAMP}"

# Create new config version
docker config create "$NEW_CONFIG_NAME" "$NEW_CONFIG_FILE"

# Update service to use new config
docker service update \
  --config-rm "$CURRENT_CONFIG_NAME" \
  --config-add source="$NEW_CONFIG_NAME",target=/etc/nginx/conf.d/default.conf \
  nginx-service

echo "Updated from $CURRENT_CONFIG_NAME to config: $NEW_CONFIG_NAME"
```

## Step 7: Remove Old Configs

Clean up unused configs:

```bash
# List all configs
docker config ls --format '{{.Name}}'

# Remove a specific config
docker config rm nginx-config-v1

# Remove all configs with a name pattern (careful!)
docker config ls --format '{{.Name}}' | grep "nginx-config-2023" | xargs docker config rm
```

In Portainer: select configs and click the remove button.

## Conclusion

Docker Configs in Swarm provide a clean, scalable way to distribute configuration files to services. Portainer's config management UI makes it easy to create, view, and attach configs without needing to know CLI commands. Remember that configs are immutable - adopt a versioning convention from the start to make config updates manageable in production.
