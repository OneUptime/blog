# How to Check Image Updates via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Image Updates, Container Management, Automation

Description: Learn how to use the Portainer API to check for available container image updates across your environments.

## Overview

Through Portainer's Docker API proxy, you can pull tags again and compare local and remote digests to determine whether newer versions of container images are available. This is useful for automated workflows that need to identify stale images without manually checking each container.

## Triggering an Image Update Check

```bash
# Trigger Portainer to pull a tag again through the Docker API proxy
# If the image is in a Portainer-managed private registry, pass that registry's ID.

curl -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/create?fromImage=registry.mycompany.com/myapp:latest" \
  -H "X-API-Key: ${ACCESS_TOKEN}" \
  -H "X-Registry-Auth: $(printf '{"registryId":1}' | base64 | tr -d '\n')"
```

## Listing Images and Their Details

```bash
# List all local images
curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/json" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq '[.[] | {
    id: .Id[7:19],
    repo: .RepoTags[0],
    created: .Created,
    size_mb: (.Size / 1048576 | floor)
  }]'
```

## Checking if a Specific Image Has Updates

```bash
#!/bin/bash
# Check if Portainer's first local digest matches the remote manifest digest

PORTAINER_URL="https://portainer.mycompany.com"
ACCESS_TOKEN="${PORTAINER_ACCESS_TOKEN}"
ENDPOINT_ID=1
IMAGE="nginx:latest"
IMAGE_PATH=$(jq -nr --arg image "$IMAGE" '$image | @uri')

# Get Portainer's first local digest for the image
LOCAL_DIGEST=$(curl -s \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/${IMAGE_PATH}/json" \
  -H "X-API-Key: ${ACCESS_TOKEN}" | \
  jq -r '(.RepoDigests[0] // "" | split("@")[1]) // empty')

echo "Local digest: ${LOCAL_DIGEST}"

# Get the remote manifest digest for the same image tag
REGISTRY_DIGEST=$(docker manifest inspect --verbose "$IMAGE" 2>/dev/null | \
  jq -r '.Digest // empty')

echo "Registry digest: ${REGISTRY_DIGEST}"

if [ -z "$LOCAL_DIGEST" ] || [ -z "$REGISTRY_DIGEST" ]; then
  echo "Unable to resolve both digests for ${IMAGE}"
  exit 1
fi

if [ "$LOCAL_DIGEST" = "$REGISTRY_DIGEST" ]; then
  echo "Image is up to date"
else
  echo "Update available!"
fi
```

## Using Portainer's Stack Update with Image Repull

For file-based stacks, a common pattern is to trigger a redeploy with `RepullImageAndRedeploy: true`:

```bash
# Redeploy a stack, forcing Portainer to repull the referenced images
STACK_ID=3

curl -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "StackFileContent": "...",
    "RepullImageAndRedeploy": true,
    "Prune": false
  }'
```

## Automated Daily Image Update Check Script

```bash
#!/bin/bash
# daily-image-check.sh - Check all containers for image updates

PORTAINER_URL="https://portainer.mycompany.com"
ACCESS_TOKEN="${PORTAINER_ACCESS_TOKEN}"
ENDPOINT_ID=1
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# Get all running containers
CONTAINERS=$(curl -s \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" \
  -H "X-API-Key: ${ACCESS_TOKEN}")

# Check each container's image
OUTDATED=()

while IFS= read -r container; do
  IMAGE=$(echo "$container" | jq -r '.Image')
  NAME=$(echo "$container" | jq -r '.Names[0] | ltrimstr("/")')
  IMAGE_PATH=$(jq -nr --arg image "$IMAGE" '$image | @uri')
  IMAGE_QUERY=$(jq -nr --arg image "$IMAGE" '$image | @uri')

  BEFORE_ID=$(curl -s \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/${IMAGE_PATH}/json" \
    -H "X-API-Key: ${ACCESS_TOKEN}" | \
    jq -r '.Id // empty')

  # Pull the current tag again through Portainer, then compare the local image ID
  curl -s -X POST \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/create?fromImage=${IMAGE_QUERY}" \
    -H "X-API-Key: ${ACCESS_TOKEN}" > /dev/null

  AFTER_ID=$(curl -s \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/${IMAGE_PATH}/json" \
    -H "X-API-Key: ${ACCESS_TOKEN}" | \
    jq -r '.Id // empty')

  if [ -n "$BEFORE_ID" ] && [ -n "$AFTER_ID" ] && [ "$BEFORE_ID" != "$AFTER_ID" ]; then
    OUTDATED+=("${NAME} (${IMAGE})")
  fi
done < <(echo "$CONTAINERS" | jq -c '.[]')

# Notify if updates are available
if [ ${#OUTDATED[@]} -gt 0 ]; then
  MESSAGE="Container image updates available: $(printf '\n- %s' "${OUTDATED[@]}")"
  jq -n --arg text "$MESSAGE" '{text: $text}' | \
  curl -s -X POST "${SLACK_WEBHOOK}" \
    -H "Content-Type: application/json" \
    --data @-
fi
```

## Conclusion

Checking for image updates via the Portainer API lets you build automated notification and update workflows. Combine it with a scheduled cron job and notification channels to stay on top of available security patches and new releases.
