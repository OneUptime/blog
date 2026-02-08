# How to Automate Docker Image Updates with Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, automation, image updates, scripting, watchtower, CI/CD, DevOps

Description: Automate Docker image updates with custom scripts and tools like Watchtower to keep your containers running the latest secure versions.

---

Running outdated Docker images is one of the most common security risks in containerized environments. Every day that passes without updating your images is another day that known vulnerabilities go unpatched. Manual updates do not scale. If you manage more than a handful of containers, you need automation.

This guide covers multiple approaches to automating Docker image updates, from simple shell scripts to dedicated tools like Watchtower.

## The Basic Update Pattern

The fundamental workflow for updating a Docker container is straightforward: pull the latest image, stop the old container, start a new one with the same configuration. The challenge is automating this reliably.

```bash
#!/bin/bash
# update-container.sh
# Updates a single Docker container to the latest version of its image

CONTAINER_NAME="$1"

if [ -z "$CONTAINER_NAME" ]; then
    echo "Usage: update-container.sh <container_name>"
    exit 1
fi

# Get the current image name and tag
IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME")
echo "Current image: $IMAGE"

# Pull the latest version
echo "Pulling latest image..."
docker pull "$IMAGE"

# Compare image IDs to check if an update is available
RUNNING_ID=$(docker inspect --format '{{.Image}}' "$CONTAINER_NAME")
LATEST_ID=$(docker inspect --format '{{.Id}}' "$IMAGE")

if [ "$RUNNING_ID" = "$LATEST_ID" ]; then
    echo "Container is already running the latest image"
    exit 0
fi

echo "Update available. Recreating container..."

# Save the container's run configuration for recreation
docker inspect "$CONTAINER_NAME" > "/tmp/${CONTAINER_NAME}_config.json"

# Stop and remove the old container
docker stop "$CONTAINER_NAME"
docker rename "$CONTAINER_NAME" "${CONTAINER_NAME}_old"

# Recreate with Docker Compose if a compose file exists
if [ -f "docker-compose.yml" ]; then
    docker compose up -d "$CONTAINER_NAME"
else
    echo "No compose file found. Manual recreation needed."
    echo "Old container saved as ${CONTAINER_NAME}_old"
    exit 1
fi

# Verify the new container is healthy
sleep 10
STATUS=$(docker inspect --format '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null)
if [ "$STATUS" = "running" ]; then
    echo "Update successful. Removing old container."
    docker rm "${CONTAINER_NAME}_old"
else
    echo "ERROR: New container failed to start. Rolling back."
    docker rm "$CONTAINER_NAME" 2>/dev/null
    docker rename "${CONTAINER_NAME}_old" "$CONTAINER_NAME"
    docker start "$CONTAINER_NAME"
    exit 1
fi
```

## Checking for Updates Without Applying Them

Sometimes you want to know what updates are available before applying them.

```bash
#!/bin/bash
# check-updates.sh
# Checks all running containers for available image updates

echo "=== Docker Image Update Check ==="
echo "Date: $(date)"
echo ""

UPDATES_AVAILABLE=0

for CONTAINER_ID in $(docker ps -q); do
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
    IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_ID")
    RUNNING_ID=$(docker inspect --format '{{.Image}}' "$CONTAINER_ID" | cut -c8-19)

    # Pull the latest image quietly to check for updates
    docker pull "$IMAGE" > /dev/null 2>&1

    LATEST_ID=$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null | cut -c8-19)

    if [ "$RUNNING_ID" != "$LATEST_ID" ]; then
        echo "UPDATE AVAILABLE: $NAME ($IMAGE)"
        echo "  Running: $RUNNING_ID"
        echo "  Latest:  $LATEST_ID"
        UPDATES_AVAILABLE=$((UPDATES_AVAILABLE + 1))
    fi
done

echo ""
if [ "$UPDATES_AVAILABLE" -eq 0 ]; then
    echo "All containers are up to date."
else
    echo "$UPDATES_AVAILABLE container(s) have updates available."
fi
```

## Automated Updates with Watchtower

Watchtower monitors running containers and automatically updates them when new images are available.

