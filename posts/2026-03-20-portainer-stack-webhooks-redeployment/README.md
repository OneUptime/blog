# How to Set Up Stack Webhooks for Remote Redeployment in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Webhook, CI/CD, DevOps

Description: Learn how to configure Portainer stack webhooks for triggering remote redeployments from CI/CD pipelines, scripts, or external automation.

## Introduction

Portainer stack webhooks allow external systems to trigger a stack redeployment via a simple HTTP POST request. Unlike the Git polling or Git webhook auto-update methods (which redeploy based on Git changes), a stack redeployment webhook tells Portainer to redeploy the stack using its current stack definition, pulling the latest image for the existing tag by default. This is useful for triggering deployments from CI/CD pipelines after pushing a new image, from monitoring systems, or from any automation that needs to refresh a running stack.

## Prerequisites

- Portainer BE (Business Edition) - stack webhooks are a BE feature
- An existing deployed stack in a non-Edge Portainer environment
- CI/CD pipeline or automation system to call the webhook

## Step 1: Enable Stack Webhook

1. Navigate to **Stacks** → click the stack name.
2. Open the **Editor** tab.
3. Scroll to the **Stack webhook** section.
4. Toggle **Create a stack webhook**.
5. Portainer generates a unique URL:

```text
https://your-portainer.example.com/api/stacks/webhooks/a1b2c3d4e5f6...
```

6. Click the copy icon to copy the URL.
7. Save the settings.

## Step 2: Trigger a Redeployment via curl

Test the webhook manually:

```bash
# Basic POST request to trigger redeployment:

curl -X POST \
  "https://your-portainer.example.com/api/stacks/webhooks/a1b2c3d4e5f6..."

# Expected response: HTTP 204 No Content

# By default, Portainer pulls the latest image for the current tag.
# To redeploy without pulling images first:
curl -X POST \
  "https://your-portainer.example.com/api/stacks/webhooks/a1b2c3d4e5f6...?pullimage=false"
```

## Step 3: Integrate with GitHub Actions

Trigger redeployment after building and pushing a new image:

```yaml
# .github/workflows/build-and-deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            myorg/api:latest
            myorg/api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Portainer redeployment
        run: |
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}")

          if [ "$HTTP_STATUS" -ne 204 ]; then
            echo "Deployment failed with HTTP status: $HTTP_STATUS"
            exit 1
          fi
          echo "Deployment triggered successfully"
```

## Step 4: Integrate with GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin
    - docker build -t "$CI_REGISTRY_IMAGE:latest" -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" .
    - docker push "$CI_REGISTRY_IMAGE:latest"
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"

deploy-production:
  stage: deploy
  image: curlimages/curl:latest
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  script:
    - |
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        "$PORTAINER_WEBHOOK_URL")

      if [ "$HTTP_STATUS" -ne 204 ]; then
        echo "Deployment failed with HTTP status: $HTTP_STATUS"
        exit 1
      fi
  environment:
    name: production
    url: https://app.example.com
```

## Step 5: Deploy Multiple Stacks with One Pipeline

For microservices with separate stacks, trigger multiple webhooks:

```bash
#!/bin/bash
# deploy-all-services.sh
# Trigger redeployment for all service stacks

SERVICES=(
  "api:${PORTAINER_WEBHOOK_API}"
  "worker:${PORTAINER_WEBHOOK_WORKER}"
  "scheduler:${PORTAINER_WEBHOOK_SCHEDULER}"
)

deploy_stack() {
    local name="$1"
    local webhook_url="$2"

    echo "Deploying stack: ${name}"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${webhook_url}")

    if [ "${HTTP_STATUS}" -eq 204 ]; then
        echo "  ✓ ${name} deployed successfully"
    else
        echo "  ✗ ${name} deployment failed (HTTP ${HTTP_STATUS})"
        return 1
    fi
}

for service in "${SERVICES[@]}"; do
    name="${service%%:*}"
    webhook="${service#*:}"
    deploy_stack "${name}" "${webhook}" || exit 1
    sleep 5   # Brief pause between deployments
done

echo "All services deployed."
```

## Step 6: Secure Webhook URLs

Protect webhook URLs from unauthorized access:

```bash
# Store webhook URLs as secrets, never in plain text:
# GitHub Actions: Settings → Secrets → Actions
#   PORTAINER_WEBHOOK_URL = https://...

# Rotate webhooks periodically:
# In Portainer: Stacks → Stack name → Stack webhook → Regenerate

# Restrict network access:
# Allow only CI/CD provider IPs to reach Portainer's HTTPS port
# GitHub IP ranges: curl https://api.github.com/meta | jq '.actions'
```

## Conclusion

Stack redeployment webhooks in Portainer provide a simple, secure HTTP trigger for integrating with any CI/CD system. After building and pushing a new container image, a single `curl -X POST` to the webhook URL is enough to trigger a stack redeployment in Portainer, pulling the latest image for the current tag by default. This is simpler to set up than the Portainer API and more flexible than Git-based auto-updates when you need precise control over when deployments occur - for example, only after tests pass. Store webhook URLs as CI/CD secrets and rotate them periodically for security.
