# How to Automate Container Deployments with Portainer Webhooks (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Webhook, Docker, CI/CD, Automation

Description: Learn how to use Portainer container and service webhooks to trigger automated redeployments from any system that can make an HTTP POST request, including registry push events and custom scripts.

## Introduction

Portainer's webhook feature lets any system trigger container redeployments with a simple HTTP POST request. No API authentication required - the webhook URL itself is the authorization token. Container and stack webhooks require Portainer Business Edition, and all Portainer webhooks are only available on non-Edge environments. This makes it easy to integrate Portainer redeployments with Docker Hub, GitHub Actions, registry push notifications, cron jobs, or custom monitoring systems.

## Prerequisites

- Portainer Business Edition for container or stack webhooks, or Portainer CE/BE for Swarm service webhooks
- A non-Edge environment (Portainer Server or Portainer Agent)
- Running containers, services, or stacks in Portainer
- Network access from trigger sources to Portainer

## Webhook Types

Portainer supports webhooks for:
1. **Containers** (BE): Triggers an image pull and container recreation
2. **Services** (Swarm): Triggers a service update with latest image
3. **Stacks** (BE): Triggers a stack redeployment

## Step 1: Create Webhooks in Portainer

### Via Portainer UI

1. Go to **Containers**.
2. Click the container you want a webhook for.
3. Scroll to the **Container webhook** section.
4. Click **Enable webhook**.
5. Copy the webhook URL.

### Via Portainer API (Swarm services)

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-admin-access-token"
ENDPOINT_ID=1

# Get service ID
SERVICE_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/services" | \
  jq -r '.[] | select(.Spec.Name == "my-app") | .ID')

# Create webhook for the service
WEBHOOK=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/webhooks" \
  -d "{
    \"ResourceID\": \"$SERVICE_ID\",
    \"EndpointID\": $ENDPOINT_ID,
    \"WebhookType\": 1
  }")

WEBHOOK_TOKEN=$(echo "$WEBHOOK" | jq -r '.Token')
echo "Service webhook URL: ${PORTAINER_URL}/api/webhooks/${WEBHOOK_TOKEN}"
```

## Step 2: Trigger a Webhook

```bash
# Container and service webhooks use /api/webhooks/YOUR_TOKEN
WEBHOOK_URL="https://portainer.example.com/api/webhooks/YOUR_TOKEN"
# Stack webhooks use /api/stacks/webhooks/YOUR_TOKEN

# Simple trigger - no authentication headers needed
curl -s -X POST "$WEBHOOK_URL"

# With verbose output to debug
curl -v -X POST "$WEBHOOK_URL"

# Check response code
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL")
echo "Response: $HTTP_STATUS"  # Expect 204
```

## Step 3: Integrate with Docker Hub Auto-Deploy

Configure Docker Hub to trigger redeployment on image push:

1. Log into **Docker Hub** → your repository.
2. Go to **Webhooks** tab.
3. Click **Create webhook**.
4. Enter a webhook name and your Portainer webhook URL.
5. Click **Create**.

Now every `docker push your-username/your-image` triggers Portainer to pull the new image and redeploy the target container or service.

## Step 4: Registry-Agnostic Webhook with Push Events

For registries or delivery workflows where you want to trigger Portainer after a push from CI, set up a job or script:

```bash
#!/bin/bash
# post-push-trigger.sh - Call this after docker push in your scripts

IMAGE="registry.company.com/myapp:latest"

# Build and push the image
docker build -t $IMAGE .
docker push $IMAGE

# Trigger all Portainer webhooks for this image
WEBHOOKS=(
  "https://portainer.example.com/api/webhooks/TOKEN_PROD"
  "https://portainer.example.com/api/webhooks/TOKEN_STAGING"
)

for WEBHOOK in "${WEBHOOKS[@]}"; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK")
  if [ "$HTTP_STATUS" = "204" ]; then
    echo "Triggered: $WEBHOOK"
  else
    echo "FAILED: $WEBHOOK (HTTP $HTTP_STATUS)"
  fi
done
```

## Step 5: Scheduled Redeployment via Cron

Use a cron job to periodically redeploy containers with the latest image:

```bash
# /etc/cron.d/portainer-redeploy
# Redeploy containers with latest image every day at 2 AM
0 2 * * * root curl -s -X POST https://portainer.example.com/api/webhooks/YOUR_TOKEN >> /var/log/portainer-redeploy.log 2>&1
```

Or use a more controlled approach with a script:

```bash
#!/bin/bash
# nightly-redeploy.sh - Trigger redeployment of all critical containers

WEBHOOKS=(
  "TOKEN_NGINX|nginx reverse proxy"
  "TOKEN_APP|application server"
  "TOKEN_WORKER|background worker"
)

for ENTRY in "${WEBHOOKS[@]}"; do
  TOKEN="${ENTRY%%|*}"
  NAME="${ENTRY##*|}"

  echo "[$(date)] Redeploying: $NAME..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "https://portainer.example.com/api/webhooks/$TOKEN")

  if [ "$HTTP_STATUS" = "204" ]; then
    echo "[$(date)] SUCCESS: $NAME"
  else
    echo "[$(date)] FAILED: $NAME (HTTP $HTTP_STATUS)"
  fi

  sleep 5  # Brief pause between redeployments
done
```

## Step 6: Monitoring-Triggered Redeployment

Integrate with monitoring tools to automatically redeploy unhealthy containers:

```bash
#!/bin/bash
# self-heal.sh - Monitor container health and redeploy via Portainer webhook

CONTAINER_NAME="my-app"
HEALTH_URL="https://myapp.example.com/health"
PORTAINER_WEBHOOK="https://portainer.example.com/api/webhooks/YOUR_TOKEN"
ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

check_health() {
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL")
  [ "$HTTP_STATUS" = "200" ]
}

if ! check_health; then
  echo "[$(date)] Container $CONTAINER_NAME is unhealthy! Triggering redeploy..."

  curl -s -X POST "$PORTAINER_WEBHOOK"

  # Wait and re-check
  sleep 30

  if check_health; then
    echo "[$(date)] Recovery successful!"
    # Notify Slack
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d '{"text": "Self-healing triggered and successful for my-app"}'
  else
    echo "[$(date)] Recovery FAILED - manual intervention required!"
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d '{"text": "ALERT: my-app failed to recover after self-healing!"}'
  fi
fi
```

## Security Considerations

Webhook URLs are bearer tokens - treat them as secrets:

```bash
# Store webhook URLs as environment variables or in a secrets file
echo "PORTAINER_WEBHOOK_PROD=https://portainer.example.com/api/webhooks/abc123" >> /etc/portainer-webhooks
chmod 600 /etc/portainer-webhooks

# Source in scripts
source /etc/portainer-webhooks
curl -s -X POST "$PORTAINER_WEBHOOK_PROD"
```

## Conclusion

Portainer webhooks are the simplest possible integration point for automated container management. A single HTTP POST - no authentication headers, no complex payload - triggers a pull-and-redeploy cycle. This simplicity makes webhooks ideal for registry push events, cron-based refreshes, self-healing monitors, and any other system that needs to trigger container updates without deep Portainer API integration.
