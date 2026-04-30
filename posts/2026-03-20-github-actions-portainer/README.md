# How to Set Up GitHub Actions That Deploy to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GitHub Action, CI/CD, DevOps, Automation

Description: Configure GitHub Actions workflows to build Docker images and deploy to Portainer using webhooks and the Portainer REST API.

## Introduction

GitHub Actions is the most widely used CI/CD platform for public and private repositories. This guide covers creating workflows that build Docker images, push to a registry, and deploy to Portainer - supporting both webhook-based and API-based deployment methods. Portainer stack webhooks require Portainer Business Edition and a non-Edge environment; if you're on Portainer CE or using Edge, use the API-based flow instead.

## Step 1: Configure GitHub Secrets and Variables

In your GitHub repository: **Settings** > **Secrets and variables** > **Actions**

Add these repository secrets:
- `PORTAINER_URL`: `https://portainer.yourdomain.com`
- `PORTAINER_API_KEY`: Your Portainer access token
- `PORTAINER_STAGING_WEBHOOK`: Webhook URL from the staging stack
- `PORTAINER_PRODUCTION_WEBHOOK`: Webhook URL from the production stack if you use the advanced webhook example

Add these repository or environment variables:
- `PRODUCTION_STACK_ID`: Numeric Portainer stack ID for the production stack
- `PORTAINER_ENDPOINT_ID`: Numeric Portainer environment/endpoint ID

`GITHUB_TOKEN` is created automatically by GitHub Actions, so you do not need to create a separate registry secret for the GHCR-based examples below.

## Step 2: Basic Deployment Workflow

```yaml
# .github/workflows/deploy.yml - Simple webhook-based deployment

name: Deploy to Portainer

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Run tests
        run: pytest tests/ -v --junitxml=junit/test-results.xml

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-results
          path: junit/test-results.xml

  build-and-push:
    name: Build and Push Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name != 'pull_request'
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.version }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.yourdomain.com

    steps:
      - name: Deploy to Portainer (webhook)
        run: |
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${{ secrets.PORTAINER_STAGING_WEBHOOK }}")

          if [ "$HTTP_STATUS" = "200" ]; then
            echo "Staging deployment triggered successfully"
          else
            echo "Deployment webhook failed with HTTP $HTTP_STATUS"
            exit 1
          fi

      - name: Wait for deployment
        run: sleep 30

      - name: Health check
        run: |
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            https://staging.yourdomain.com/health)

          if [ "$HTTP_STATUS" = "200" ]; then
            echo "Staging is healthy!"
          else
            echo "Health check failed: HTTP $HTTP_STATUS"
            exit 1
          fi

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://yourdomain.com

    steps:
      - name: Deploy via Portainer API (file-based stack)
        run: |
          IMAGE_TAG="${{ needs.build-and-push.outputs.image_tag }}"
          STACK_ID="${{ vars.PRODUCTION_STACK_ID }}"
          ENDPOINT_ID="${{ vars.PORTAINER_ENDPOINT_ID }}"

          # Retrieve the current stack file, then redeploy it with an updated IMAGE_TAG.
          STACK_FILE_CONTENT=$(curl -fsSL \
            -H "X-API-Key: ${{ secrets.PORTAINER_API_KEY }}" \
            "${{ secrets.PORTAINER_URL }}/api/stacks/${STACK_ID}/file" \
            | python3 -c 'import json,sys; print(json.load(sys.stdin)["StackFileContent"])')

          PAYLOAD=$(IMAGE_TAG="$IMAGE_TAG" STACK_FILE_CONTENT="$STACK_FILE_CONTENT" python3 - <<'PY'
          import json
          import os

          print(json.dumps({
              "Env": [{"name": "IMAGE_TAG", "value": os.environ["IMAGE_TAG"]}],
              "Prune": False,
              "RepullImageAndRedeploy": True,
              "StackFileContent": os.environ["STACK_FILE_CONTENT"],
          }))
          PY
          )

          RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
            -H "X-API-Key: ${{ secrets.PORTAINER_API_KEY }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.PORTAINER_URL }}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
            -d "$PAYLOAD")

          HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
          BODY=$(echo "$RESPONSE" | sed '$d')

          echo "Response: $BODY"

          if [ "$HTTP_STATUS" = "200" ]; then
            echo "Production deployment successful!"
          else
            echo "Deployment failed with HTTP $HTTP_STATUS"
            exit 1
          fi
```