```yaml
# docker-compose.watchtower.yml
# Watchtower automatically updates running containers when new images are pushed
version: "3.8"

services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      # Watchtower needs access to the Docker socket to manage containers
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Check for updates every 6 hours (in seconds)
      - WATCHTOWER_POLL_INTERVAL=21600
      # Remove old images after updating
      - WATCHTOWER_CLEANUP=true
      # Send notifications on updates
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
      - WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=watchtower
      # Only update containers with the enable label
      - WATCHTOWER_LABEL_ENABLE=true
    restart: always
```

Label containers that Watchtower should manage:

```yaml
# docker-compose.yml
# Application containers with Watchtower update labels
version: "3.8"

services:
  web:
    image: registry.example.com/myapp:latest
    labels:
      # Enable Watchtower auto-updates for this container
      - com.centurylinklabs.watchtower.enable=true
    ports:
      - "8080:8080"

  db:
    image: postgres:16
    labels:
      # Disable auto-updates for the database (update manually)
      - com.centurylinklabs.watchtower.enable=false
    volumes:
      - pg_data:/var/lib/postgresql/data
```

## Docker Compose Update Script

For teams using Docker Compose, a targeted update script works well.

```bash
#!/bin/bash
# compose-update.sh
# Updates Docker Compose services with zero-downtime rolling updates

COMPOSE_FILE="${1:-docker-compose.yml}"
SERVICES="${2:-}"  # Optional: specific services to update (space-separated)

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

echo "[$(date)] Starting Docker Compose update"

# Pull the latest images for all services (or specific ones)
if [ -n "$SERVICES" ]; then
    echo "Pulling images for: $SERVICES"
    docker compose -f "$COMPOSE_FILE" pull $SERVICES
else
    echo "Pulling all images..."
    docker compose -f "$COMPOSE_FILE" pull
fi

# Recreate only containers that have new images
# The --no-deps flag prevents restarting dependent services unnecessarily
if [ -n "$SERVICES" ]; then
    for SERVICE in $SERVICES; do
        echo "Updating service: $SERVICE"
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate "$SERVICE"

        # Wait for the service to become healthy
        echo "Waiting for $SERVICE to become healthy..."
        RETRIES=30
        while [ $RETRIES -gt 0 ]; do
            HEALTH=$(docker compose -f "$COMPOSE_FILE" ps --format json "$SERVICE" | \
                jq -r '.Health // "none"')
            if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "none" ]; then
                echo "$SERVICE is ready"
                break
            fi
            RETRIES=$((RETRIES - 1))
            sleep 2
        done

        if [ $RETRIES -eq 0 ]; then
            echo "WARNING: $SERVICE did not become healthy within 60 seconds"
        fi
    done
else
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
fi

echo "[$(date)] Update complete"
docker compose -f "$COMPOSE_FILE" ps
```

## Version Pinning with Automated Bumps

Instead of using `latest` tags (which can introduce unexpected changes), pin specific versions and automate the version bump process.

```bash
#!/bin/bash
# bump-versions.sh
# Checks for new versions of pinned images and updates the compose file

COMPOSE_FILE="docker-compose.yml"
BRANCH="auto-update/$(date +%Y%m%d)"

# Define image version mappings to check
declare -A IMAGES
IMAGES["nginx"]="nginx"
IMAGES["postgres"]="postgres"
IMAGES["redis"]="redis"

UPDATES_FOUND=false

for SERVICE in "${!IMAGES[@]}"; do
    REPO="${IMAGES[$SERVICE]}"

    # Get the currently pinned version from the compose file
    CURRENT=$(grep -oP "image: ${REPO}:\K[^\s]+" "$COMPOSE_FILE" | head -1)

    if [ -z "$CURRENT" ]; then
        continue
    fi

    # Query Docker Hub for the latest stable version
    LATEST=$(curl -s "https://hub.docker.com/v2/repositories/library/${REPO}/tags/?page_size=10&ordering=last_updated" | \
        jq -r '.results[].name' | grep -E '^[0-9]+\.[0-9]+(\.[0-9]+)?$' | sort -V | tail -1)

    if [ -n "$LATEST" ] && [ "$CURRENT" != "$LATEST" ]; then
        echo "Update available for $REPO: $CURRENT -> $LATEST"
        # Update the version in the compose file
        sed -i "s|image: ${REPO}:${CURRENT}|image: ${REPO}:${LATEST}|g" "$COMPOSE_FILE"
        UPDATES_FOUND=true
    else
        echo "$REPO is up to date ($CURRENT)"
    fi
done

if [ "$UPDATES_FOUND" = true ]; then
    echo ""
    echo "Updates applied to $COMPOSE_FILE"
    echo "Review the changes and test before deploying."
fi
```

