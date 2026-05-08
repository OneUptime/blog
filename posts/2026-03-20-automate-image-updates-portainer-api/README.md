# How to Automate Image Updates via Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker, Image Updates, Automation, CI/CD

Description: Use the Portainer REST API to automatically pull updated container images and redeploy services when new versions are pushed to your registry, enabling continuous delivery without manual Portainer...

---

Portainer's REST API provides endpoints to pull images, update stacks, and redeploy services. By integrating these endpoints into your CI/CD pipeline, you automate the deployment step: after a successful build and push, your pipeline calls Portainer to pull the new image and update the affected services.

## CI/CD Integration Pattern

```mermaid
graph LR
    Code[Developer Push] --> CI[CI Pipeline]
    CI -->|Build & Push| Registry[Container Registry]
    CI -->|PUT /stacks/{id}?endpointId={endpointId}| Portainer[Portainer API]
    Portainer --> Container[Updated Service]
```

## Step 1: Get Portainer API Token

Generate an API token in Portainer under **My Account > Access Tokens**.

## Step 2: Find the Stack ID

```bash
# List all stacks to get their IDs

curl -s https://portainer:9443/api/stacks \
  -H "X-API-Key: $TOKEN" | jq '.[] | {id: .Id, name: .Name}'
```

## Step 3: Update a Stack Image via API

```bash
# Pull new image and update the stack
STACK_ID=5
ENDPOINT_ID=1

# Step 1: Pull the new image on the environment
curl -X POST "https://portainer:9443/api/endpoints/${ENDPOINT_ID}/docker/images/create?fromImage=my-registry/api&tag=1.6.0" \
  -H "X-API-Key: $TOKEN"

# Step 2: Update the stack with the new image reference
curl -X PUT "https://portainer:9443/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "StackFileContent": "version: \"3.8\"\nservices:\n  api:\n    image: my-registry/api:1.6.0\n    ports:\n      - \"8080:8080\"\n",
    "Env": [],
    "Prune": false,
    "RepullImageAndRedeploy": true
  }'
```

## Step 4: CI/CD Pipeline Integration

Add the Portainer update step to your GitHub Actions or GitLab CI pipeline. In GitHub Actions, this deploy job fits into a workflow that already defines the `build` job:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Update Portainer Stack
        env:
          PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
          PORTAINER_TOKEN: ${{ secrets.PORTAINER_TOKEN }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Pull the new image via Portainer API
          curl -X POST "${PORTAINER_URL}/api/endpoints/1/docker/images/create?fromImage=my-registry/api&tag=${IMAGE_TAG}" \
            -H "X-API-Key: ${PORTAINER_TOKEN}"

          # Get current stack file content
          STACK=$(curl -s "${PORTAINER_URL}/api/stacks/5/file" \
            -H "X-API-Key: ${PORTAINER_TOKEN}")

          # Update image tag in stack file and redeploy
          UPDATED_CONTENT=$(echo "$STACK" | jq -r '.StackFileContent' | \
            sed "s|my-registry/api:[^ ]*|my-registry/api:${IMAGE_TAG}|g")

          curl -X PUT "${PORTAINER_URL}/api/stacks/5?endpointId=1" \
            -H "X-API-Key: ${PORTAINER_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"StackFileContent\": $(echo "$UPDATED_CONTENT" | jq -Rs .), \"RepullImageAndRedeploy\": true}"
```

## Step 5: Watchtower Alternative

For simpler setups, Watchtower automatically detects registry updates and redeploys containers:

```yaml
# Deploy Watchtower to auto-update containers
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_POLL_INTERVAL=300   # Check every 5 minutes
      - WATCHTOWER_CLEANUP=true
    command: --label-enable
```

Tag containers with `com.centurylinklabs.watchtower.enable=true` to opt in.

## Summary

The Portainer API makes image update automation straightforward: pull the new image, update the stack definition with the new tag, and trigger a redeploy. Integrated into a CI/CD pipeline, this creates a complete continuous delivery workflow from code commit to running container - without manual Portainer interaction.
