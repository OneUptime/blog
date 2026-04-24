# How to Identify Image Update Indicators in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Update, DevOps

Description: Learn how to use Portainer's image update indicators to detect when newer versions of your container images are available in the registry.

## Introduction

Keeping container images up to date is important for security patches and new features. Portainer Business Edition can compare local and remote image digests and show visual indicators in the UI when newer tagged images are available in the registry. This guide covers how to use this feature and automate image update checks.

## Prerequisites

- Portainer Business Edition installed with a connected Docker environment
- Containers or stacks using images that are available in Docker Hub or a compatible registry

## Step 1: Enable Image Update Checking in Portainer

Portainer's image up-to-date indicator is enabled per environment:

1. Select your Docker Standalone or Docker Swarm environment.
2. Navigate to **Host** > **Setup** for Docker Standalone, or **Swarm** > **Setup** for Docker Swarm.
3. In the **Other** section, enable **Show an image(s) up to date indicator for Stacks, Services and Containers**.

## Step 2: Identify the Update Indicator

In Portainer, when the feature is enabled, the **Images up to date** column appears for containers, stacks, and services:

- A **green tick** indicates the image is up to date.
- An **orange cross** indicates a newer version of the tagged image is available at the registry.
- A **grey hyphen** indicates Portainer could not determine whether an update is available.

You can use the reload button to recheck all rows, or click the indicator for a single container, stack, or service.

## Step 3: Manual Update Check

To manually check for updates:

```bash
# Docker CLI: check if a newer image is available for a tag

# Get the current local image ID:
docker image inspect nginx:alpine --format '{{.Id}}'
# sha256:abc123...

# Pull the tag from the registry:
docker pull nginx:alpine
# If output shows "Status: Downloaded newer image" → update available
# If output shows "Status: Image is up to date" → no update needed
```

## Step 4: Automated Image Update Check Script

```bash
#!/bin/bash
# check-image-updates.sh
# Checks if updates are available for all running container images

echo "=== Docker Image Update Check: $(date) ==="
echo ""

# Get list of images used by running containers
docker ps --format "{{.Image}}" | sort -u | while IFS= read -r image; do
    # Get current local image ID
    LOCAL_ID=$(docker image inspect "${image}" --format '{{.Id}}' 2>/dev/null)

    # Pull and check if a new image is available
    PULL_OUTPUT=$(docker pull "${image}" 2>&1)

    if echo "${PULL_OUTPUT}" | grep -q "Downloaded newer image"; then
        echo "⬆️  UPDATE AVAILABLE: ${image}"
        echo "   Before pull: ${LOCAL_ID:0:12}..."
        NEW_ID=$(docker image inspect "${image}" --format '{{.Id}}' 2>/dev/null)
        echo "   After pull:  ${NEW_ID:0:12}..."
    elif echo "${PULL_OUTPUT}" | grep -q "Image is up to date"; then
        echo "✓  Up to date: ${image}"
    else
        echo "✗  Check failed: ${image}"
    fi
done
```

## Step 5: Using Watchtower for Automatic Updates

Deploy Watchtower to automatically update containers when new images are available:

```yaml
# watchtower-stack.yml
services:
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Check for updates at minute 0 every 6th hour (cron format with seconds)
      - WATCHTOWER_SCHEDULE=0 0 */6 * * *
      # Send notification to Slack
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=${SLACK_WEBHOOK}
      # Only notify, don't actually update (dry run):
      - WATCHTOWER_MONITOR_ONLY=true   # Remove for actual updates
      # Clean up old images after update:
      - WATCHTOWER_CLEANUP=true
      # Log level:
      - WATCHTOWER_DEBUG=false
```

With `WATCHTOWER_MONITOR_ONLY=true`, Watchtower checks for new images and sends notifications without restarting containers - safer for production.

## Step 6: Portainer's Automatic Update for Stacks

For stacks deployed from a Git repository, enable Git-based auto-updates in Portainer:

1. Navigate to **Stacks**.
2. Click your stack name.
3. Enable **Auto update**.
4. Choose **Polling** (check the Git repository on an interval) or **Webhook**.
5. Enable **Re-pull image** to pull the current tagged image during an update.

This ensures Portainer re-pulls images whenever the stack is updated from Git.

## Step 7: Image Update Notification Pattern

For production environments, notify before updating:

```bash
#!/bin/bash
# notify-image-updates.sh
# Checks for updates and sends notifications

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

send_notification() {
    local message="$1"
    curl -s -X POST "${SLACK_WEBHOOK}" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"${message}\"}"
}

docker ps --format "{{.Names}}\t{{.Image}}" | while IFS=$'\t' read -r name image; do
    LOCAL_ID=$(docker image inspect "${image}" --format '{{.Id}}' 2>/dev/null | cut -c1-12)

    # Pull image and compare the local ID before and after
    PULL_OUTPUT=$(docker pull "${image}" 2>&1)
    NEW_ID=$(docker image inspect "${image}" --format '{{.Id}}' 2>/dev/null | cut -c1-12)

    if [ "${LOCAL_ID}" != "${NEW_ID}" ]; then
        send_notification "🔔 Image update available for container *${name}*\nImage: \`${image}\`\nOld: ${LOCAL_ID}\nNew: ${NEW_ID}"
    fi
done
```

## Step 8: Digest-Based Update Detection

For more reliable update detection using image digests (requires Docker Buildx and `jq`):

```bash
#!/bin/bash
# digest-check.sh
# More reliable update detection using registry digests

check_update() {
    local image="$1"

    # Get the image's current local repo digest
    LOCAL_DIGEST=$(docker image inspect --format '{{index .RepoDigests 0}}' "${image}" 2>/dev/null)

    # Get the current registry digest without pulling the image
    REGISTRY_DIGEST=$(docker buildx imagetools inspect "${image}" --format '{{json .Manifest}}' 2>/dev/null | \
        jq -r '.digest' 2>/dev/null)

    if [ -z "${LOCAL_DIGEST}" ] || [ -z "${REGISTRY_DIGEST}" ] || [ "${REGISTRY_DIGEST}" = "null" ]; then
        echo "Could not determine digest for: ${image}"
        return
    fi

    # Extract just the digest portion for comparison
    LOCAL_SHORT=$(echo "${LOCAL_DIGEST}" | cut -d@ -f2 | cut -c1-12)
    REGISTRY_SHORT=$(echo "${REGISTRY_DIGEST}" | cut -c1-12)

    if [ "${LOCAL_SHORT}" != "${REGISTRY_SHORT}" ]; then
        echo "UPDATE AVAILABLE: ${image}"
    else
        echo "Up to date: ${image}"
    fi
}

for image in $(docker ps --format "{{.Image}}" | sort -u); do
    check_update "${image}"
done
```

## Best Practices for Image Updates

- **Don't auto-update production containers** without testing - use `WATCHTOWER_MONITOR_ONLY=true`.
- **Update on a schedule** (e.g., nightly in staging, weekly in production).
- **Use semantic versioning** - pin to `v2.1` (gets patch updates) not `latest` (gets breaking changes).
- **Test updates in staging** before applying to production.
- **Keep a rollback plan** - know the previous image digest before updating.

## Conclusion

Portainer's image update indicators and automated checking tools help you stay current with security patches and new releases. For production environments, use notification-only mode to be aware of updates before they're applied. Combine with CI/CD pipelines to test updates in staging before promoting to production, ensuring you get the benefits of updates without unexpected disruptions.