## Scheduled Update Pipeline

For production environments, use a scheduled CI/CD pipeline that tests updates before applying them.

```yaml
# .github/workflows/scheduled-updates.yml
# Runs weekly to check for and apply Docker image updates

name: Scheduled Docker Updates

on:
  schedule:
    # Run every Monday at 6 AM UTC
    - cron: "0 6 * * 1"
  workflow_dispatch:  # Allow manual triggers

jobs:
  check-and-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Pull latest images and check for updates
      - name: Check for updates
        id: check
        run: |
          docker compose pull 2>&1 | tee /tmp/pull-output.txt

          # Check if any images were actually updated
          if grep -q "Downloaded newer image" /tmp/pull-output.txt; then
            echo "updates=true" >> $GITHUB_OUTPUT
          else
            echo "updates=false" >> $GITHUB_OUTPUT
          fi

      # Run tests with the updated images
      - name: Test with updated images
        if: steps.check.outputs.updates == 'true'
        run: |
          docker compose up -d
          sleep 30

          # Run your integration tests
          ./run-tests.sh

          docker compose down

      # Create a pull request with the updates
      - name: Create update PR
        if: steps.check.outputs.updates == 'true'
        run: |
          git checkout -b auto-update/$(date +%Y%m%d)
          git add docker-compose.yml
          git commit -m "chore: update Docker images to latest versions"
          git push origin auto-update/$(date +%Y%m%d)

          gh pr create \
            --title "Update Docker images ($(date +%Y-%m-%d))" \
            --body "Automated Docker image update. All tests passed."
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Rollback Script

Every update process needs a rollback mechanism.

```bash
#!/bin/bash
# rollback.sh
# Rolls back a Docker Compose service to its previous image version

SERVICE="$1"
COMPOSE_FILE="${2:-docker-compose.yml}"

if [ -z "$SERVICE" ]; then
    echo "Usage: rollback.sh <service_name> [compose_file]"
    exit 1
fi

# Get the previous image from Docker's local image history
CURRENT_IMAGE=$(docker compose -f "$COMPOSE_FILE" images "$SERVICE" --format json | jq -r '.Repository + ":" + .Tag')
echo "Current image: $CURRENT_IMAGE"

# List recent versions of this image available locally
echo "Available local versions:"
docker images --format "{{.Repository}}:{{.Tag}} ({{.CreatedAt}})" | grep "${CURRENT_IMAGE%%:*}"

echo ""
read -p "Enter the image:tag to rollback to: " ROLLBACK_IMAGE

if [ -z "$ROLLBACK_IMAGE" ]; then
    echo "No rollback image specified. Aborting."
    exit 1
fi

# Perform the rollback
echo "Rolling back $SERVICE to $ROLLBACK_IMAGE..."
docker compose -f "$COMPOSE_FILE" stop "$SERVICE"
docker compose -f "$COMPOSE_FILE" rm -f "$SERVICE"

# Temporarily override the image in docker compose
IMAGE_OVERRIDE="${ROLLBACK_IMAGE}" docker compose -f "$COMPOSE_FILE" up -d "$SERVICE"

echo "Rollback complete. Verify the service is healthy."
docker compose -f "$COMPOSE_FILE" ps "$SERVICE"
```

## Summary

Automating Docker image updates keeps your containers secure and current without manual intervention. For simple setups, a shell script that pulls new images and recreates containers works well. For more sophisticated environments, Watchtower provides hands-off automatic updates. For production systems, use a scheduled CI/CD pipeline that tests updates before applying them. Always have a rollback plan, and never auto-update databases or stateful services without careful testing first.