## Step 3: Advanced Multi-Environment Workflow

```yaml
# .github/workflows/advanced-deploy.yml
name: Advanced CI/CD Pipeline

on:
  push:
    branches: [main, develop, 'release/**']
  release:
    types: [published]

jobs:
  # Matrix testing across Python versions
  test:
    strategy:
      matrix:
        python-version: ['3.11', '3.12']
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -r requirements.txt
      - run: pytest --cov=src tests/
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      tags: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to environment based on branch/event
  deploy:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - branch: develop
            environment: staging
            webhook_secret: PORTAINER_STAGING_WEBHOOK
          - branch: main
            environment: production
            webhook_secret: PORTAINER_PRODUCTION_WEBHOOK
    if: contains(fromJSON('["develop", "main"]'), github.ref_name)
    environment:
      name: ${{ matrix.environment }}
    steps:
      - name: Deploy to ${{ matrix.environment }}
        if: github.ref_name == matrix.branch
        run: |
          curl -fsS -X POST "${{ secrets[matrix.webhook_secret] }}"
```

## Step 4: Reusable Deployment Action

```yaml
# .github/actions/portainer-deploy/action.yml
name: Deploy to Portainer
description: Deploy a file-based stack to Portainer via API

inputs:
  portainer-url:
    required: true
    description: Portainer URL
  api-key:
    required: true
    description: Portainer API key
  stack-id:
    required: true
    description: File-based stack ID to update
  image-tag:
    required: true
    description: Docker image tag to deploy
  endpoint-id:
    required: true
    description: Portainer endpoint ID

runs:
  using: composite
  steps:
    - shell: bash
      run: |
        STACK_FILE_CONTENT=$(curl -fsSL \
          -H "X-API-Key: ${{ inputs.api-key }}" \
          "${{ inputs.portainer-url }}/api/stacks/${{ inputs.stack-id }}/file" \
          | python3 -c 'import json,sys; print(json.load(sys.stdin)["StackFileContent"])')

        PAYLOAD=$(IMAGE_TAG="${{ inputs.image-tag }}" STACK_FILE_CONTENT="$STACK_FILE_CONTENT" python3 - <<'PY'
        import json
        import os

        print(json.dumps({
            "Env": [{"name": "IMAGE_TAG", "value": os.environ["IMAGE_TAG"]}],
            "Prune": False,
            "RepullImageAndRedeploy": True,
            "StackFileContent": os.environ["STACK_FILE_CONTENT"],
        }))
        PY
        )

        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
          -H "X-API-Key: ${{ inputs.api-key }}" \
          -H "Content-Type: application/json" \
          "${{ inputs.portainer-url }}/api/stacks/${{ inputs.stack-id }}?endpointId=${{ inputs.endpoint-id }}" \
          -d "$PAYLOAD")

        HTTP=$(echo "$RESPONSE" | tail -n 1)
        BODY=$(echo "$RESPONSE" | sed '$d')
        [ "$HTTP" = "200" ] && echo "Deployed!" || (echo "Failed: $HTTP"; echo "$BODY"; exit 1)
```

## Conclusion

GitHub Actions provides excellent CI/CD capabilities for Portainer deployments. If you're using Portainer Business Edition, the webhook approach is the simplest, while the API approach gives you more control over what gets deployed. GitHub's environment protection rules add manual approval gates for production deployments. Combined with Portainer's stack management, you have a clean pipeline: code in GitHub, built images in a container registry, and running workloads managed in Portainer.
