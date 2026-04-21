# How to Trigger Webhooks via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Webhook, CI/CD, Automation

Description: Learn how to create, list, and trigger Portainer webhooks programmatically via the REST API for automated deployments.

## What Are Portainer Webhooks?

Portainer webhooks are unique URLs that trigger a redeploy of a stack, service, or container when called via HTTP POST. They allow CI/CD systems to trigger deployments without needing full Portainer API credentials for the trigger itself. Stack and container webhooks are Business Edition features; service webhooks are available for Docker Swarm services.

## Listing Webhooks

```bash
# List service/container webhooks

curl -s "${PORTAINER_URL}/api/webhooks" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | \
  jq '[.[] | {id: .Id, token: .Token, resourceId: .ResourceId, endpointId: .EndpointId, type: .Type}]'
```

## Creating a Webhook via API

```bash
# Create a webhook for a Docker Swarm service (WebhookType 1 = service webhook)
curl -X POST "${PORTAINER_URL}/api/webhooks" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "ResourceID": "abc12345-abcd-2345-ab12-58005b4a0260",
    "EndpointID": 1,
    "WebhookType": 1
  }'

# Response includes the token
# {"Id": 1, "Token": "abc123-token-here", "ResourceId": "...", "EndpointId": 1, "Type": 1}
```

## Triggering a Webhook

```bash
# Trigger a service or container webhook
WEBHOOK_TOKEN="abc123-token-here"

curl -X POST "${PORTAINER_URL}/api/webhooks/${WEBHOOK_TOKEN}"
# Returns 202 Accepted on success

# Trigger a stack webhook (use the token from the stack webhook URL)
curl -X POST "${PORTAINER_URL}/api/stacks/webhooks/${WEBHOOK_TOKEN}"
# Returns 200 OK on success

# Trigger with a specific image tag
curl -X POST "${PORTAINER_URL}/api/stacks/webhooks/${WEBHOOK_TOKEN}?tag=v2.1.0"
```

## Webhook Types

| Type | Value or endpoint | Target |
|------|-------------------|--------|
| Stack | `/api/stacks/webhooks/{token}` | Re-deploys a Git-backed stack with webhook auto-update enabled |
| Service | `WebhookType: 1` | Updates a Swarm service image via `/api/webhooks/{token}` |
| Container | `WebhookType: 2` (Business Edition) | Recreates a container with latest image via `/api/webhooks/{token}` |

## Automating Webhook Triggers in CI/CD

```bash
#!/bin/bash
# Trigger a Portainer redeploy after pushing a new Docker image

IMAGE_TAG="${1:-latest}"
PORTAINER_WEBHOOK_URL="${PORTAINER_WEBHOOK_URL:?Required}"

echo "Triggering deployment of tag: ${IMAGE_TAG}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${PORTAINER_WEBHOOK_URL}?tag=${IMAGE_TAG}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 202 ]; then
  echo "Deployment triggered successfully"
else
  echo "Deployment trigger failed with HTTP ${HTTP_CODE}"
  exit 1
fi
```

## GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
- name: Deploy to production
  env:
    PORTAINER_WEBHOOK_URL: ${{ secrets.PORTAINER_WEBHOOK_URL }}
  run: |
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${PORTAINER_WEBHOOK_URL}?tag=${{ github.sha }}")

    if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "202" ]; then
      echo "Deployment failed: HTTP $HTTP_STATUS"
      exit 1
    fi
    echo "Deployed successfully"
```

## Deleting a Webhook

```bash
# Get service/container webhook ID first
WEBHOOK_ID=$(curl -s "${PORTAINER_URL}/api/webhooks" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | \
  jq -r '.[] | select(.Token == "abc123-token-here") | .Id')

# Delete the webhook
curl -X DELETE "${PORTAINER_URL}/api/webhooks/${WEBHOOK_ID}" \
  -H "X-API-Key: ${PORTAINER_API_KEY}"
```

## Security Best Practices for Webhooks

- Treat webhook URLs like passwords - they provide deployment access.
- Use HTTPS to prevent token interception.
- Rotate webhooks periodically by deleting and recreating them.
- Restrict webhook trigger IPs at the firewall or reverse proxy level.

## Conclusion

Portainer webhooks offer a lightweight, token-based trigger mechanism for automated deployments. They're simpler to use than full API credentials in CI/CD pipelines and can be shared with external systems without granting full Portainer API access.
