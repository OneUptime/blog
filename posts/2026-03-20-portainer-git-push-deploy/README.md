# How to Set Up Automated Stack Deployment on Git Push with Portainer - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Automation, CI/CD, Docker

Description: Configure automatic stack deployment in Portainer triggered by Git push events, enabling GitOps workflows for container deployments.

## Introduction

GitOps makes your Git repository the source of truth for infrastructure state. With Portainer's Git integration and, in Business Edition, webhook support, pushes to specific branches automatically trigger stack deployments-no manual Portainer UI interaction required after the initial setup.

## Method 1: Portainer Git Integration with Polling

Portainer's built-in Git polling checks for changes on a schedule:

```bash
# In Portainer: Stacks > Add Stack > Git Repository

# Configure:
# - Repository URL: https://github.com/yourorg/your-repo
# - Repository reference: refs/heads/main
# - Compose path: docker/docker-compose.yml
# - Enable "GitOps updates"
# - Mechanism: Polling
# - Fetch interval: 5 minutes

# For private repos, add credentials:
# - Authentication: On
# - Authorization type: Basic
# - Username: your-github-username
# - Personal Access Token: your-personal-access-token
```

## Method 2: Portainer Webhooks (Instant Deployment)

Portainer Business Edition provides a stack webhook URL that triggers immediate re-deployment on non-Edge environments:

```bash
# In Portainer: Stacks > Your Stack > Editor > Webhooks > Enable
# Copy the webhook URL:
# https://portainer.example.com/api/stacks/webhooks/WEBHOOK_TOKEN

# Test it manually
curl -X POST "https://portainer.example.com/api/stacks/webhooks/YOUR_WEBHOOK_TOKEN"
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

env:
  DOCKER_IMAGE: ${{ secrets.DOCKER_USERNAME }}/myapp

on:
  push:
    branches: [main]
    paths:
      - 'app/**'
      - 'docker/**'
      - 'docker-compose.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push Docker image
        run: |
          echo "${{ secrets.DOCKER_TOKEN }}" | docker login --username "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker build -t $DOCKER_IMAGE:${{ github.sha }} .
          docker tag $DOCKER_IMAGE:${{ github.sha }} $DOCKER_IMAGE:latest
          docker push $DOCKER_IMAGE:${{ github.sha }}
          docker push $DOCKER_IMAGE:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Portainer deployment
        run: |
          # Redeploy the stack using the image tag for this commit
          curl --fail -X POST \
            "https://portainer.example.com/api/stacks/webhooks/${{ secrets.PORTAINER_WEBHOOK_TOKEN }}?tag=${{ github.sha }}"
          
          echo "Deployment triggered via Portainer webhook"
      
      - name: Wait and verify deployment
        run: |
          sleep 30  # Wait for deployment to complete
          
          # Check if Portainer reports the stack as active
          STATUS=$(curl --fail -s \
            -H "X-API-Key: ${{ secrets.PORTAINER_API_KEY }}" \
            "https://portainer.example.com/api/stacks" \
            | python3 -c "
import sys, json
stacks = json.load(sys.stdin)
for s in stacks:
    if s['Name'] == 'production-app':
        print('running' if s['Status'] == 1 else 'stopped')
        break
")
          
          if [ "$STATUS" != "running" ]; then
            echo "Deployment failed! Stack is not running."
            exit 1
          fi
          echo "Deployment successful!"
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  LATEST_IMAGE: $CI_REGISTRY_IMAGE:latest

build:
  stage: build
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY
    - docker build -t $DOCKER_IMAGE .
    - docker tag $DOCKER_IMAGE $LATEST_IMAGE
    - docker push $DOCKER_IMAGE
    - docker push $LATEST_IMAGE

deploy_production:
  stage: deploy
  environment: production
  only:
    - main
  script:
    - |
      curl --fail -X POST \
        "$PORTAINER_URL/api/stacks/webhooks/$PORTAINER_WEBHOOK_TOKEN?tag=$CI_COMMIT_SHA"
```

## Method 3: Portainer Git Stack with Auto-Update

```bash
# Deploy a stack linked to a Git repository
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "production-app",
    "RepositoryURL": "https://github.com/yourorg/your-app",
    "RepositoryReferenceName": "refs/heads/main",
    "ComposeFile": "docker/docker-compose.yml",
    "RepositoryAuthentication": true,
    "RepositoryUsername": "your-username",
    "RepositoryPassword": "your-token",
    "AutoUpdate": {
      "Interval": "5m",
      "ForcePullImage": true
    }
  }' \
  "https://portainer.example.com/api/stacks/create/standalone/repository?endpointId=1"
```

## Rollback on Failure

```bash
# GitHub Actions with automatic rollback
- name: Verify and rollback if needed
  run: |
    # Wait for health check
    for i in {1..10}; do
      STATUS=$(curl -sf https://myapp.example.com/health | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
      if [ "$STATUS" = "ok" ]; then
        echo "Deployment healthy!"
        exit 0
      fi
      echo "Waiting for health check... attempt $i"
      sleep 10
    done
    
    echo "Health check failed! Rolling back..."
    # Redeploy the image tag from the previous branch tip
    curl --fail -X POST \
      "${{ secrets.PORTAINER_URL }}/api/stacks/webhooks/${{ secrets.PORTAINER_WEBHOOK_TOKEN }}?tag=${{ github.event.before }}"
    exit 1
```

## Conclusion

Automated Git-push deployment with Portainer creates a seamless GitOps workflow where code changes automatically flow to running containers. Portainer's Git polling and, in Business Edition, webhook mechanisms offer flexibility to choose between scheduled or instant deployments. Combined with CI/CD pipelines for testing and image building, this creates a complete automated delivery pipeline.
