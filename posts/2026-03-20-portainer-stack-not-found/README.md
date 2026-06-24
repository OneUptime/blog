# How to Fix 'Stack Not Found' After a Portainer Crash - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Stack, Recovery

Description: Recover stacks that disappear from Portainer after a crash or restart, including re-importing running stacks and restoring stack definitions from backups.

## Introduction

After Portainer crashes or is reinstalled, you may find that stacks you previously managed are gone from the UI - even though the containers are still running. This happens because Portainer's stack metadata (stored in `portainer.db`) was lost, but the underlying Docker Compose stacks are intact. This guide shows how to recover Portainer management of them.

## Understanding the Problem

Portainer stacks consist of:
1. **Container resources**: The actual running containers, networks, and volumes in Docker (persistent, independent of Portainer)
2. **Stack metadata**: Portainer's record of which containers belong to which stack (stored in `portainer.db`)

After a Portainer crash, #2 is lost but #1 survives. The containers continue running, but Portainer no longer has the stack record for them.

## Step 1: Verify Containers Are Still Running

```bash
# Check if the containers are still running

docker ps | grep stack-name

# Check for all containers (including stopped ones)
docker ps -a | grep stack-name

# List containers with their labels (Docker Compose adds project labels)
docker ps --format "{{.Names}}: {{.Labels}}" | grep "com.docker.compose.project"
```

## Step 2: Check for Docker Compose Labels

Docker Compose labels stack resources with the project name:

```bash
# Find all stacks by their compose labels
docker ps -a --format '{{.Names}}: {{.Label "com.docker.compose.project"}}' \
  | grep -v ": $" | sort

# This shows you which containers belong to which stack
```

## Step 3: If the Stack Is Orphaned, Re-associate It in Portainer

If Portainer still shows the stack as orphaned (for example after reconnecting the same environment), use Portainer's built-in reassociation flow:

1. In Portainer, go to **Stacks**
2. Click the three-dot menu and choose **Show all orphaned stacks**
3. Open the orphaned stack
4. Click **Associate**

If the stack does not appear in the orphaned list, continue to Step 4 and recover the Compose file so you can deploy the stack again from Portainer.

## Step 4: Reconstruct the Compose File

If you don't have the original compose file:

```bash
# Use docker inspect to reconstruct container configuration
docker inspect <container-id> | jq '.[0]' > /tmp/container-config.json

# Get image
docker inspect --format='{{.Config.Image}}' <container-id>

# Get port mappings
docker inspect --format='{{json .HostConfig.PortBindings}}' <container-id>

# Get environment variables
docker inspect --format='{{json .Config.Env}}' <container-id>

# Get mount definitions (bind mounts and named volumes)
docker inspect --format='{{json .Mounts}}' <container-id>

# Get networks
docker inspect --format='{{json .NetworkSettings.Networks}}' <container-id>
```

Use this information to rebuild the compose file manually.

## Step 5: Optionally Use the Third-Party docker-autocompose Tool

`docker-autocompose` is a third-party helper, not an official Docker or Portainer utility.

```bash
# Generate a compose file from all containers in one Compose project
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/red5d/docker-autocompose \
  $(docker ps -aq --filter label=com.docker.compose.project=stack-name) \
  > recovered-compose.yml

# Review and clean up the generated file
cat recovered-compose.yml
```

## Step 6: Deploy the Recovered Stack via Portainer API

For a Docker Standalone / Compose environment, Portainer's current API endpoint for deploying stack content from a string is:

```bash
# Create an access token in Portainer under My account first
PORTAINER_URL="https://localhost:9443"
PORTAINER_API_KEY="your_api_key_here"

# Deploy the recovered stack definition
curl -X POST \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=1" \
  -d '{
    "Name": "mystack",
    "StackFileContent": "services:\n  myapp:\n    image: nginx:latest\n    ports:\n      - \"80:80\"\n"
  }'
```

> **Important**: Use the original Compose project name (the value in the `com.docker.compose.project` label). Docker Compose groups resources by project name and will reconcile existing containers for that project, recreating them only if the configuration or image has changed.

## Step 7: Restore from Portainer Backup

If you have a Portainer backup (highly recommended to set up):

Restore it on a **fresh Portainer instance with an empty data volume** using Portainer's **Restore Portainer from backup** option during the initial setup flow.

Portainer backups contain Portainer's database and stack files, but they do **not** include your environment's containers, images, volumes, or bind-mounted application data.

## Step 8: Prevent Future Stack Loss

Set up regular Portainer backups:

```bash
#!/bin/bash
# backup-portainer.sh
PORTAINER_URL="https://localhost:9443"
PORTAINER_API_KEY="your_api_key_here"
BACKUP_DIR="/opt/backups/portainer"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create a Portainer backup archive using the official API
curl -fsSL -X POST \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/backup" \
  -d '{}' \
  -o "$BACKUP_DIR/portainer-$DATE.tar.gz"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/portainer-*.tar.gz | tail -n +8 | xargs -r rm -f

echo "Backup completed: $BACKUP_DIR/portainer-$DATE.tar.gz"
```

Add to crontab: `0 2 * * * /opt/scripts/backup-portainer.sh`

## Step 9: Export Stack Definitions Regularly

```bash
PORTAINER_URL="https://localhost:9443"
PORTAINER_API_KEY="your_api_key_here"

mkdir -p /opt/stacks-backup

# Get all stacks
STACKS=$(curl -sS -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/api/stacks")

# Export each stack's compose file
echo "$STACKS" | jq -c '.[]' | while read -r stack; do
  STACK_ID=$(echo "$stack" | jq -r '.Id')
  STACK_NAME=$(echo "$stack" | jq -r '.Name')

  curl -sS -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/stacks/$STACK_ID/file" | \
    jq -r '.StackFileContent' > "/opt/stacks-backup/$STACK_NAME.yml"

  echo "Exported: $STACK_NAME"
done
```

## Conclusion

"Stack Not Found" after a Portainer crash doesn't mean your containers are gone - they're likely still running fine. Recover by re-associating orphaned stacks when Portainer still has the stack record, or by redeploying them from their Docker Compose definitions after reconstructing the compose file. The best long-term solution is regular automated Portainer backups and periodic exports of stack definitions to a version-controlled directory.
