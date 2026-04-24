# How to Set Up Container Webhooks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Webhook, CI/CD, Automation

Description: Learn how to create and configure container webhooks in Portainer to enable automated redeployment triggered by external systems.

## Introduction

Portainer container webhooks allow external systems - CI/CD pipelines, GitHub Actions, GitLab CI, or custom scripts - to trigger a container redeployment with a simple HTTP POST request. This is a lightweight alternative to the full Portainer API for automated deployments.

## Prerequisites

- Portainer Business Edition on a non-Edge environment (container webhooks are only available in BE and are not supported on Edge Agent environments)
- A running container to create a webhook for
- External system that can make HTTP POST requests

## How Portainer Webhooks Work

When a webhook is triggered:
1. Portainer receives the HTTP POST request.
2. It pulls the latest image for the container's configured tag.
3. It stops the existing container and recreates it.
4. It starts the replacement container with the same configuration.

This effectively gives you a "pull latest and redeploy" operation via a single HTTP call.

## Step 1: Create a Container Webhook

1. Navigate to **Containers** in Portainer.
2. Click on the container you want to add a webhook to.
3. Scroll down to the **Webhooks** section.
4. Enable **Container webhook**.
5. Portainer generates a unique webhook URL.
6. Copy the URL - you'll need it in your CI/CD pipeline.

The URL format looks like:
```text
https://portainer.example.com/api/webhooks/abc123def456...
```

## Step 2: Test the Webhook

Test that the webhook works by triggering it manually:

```bash
# Test with curl:

curl -X POST "https://portainer.example.com/api/webhooks/your-token"

# Expected response: HTTP 204 No Content
# This means the redeploy was triggered successfully

# With verbose output to see the response code:
curl -v -X POST "https://portainer.example.com/api/webhooks/your-token" 2>&1 | grep "< HTTP"
# < HTTP/2 204
```

## Step 3: What Happens During a Webhook Trigger

The sequence when a webhook fires:

```text
1. POST request received
2. Portainer validates the token from the URL
3. Pulls the image for the configured tag (or the `tag` override, if provided)
4. Stops the existing container
5. Recreates the container with the saved configuration
6. Starts the replacement container
7. Removes the old container after the new one starts
```

The container name, volumes, ports, and all other settings remain the same. The container ID changes because Portainer creates a replacement container.

## Step 4: Webhook Configuration for Different Image Tags

By default, webhooks pull the image tag configured in the container. To use a different tag, pass the `tag` query parameter:

```bash
# Deploy a specific version:
curl -X POST \
  "https://portainer.example.com/api/webhooks/your-token?tag=v2.1.0"

# Note: tag parameter overrides the container's configured image tag
```

This is useful when you want one webhook URL to handle multiple version deployments.

## Step 5: Secure Webhook URLs

Webhook URLs contain a secret token. Handle them securely:

```bash
# Store in CI/CD secrets (never in code):
# GitHub: Settings > Secrets > Actions secrets
# GitLab: Settings > CI/CD > Variables
# Jenkins: Manage Jenkins > Credentials

# DON'T do this:
# git commit -m "add deployment" webhook_url.txt

# DO this: use secret management and let your CI/CD platform inject the secret
curl -X POST "${PORTAINER_WEBHOOK_URL}"
```

## Step 6: Multiple Containers, Multiple Webhooks

Each container has its own webhook. For a microservices deployment:

```bash
#!/bin/bash
# deploy-all-services.sh
# Each service has its own webhook URL

deploy_service() {
    local service_name="$1"
    local webhook_url="$2"

    echo "Deploying ${service_name}..."
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${webhook_url}")

    if [ "$response" == "204" ]; then
        echo "  ✓ ${service_name} deployment triggered"
    else
        echo "  ✗ ${service_name} deployment failed (HTTP ${response})"
        return 1
    fi
}

deploy_service "api-service" "${PORTAINER_WEBHOOK_API}"
deploy_service "web-frontend" "${PORTAINER_WEBHOOK_WEB}"
deploy_service "worker" "${PORTAINER_WEBHOOK_WORKER}"
```

## Step 7: Webhook with Image Verification

Before triggering, verify the new image exists:

```bash
#!/bin/bash
# verified-deploy.sh
# Verifies new image before triggering Portainer webhook

IMAGE="myorg/myapp"
TAG="${NEW_VERSION}"
REGISTRY="registry.example.com"
WEBHOOK_URL="${PORTAINER_WEBHOOK_URL}"

# Check if image exists in registry
if curl -sf \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  -H "Authorization: Basic $(echo -n "${REGISTRY_USER}:${REGISTRY_PASS}" | base64)" \
  "https://${REGISTRY}/v2/${IMAGE}/manifests/${TAG}" > /dev/null; then

    echo "Image verified: ${IMAGE}:${TAG}"
    curl -X POST "${WEBHOOK_URL}?tag=${TAG}"
    echo "Deployment triggered"
else
    echo "Image not found: ${IMAGE}:${TAG}"
    exit 1
fi
```

## Step 8: Monitor Webhook Execution

After triggering a webhook, monitor the deployment:

```bash
#!/bin/bash
# monitor-deployment.sh
# Waits for the container to be running after webhook trigger

CONTAINER_NAME="my-app"
PORTAINER_URL="${PORTAINER_URL}"
API_KEY="${PORTAINER_API_KEY}"
WEBHOOK_URL="${PORTAINER_WEBHOOK_URL}"
ENDPOINT_ID=1
TIMEOUT=120
INTERVAL=5

# Trigger the webhook
curl -X POST "${WEBHOOK_URL}"
echo "Webhook triggered, waiting for deployment..."

# Poll container status
for ((i=0; i<$((TIMEOUT/INTERVAL)); i++)); do
    status=$(curl -s \
        -H "X-API-Key: ${API_KEY}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r ".[] | select(.Names[] == \"/${CONTAINER_NAME}\") | .State")

    echo "Container status: ${status}"

    if [ "${status}" == "running" ]; then
        echo "✓ Deployment successful!"
        exit 0
    fi

    sleep "${INTERVAL}"
done

echo "✗ Timeout waiting for container to start"
exit 1
```

## Conclusion

Container webhooks in Portainer provide a simple, token-based mechanism for triggering automated redeployments from CI/CD pipelines and other external systems. With a single HTTP POST, you can pull the latest image and recreate your container - making it easy to integrate Portainer into any deployment workflow without complex API authentication.
