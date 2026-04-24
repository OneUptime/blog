# How to Use Webhook Environment Variables (SERVICE_TAG) in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Webhook, CI/CD, Automation

Description: Learn how to use the SERVICE_TAG environment variable with Portainer webhooks to deploy specific image versions through the same webhook URL.

## Introduction

Portainer's stack and service webhooks are powerful because you can pass a `SERVICE_TAG` variable on the webhook URL and reference it in your compose file. This means a single webhook URL can deploy any version of your application - just change the tag you pass. This is ideal for CI/CD pipelines where each build produces a new tagged image.

## Prerequisites

- Portainer Business Edition with a stack or service webhook configured
- A non-Edge environment managed by Portainer Server or Portainer Agent
- Understanding of Docker image tagging

## Understanding SERVICE_TAG

When Portainer receives a stack or service webhook trigger, environment variables are passed as query parameters on the webhook URL and referenced within the compose file. If your image uses `${SERVICE_TAG}` in its tag, the webhook value controls which image tag Portainer deploys for that redeploy.

```text
Normal stack webhook (uses the compose file's default tag):
POST /api/stacks/webhooks/YOUR-TOKEN
→ Pulls: myorg/myapp:latest (from `${SERVICE_TAG:-latest}`)

With SERVICE_TAG:
POST /api/stacks/webhooks/YOUR-TOKEN?SERVICE_TAG=v2.1.0
→ Pulls: myorg/myapp:v2.1.0
```

Note: This feature behavior may vary by Portainer version. Check your Portainer docs for the exact implementation.

## Method 1: Stack Webhook with SERVICE_TAG

For Portainer Stacks (more reliable), use the stack webhook with environment variables:

```bash
# Trigger a stack webhook with a specific version:

curl -X POST \
  "https://portainer.example.com/api/stacks/webhooks/STACK-WEBHOOK-TOKEN?SERVICE_TAG=v2.1.0"
```

In the stack's docker-compose.yml, reference the environment variable:

```yaml
# docker-compose.yml for stack with tag support
services:
  app:
    # Reference SERVICE_TAG via env var substitution
    image: myorg/myapp:${SERVICE_TAG:-latest}
    restart: unless-stopped
    environment:
      - APP_VERSION=${SERVICE_TAG:-latest}
```

## Method 2: Using SERVICE_TAG in CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - name: Log in to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ vars.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Get version tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Build and push image
        run: |
          docker build -t myorg/myapp:${{ steps.version.outputs.VERSION }} .
          docker push myorg/myapp:${{ steps.version.outputs.VERSION }}

      - name: Deploy via Portainer webhook
        run: |
          # For stack webhooks, SERVICE_TAG is passed on the query string
          curl -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}?SERVICE_TAG=${{ steps.version.outputs.VERSION }}"
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
  only:
    - tags

deploy:
  stage: deploy
  script:
    - |
      curl -X POST \
        "${PORTAINER_WEBHOOK_URL}?SERVICE_TAG=${CI_COMMIT_TAG}"
  only:
    - tags
  environment:
    name: production
```

## Method 3: Version-Specific Webhooks

An alternative pattern: create a separate container (or stack env variable) per environment and use the webhook to deploy by tag:

```bash
#!/bin/bash
# deploy-version.sh
# Deploys a specific version using Portainer stack webhook

VERSION="${1:?Version required}"
WEBHOOK_URL="${PORTAINER_STACK_WEBHOOK_URL:?Webhook URL required}"

echo "Deploying version: ${VERSION}"

# Trigger the stack webhook with the requested version
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${WEBHOOK_URL}?SERVICE_TAG=${VERSION}")

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [ "${HTTP_CODE}" == "200" ] || [ "${HTTP_CODE}" == "204" ]; then
    echo "✓ Deployment of version ${VERSION} triggered"
else
    echo "✗ Deployment failed: HTTP ${HTTP_CODE}"
    echo "Response: ${BODY}"
    exit 1
fi
```

## Method 4: Multiple Tags from One Pipeline

Deploy to staging with the commit SHA, and to production with the release tag:

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}

    steps:
      - uses: actions/checkout@v6

      - name: Log in to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ vars.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: myorg/myapp
          tags: |
            type=semver,pattern={{version}}
            type=sha,format=long,prefix=sha-

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to staging
        run: |
          # Deploy SHA-tagged image to staging
          curl -X POST \
            "${{ secrets.PORTAINER_STAGING_WEBHOOK }}?SERVICE_TAG=sha-${{ github.sha }}"

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')

    steps:
      - name: Deploy to production
        run: |
          # Deploy version-tagged image to production
          TAG="${{ github.ref_name }}"
          curl -X POST \
            "${{ secrets.PORTAINER_PROD_WEBHOOK }}?SERVICE_TAG=${TAG}"
```

## Portainer Stack Environment Variable Approach

For file-based stacks, the most reliable pattern is to use stack environment variables and update them via the API:

```yaml
# docker-compose.yml
services:
  app:
    image: myorg/myapp:${APP_TAG:-latest}
    restart: unless-stopped
```

Then update the stack environment variable via Portainer API:

```bash
#!/bin/bash
# update-stack-tag.sh
# Requires jq

PORTAINER_URL="${PORTAINER_URL}"
API_KEY="${PORTAINER_API_KEY}"
STACK_ID="${PORTAINER_STACK_ID}"
NEW_TAG="${1:?Tag required}"

# Read the current stack definition and environment so the update preserves them.
STACK_INFO=$(curl -s \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}")

STACK_FILE_CONTENT=$(curl -s \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/file" | jq -r '.StackFileContent')

UPDATED_ENV=$(printf '%s' "${STACK_INFO}" | jq --arg new_tag "${NEW_TAG}" '
  (.Env // []) as $env
  | if any($env[]?; .name == "APP_TAG") then
      $env | map(if .name == "APP_TAG" then .value = $new_tag else . end)
    else
      $env + [{"name":"APP_TAG","value":$new_tag}]
    end
')

ENDPOINT_ID=$(printf '%s' "${STACK_INFO}" | jq -r '.EndpointId')

curl -s -X PUT \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
  -d "$(jq -n \
    --arg stack_file_content "${STACK_FILE_CONTENT}" \
    --argjson env "${UPDATED_ENV}" \
    '{
      StackFileContent: $stack_file_content,
      Env: $env,
      Prune: false,
      RepullImageAndRedeploy: true
    }')"

echo "Stack updated to tag: ${NEW_TAG}"
```

## Conclusion

SERVICE_TAG with Portainer webhooks enables flexible, version-specific deployments through a single webhook URL. The stack-based approach is most powerful: use `${SERVICE_TAG:-latest}` in your compose file, pass the tag as a webhook query parameter or update a stack environment variable via the Portainer API, and achieve fully automated, version-controlled deployments in your CI/CD pipeline.
