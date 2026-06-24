# How to Trigger Webhooks via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Webhook, CI/CD, Automation

Description: Learn how to create and trigger Portainer webhooks to automate container and service redeployments when new container images are pushed to a registry.

## Introduction

Portainer webhooks provide a simple HTTP endpoint that, when called, triggers a redeploy or update for a supported resource. For service and container webhooks, this typically means pulling the latest image and restarting the workload. This is the simplest way to integrate Portainer with CI/CD pipelines, registry push events, and other automation triggers.

## Prerequisites

- Portainer CE or BE managing a non-Edge environment
- A running service, container, or stack deployed in Portainer
- Portainer Business Edition if you want container or stack webhooks
- Network access from your CI/CD system to Portainer

## How Portainer Webhooks Work

1. You create a webhook in Portainer for a supported resource such as a service, container, or stack
2. Portainer generates a unique URL
3. When that URL receives a POST request, Portainer triggers the configured redeploy or update action
4. For service and container webhooks, Portainer redeploys using the latest image for the current tag unless you pass a different `tag` query parameter
5. No authentication is required to trigger the webhook (the URL itself is the secret)

## Step 1: Create a Webhook for a Container (Portainer BE)

### Via Portainer UI

1. Go to **Containers**.
2. Click on the container name.
3. In the container details screen, toggle **Container webhook** on.
4. Click **Copy link** - this is your webhook URL.

The webhook URL format:
```text
https://portainer.example.com/api/webhooks/{token}
```

### Via Portainer API

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-access-token"
ENDPOINT_ID=1
CONTAINER_ID="abc123def456"

# Create a webhook for a container (Portainer BE)

WEBHOOK=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/webhooks" \
  -d "{
    \"ResourceID\": \"$CONTAINER_ID\",
    \"EndpointID\": $ENDPOINT_ID,
    \"WebhookType\": 2
  }")

WEBHOOK_TOKEN=$(echo "$WEBHOOK" | jq -r '.Token')
echo "Webhook created!"
echo "Webhook URL: ${PORTAINER_URL}/api/webhooks/${WEBHOOK_TOKEN}"
```

## Step 2: Create a Webhook for a Service (Swarm)

```bash
SERVICE_ID="your-swarm-service-id"

# Create a webhook for a Docker Swarm service
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

## Step 3: Trigger a Webhook

```bash
WEBHOOK_TOKEN="your-webhook-token"

# Trigger a service/container webhook (POST to the webhook URL)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${PORTAINER_URL}/api/webhooks/${WEBHOOK_TOKEN}")

# Expected response: 202 Accepted on success
echo "Webhook returned HTTP ${HTTP_STATUS}"
```

## Step 4: List Service and Container Webhooks

```bash
# List service/container webhooks
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/webhooks" | jq '.[] | {
    id: .Id,
    token: .Token,
    endpointId: .EndpointId,
    resourceId: .ResourceId,
    type: .Type
  }'
```

## Step 5: Delete a Service or Container Webhook

```bash
WEBHOOK_ID=3

# Delete a service/container webhook
curl -s -X DELETE \
  -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/webhooks/${WEBHOOK_ID}"

echo "Webhook deleted."
```

## Step 6: Integrate Webhook with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Log in to container registry
        uses: docker/login-action@v4
        with:
          registry: myregistry.io
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push Docker image
        run: |
          docker build -t myregistry.io/myapp:latest .
          docker push myregistry.io/myapp:latest

      - name: Trigger Portainer redeployment
        run: |
          # Service/container webhooks return 202; stack webhooks return 200
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}")

          if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "202" ]; then
            echo "Deployment triggered successfully!"
          else
            echo "Webhook trigger failed with status: $HTTP_STATUS"
            exit 1
          fi
```

## Step 7: Integrate with Docker Hub Webhooks

Configure Docker Hub to automatically trigger Portainer redeployment after a push:

1. Log into Docker Hub.
2. Navigate to your repository → **Webhooks**.
3. Click **Create a Webhook**.
4. Enter a name and your Portainer webhook URL:
   ```text
   https://portainer.example.com/api/webhooks/{your-token}
   ```
5. Click **Create**.

If you're using a stack webhook instead, the URL format is:
```text
https://portainer.example.com/api/stacks/webhooks/{your-token}
```

Now every `docker push` to your Docker Hub repository will automatically trigger Portainer to redeploy the target workload.

## Step 8: Trigger a Stack Webhook (Portainer BE)

Stack webhooks use a different endpoint from service/container webhooks. If the stack already has a webhook configured, inspect the stack and trigger it like this:

```bash
STACK_ID=3

# Get the stack webhook token
STACK=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}")

WEBHOOK_TOKEN=$(echo "$STACK" | jq -r '.Webhook // .AutoUpdate.Webhook // empty')

if [ -n "$WEBHOOK_TOKEN" ]; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${PORTAINER_URL}/api/stacks/webhooks/${WEBHOOK_TOKEN}")
  echo "Stack webhook returned HTTP ${HTTP_STATUS}"
else
  echo "This stack doesn't have a webhook configured."
  echo "Enable the stack webhook in Portainer or configure GitOps auto-updates with a webhook."
fi
```

## Security Considerations

Webhook URLs are essentially bearer tokens. Protect them by:

- **Storing in secrets managers** (GitHub Secrets, Vault, etc.)
- **Using HTTPS** for all webhook calls
- **Rotating periodically**: Delete and recreate webhooks when team members leave
- **Limiting exposure**: Don't log webhook URLs or expose them in build artifacts

## Conclusion

Portainer webhooks provide a dead-simple integration point for automated redeployments. Create a webhook for your service, container, or stack, store the URL securely in your CI/CD system, and call it after every successful image push. This pattern enables continuous deployment without complex pipeline integrations - a simple HTTP POST is all it takes to trigger the configured update.
