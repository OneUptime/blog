# How to Integrate Portainer Webhooks with GitHub Actions - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GitHub Action, CI/CD, Webhook

Description: Learn how to create a complete CI/CD pipeline using GitHub Actions that builds Docker images and deploys them via Portainer webhooks.

## Introduction

Combining GitHub Actions with Portainer webhooks creates a powerful, lightweight CI/CD pipeline: GitHub Actions builds and pushes the Docker image, then triggers Portainer to pull the new image and redeploy the stack. No complex Kubernetes or CD tools needed.

## Prerequisites

- GitHub repository with your application
- Docker registry (Docker Hub, GHCR, or private)
- Portainer Business Edition on a non-Edge environment with a stack webhook configured
- GitHub repository secrets configured

## Architecture

```bash
Developer pushes → GitHub Actions runs:
  1. Build Docker image
  2. Push to registry
  3. POST to Portainer webhook
  → Portainer pulls new image → Redeploys stack
```

## Step 1: Configure GitHub Secrets

In your GitHub repository:
1. Go to **Settings > Secrets and variables > Actions**.
2. Add the following secrets:

```bash
DOCKER_USERNAME       → Docker Hub username
DOCKER_PASSWORD       → Docker Hub access token
PORTAINER_WEBHOOK_URL → Full stack webhook URL from Portainer Business Edition
```

For private registries:
```text
REGISTRY_URL          → e.g., registry.example.com
REGISTRY_USERNAME     → Registry username
REGISTRY_PASSWORD     → Registry password
```

If you use GHCR or a private registry, set the `registry:` input in `docker/login-action` and update the image name accordingly.

## Step 2: Basic GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Build and Deploy

on:
  push:
    branches:
      - main   # Deploy on push to main branch
  workflow_dispatch:   # Allow manual triggers

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # Step 1: Check out code
      - name: Checkout repository
        uses: actions/checkout@v6

      # Step 2: Set up Docker Buildx for multi-platform builds
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      # Step 3: Log in to Docker Hub
      - name: Log in to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # Step 4: Extract metadata (tags, labels)
      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ${{ secrets.DOCKER_USERNAME }}/myapp
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}

      # Step 5: Build and push Docker image
      - name: Build and push image
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Step 6: Trigger Portainer redeployment
      - name: Deploy via Portainer webhook
        run: |
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            --max-time 30 \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}")

          if [ "$HTTP_STATUS" == "204" ]; then
            echo "✓ Deployment triggered successfully"
          else
            echo "✗ Deployment trigger failed: HTTP $HTTP_STATUS"
            exit 1
          fi
```

## Step 3: Multi-Environment Deployment

Deploy to staging on every merge to main, and to production on release tags:

```yaml
# .github/workflows/deploy-multi-env.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*']

env:
  IMAGE_NAME: ${{ secrets.DOCKER_USERNAME }}/myapp

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}

    steps:
      - uses: actions/checkout@v6

      - uses: docker/setup-buildx-action@v4

      - uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-,format=short
            type=semver,pattern={{version}}
            type=ref,event=branch

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging

    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging..."
          curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${{ secrets.PORTAINER_STAGING_WEBHOOK }}" | \
            grep -q 204 && echo "✓ Staging deployment triggered"

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://myapp.example.com

    steps:
      - name: Deploy to production
        run: |
          echo "Deploying version ${{ github.ref_name }} to production..."
          curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${{ secrets.PORTAINER_PROD_WEBHOOK }}" | \
            grep -q 204 && echo "✓ Production deployment triggered"

      # Because this job references the production environment,
      # GitHub automatically creates the deployment record and status.
```

## Step 4: Rollback Workflow

Add a manual rollback workflow:

```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Image tag to roll back to (e.g., v2.0.0)'
        required: true
        type: string
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: Rollback to image tag ${{ inputs.version }}
        run: |
          WEBHOOK_URL=""
          if [ "${{ inputs.environment }}" == "staging" ]; then
            WEBHOOK_URL="${{ secrets.PORTAINER_STAGING_WEBHOOK }}"
          else
            WEBHOOK_URL="${{ secrets.PORTAINER_PROD_WEBHOOK }}"
          fi

          echo "Rolling back ${{ inputs.environment }} to ${{ inputs.version }}"
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            --max-time 30 \
            "${WEBHOOK_URL}?tag=${{ inputs.version }}")

          if [ "$HTTP_STATUS" == "204" ]; then
            echo "✓ Rollback triggered"
          else
            echo "✗ Rollback failed: HTTP $HTTP_STATUS"
            exit 1
          fi
```

## Step 5: Health Check After Deployment

Add a health check step after triggering the webhook:

```yaml
      - name: Wait for deployment health
        run: |
          APP_URL="https://myapp.example.com/health"
          MAX_ATTEMPTS=12  # 2 minutes (12 × 10s)

          echo "Waiting for deployment to be healthy..."
          for i in $(seq 1 $MAX_ATTEMPTS); do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              --max-time 10 "${APP_URL}")

            if [ "${HTTP_STATUS}" == "200" ]; then
              echo "✓ Application is healthy (attempt ${i})"
              exit 0
            else
              echo "  Attempt ${i}/${MAX_ATTEMPTS}: HTTP ${HTTP_STATUS}"
              sleep 10
            fi
          done

          echo "✗ Health check failed after ${MAX_ATTEMPTS} attempts"
          exit 1
```

## Step 6: Notification on Deployment

```yaml
      - name: Notify Slack on success
        if: success()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"text\": \"✅ Deployment successful\",
              \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                  {\"title\": \"Repository\", \"value\": \"${{ github.repository }}\", \"short\": true},
                  {\"title\": \"Version\", \"value\": \"${{ github.ref_name }}\", \"short\": true},
                  {\"title\": \"Triggered by\", \"value\": \"${{ github.actor }}\", \"short\": true}
                ]
              }]
            }"

      - name: Notify Slack on failure
        if: failure()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{"text": "❌ Deployment FAILED for ${{ github.repository }}. Check the Actions run."}'
```

## Conclusion

GitHub Actions + Portainer webhooks form a simple but effective CI/CD pipeline for containerized applications. With this setup, every push to main automatically builds a new image, pushes it to a registry, and triggers Portainer to redeploy the stack - all within the GitHub ecosystem and without needing external CD infrastructure. Add health checks, rollback workflows, and Slack notifications to make the pipeline production-ready.
