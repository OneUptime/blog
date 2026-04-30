# How to Use GitHub Actions to Deploy to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitHub Action, CI/CD, Docker, Deployment, Automation

Description: Learn how to create GitHub Actions workflows that build Docker images and deploy them to Portainer stacks automatically on push.

---

GitHub Actions can trigger Portainer deployments via the Portainer API or, on Portainer Business Edition, stack webhooks. This guide covers a complete workflow that builds, tests, and deploys to Portainer.

## Basic Webhook Deployment Workflow

If you're using a webhook-enabled Portainer Business Edition stack, the simplest approach is to trigger the stack webhook after pushing a new image.

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Portainer
        run: |
          curl -fsS -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

## Full Pipeline with Staging and Production

A more complete workflow with environment promotion:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=ref,event=branch
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
    steps:
      - name: Redeploy Git-based staging stack via Portainer API
        run: |
          TOKEN=$(curl -fsS -X POST "${{ secrets.PORTAINER_URL }}/api/auth" \
            -H "Content-Type: application/json" \
            -d '{"Username":"${{ secrets.PORTAINER_USER }}","Password":"${{ secrets.PORTAINER_PASSWORD }}"}' \
            | jq -r .jwt)

          STACK=$(curl -fsS -H "Authorization: Bearer $TOKEN" \
            "${{ secrets.PORTAINER_URL }}/api/stacks" | \
            jq -c '.[] | select(.Name=="my-app-staging")')

          STACK_ID=$(echo "$STACK" | jq -r .Id)
          ENDPOINT_ID=$(echo "$STACK" | jq -r .EndpointId)

          curl -fsS -X PUT \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"RepullImageAndRedeploy":true}' \
            "${{ secrets.PORTAINER_URL }}/api/stacks/${STACK_ID}/git/redeploy?endpointId=${ENDPOINT_ID}"

  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: |
          sleep 30  # Wait for containers to start
          curl -fsS https://staging.example.com/health

  deploy-production:
    needs: smoke-test
    runs-on: ubuntu-latest
    environment: production   # Requires approval in GitHub environment settings
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          curl -fsS -X POST "${{ secrets.PORTAINER_PROD_WEBHOOK_URL }}"
```

## Storing Secrets in GitHub

Add secrets to your repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Description |
|-------------|-------------|
| `PORTAINER_URL` | Portainer instance URL |
| `PORTAINER_USER` | Portainer admin username |
| `PORTAINER_PASSWORD` | Portainer admin password |
| `PORTAINER_WEBHOOK_URL` | Stack webhook for the basic webhook deployment |
| `PORTAINER_PROD_WEBHOOK_URL` | Stack webhook for production |

## Using GitHub Environments for Approvals

Configure required reviewers for the `production` environment:

1. Go to **Settings > Environments > production**.
2. Enable **Required reviewers** and add team members.
3. The `deploy-production` job will pause and request approval before running.

## Rollback Workflow

If you're using a webhook-enabled production stack, add a manual rollback workflow triggered from the GitHub Actions UI:

```yaml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Image tag to roll back to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Roll back production stack
        run: |
          curl -fsS -X POST \
            "${{ secrets.PORTAINER_PROD_WEBHOOK_URL }}?tag=${{ github.event.inputs.image_tag }}"
```
