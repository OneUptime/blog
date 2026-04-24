# How to Trigger Container Redeployment via Webhook in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Webhook, CI/CD, Automation

Description: Learn how to trigger Docker container redeployment in Portainer using webhooks from CI/CD pipelines, scripts, and automated systems.

## Introduction

Once you've created a webhook for a Portainer container, triggering redeployment is as simple as making an HTTP POST request. This guide covers how to trigger webhooks from various contexts: command line, CI/CD, shell scripts, and how to handle the response.

## Prerequisites

- Portainer Business Edition on a non-Edge environment, with a container webhook configured
- The webhook URL from Portainer

## How the Redeploy Webhook Works

```bash
Trigger: HTTP POST → webhook URL
Response: 204 No Content (success) or 4xx/5xx (error)

Behind the scenes:
1. Portainer receives the POST request at the webhook URL
2. Portainer pulls the most up-to-date image for the current tag
3. Portainer recreates the container using the saved configuration
4. Add ?tag=<tag> to the webhook URL to redeploy with a different image tag
```

## Method 1: cURL (Command Line)

```bash
# Simplest form:

curl -X POST https://portainer.example.com/api/webhooks/YOUR-TOKEN

# Check the HTTP status code:
curl -X POST -o /dev/null -s -w "%{http_code}" \
  https://portainer.example.com/api/webhooks/YOUR-TOKEN

# Verbose output:
curl -v -X POST https://portainer.example.com/api/webhooks/YOUR-TOKEN

# With timeout:
curl -X POST --max-time 30 \
  https://portainer.example.com/api/webhooks/YOUR-TOKEN
```

## Method 2: Trigger with Deploy Script

```bash
#!/bin/bash
# redeploy.sh
# Triggers Portainer webhook and checks for a successful response

WEBHOOK_URL="${PORTAINER_WEBHOOK_URL:?PORTAINER_WEBHOOK_URL is required}"
CONTAINER_NAME="${1:-my-container}"
MAX_RETRIES=3

echo "Triggering redeployment of ${CONTAINER_NAME}..."

for attempt in $(seq 1 $MAX_RETRIES); do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        --max-time 30 \
        "${WEBHOOK_URL}")

    if [ "${HTTP_STATUS}" == "204" ]; then
        echo "✓ Redeployment triggered successfully (attempt ${attempt})"
        exit 0
    else
        echo "✗ Webhook failed with status ${HTTP_STATUS} (attempt ${attempt}/${MAX_RETRIES})"
        if [ "${attempt}" -lt "${MAX_RETRIES}" ]; then
            echo "  Retrying in 5 seconds..."
            sleep 5
        fi
    fi
done

echo "✗ Redeployment failed after ${MAX_RETRIES} attempts"
exit 1
```

## Method 3: Deploy Specific Version via Tag Parameter

```bash
# Redeploy the container with a different image tag
VERSION="2.1.0"
WEBHOOK_URL="https://portainer.example.com/api/webhooks/YOUR-TOKEN"

# Portainer container webhooks accept the tag as a query parameter
curl -X POST "${WEBHOOK_URL}?tag=${VERSION}"
```

## Method 4: Webhook via Wget (for minimal environments)

```bash
# For Alpine containers or systems without curl:
wget -q -O- --post-data="" \
  https://portainer.example.com/api/webhooks/YOUR-TOKEN

# With status code check:
wget -S --post-data="" \
  https://portainer.example.com/api/webhooks/YOUR-TOKEN 2>&1 | \
  grep "HTTP/"
```

## Method 5: Python Script

```python
#!/usr/bin/env python3
"""
Trigger Portainer container redeployment via webhook.
"""

import requests
import sys
import time


def trigger_redeployment(webhook_url: str, retries: int = 3) -> bool:
    """Trigger container redeployment and return success status."""
    for attempt in range(1, retries + 1):
        try:
            response = requests.post(
                webhook_url,
                timeout=30
            )

            if response.status_code == 204:
                print(f"✓ Redeployment triggered (attempt {attempt})")
                return True
            else:
                print(f"✗ Webhook failed: HTTP {response.status_code} (attempt {attempt}/{retries})")

        except requests.exceptions.RequestException as e:
            print(f"✗ Request error: {e} (attempt {attempt}/{retries})")

        if attempt < retries:
            print(f"  Retrying in 5 seconds...")
            time.sleep(5)

    return False


if __name__ == "__main__":
    webhook_url = sys.argv[1] if len(sys.argv) > 1 else None
    if not webhook_url:
        print("Usage: python3 deploy.py <webhook-url>")
        sys.exit(1)

    if trigger_redeployment(webhook_url):
        sys.exit(0)
    else:
        sys.exit(1)
```

## Handling Webhook Responses

```bash
# Common Portainer webhook responses:
# 204 No Content    → Webhook accepted, redeployment triggered
# 404 Not Found     → Webhook not found (deleted or wrong URL)
# 5xx Server Error  → Portainer failed while processing the redeploy

# Handle different responses:
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${WEBHOOK_URL}")

case "$RESPONSE" in
    204)
        echo "✓ Deployment triggered"
        ;;
    404)
        echo "✗ Webhook not found - verify the URL"
        exit 1
        ;;
    5*)
        echo "✗ Server error (${RESPONSE}) - check Portainer status"
        exit 1
        ;;
    *)
        echo "✗ Unexpected response: ${RESPONSE}"
        exit 1
        ;;
esac
```

## Sequential Multi-Container Deployment

For deploying dependencies in order:

```bash
#!/bin/bash
# ordered-deploy.sh
# Deploys services in dependency order

trigger_and_wait() {
    local service="$1"
    local webhook_url="$2"
    local health_check_cmd="$3"
    local wait_seconds="${4:-30}"

    echo "→ Deploying ${service}..."

    # Trigger redeployment
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${webhook_url}")
    if [ "${HTTP_STATUS}" != "204" ]; then
        echo "  ✗ Webhook failed with HTTP ${HTTP_STATUS}"
        return 1
    fi

    # Wait for service to come up
    echo "  Waiting up to ${wait_seconds}s for ${service} to be healthy..."
    for i in $(seq 1 $((wait_seconds / 5))); do
        if sh -c "${health_check_cmd}" > /dev/null 2>&1; then
            echo "  ✓ ${service} is healthy"
            return 0
        fi
        sleep 5
    done

    echo "  ✗ ${service} failed to become healthy"
    return 1
}

# Deploy in order: database → cache → app
# Use a protocol-appropriate readiness check for each service
trigger_and_wait "database" \
  "${WEBHOOK_DB}" \
  "pg_isready -h localhost -p 5432" || exit 1

trigger_and_wait "cache" \
  "${WEBHOOK_REDIS}" \
  "redis-cli -h localhost -p 6379 ping | grep -q PONG" || exit 1

trigger_and_wait "app" \
  "${WEBHOOK_APP}" \
  "curl -sf http://localhost:8080/health" || exit 1

echo "✓ Full deployment complete"
```

## Conclusion

Triggering container redeployments via Portainer webhooks is straightforward with a simple HTTP POST. The key operations are: triggering the webhook, checking the 204 response for success, handling errors with retries, and for ordered deployments, waiting for health checks between services. Combine this with your CI/CD pipeline to create a fully automated deployment flow.
