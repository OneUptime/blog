# How to Trigger Container Redeployment via Webhook in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Webhook, Redeployment, Automation, CI/CD

Description: Use Portainer's container webhook URL to trigger automatic container redeployment from CI/CD pipelines.

---

Portainer webhooks enable CI/CD pipelines to automatically redeploy containers after a new image is built. This creates an automated deployment workflow from code push to container update.

Container webhooks are available in Portainer Business Edition and only on non-Edge environments.

## Enable Container Webhooks in Portainer

1. Navigate to **Containers > [Container Name]**
2. Scroll to the **Container webhooks** section
3. Toggle the webhook switch to **Enabled**
4. Copy the generated webhook URL

The URL format: `https://portainer.example.com/api/webhooks/<uuid>`

## Trigger a Redeployment

```bash
# Simple POST request triggers container recreation with the latest image

curl -X POST https://portainer.example.com/api/webhooks/<webhook-uuid>

# With the tag query parameter to specify a specific image tag
curl -X POST "https://portainer.example.com/api/webhooks/<webhook-uuid>?tag=v1.2.3"
```

## GitHub Actions Integration

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
      - uses: actions/checkout@v6

      - name: Build and push Docker image
        run: |
          docker build -t myregistry/myapp:${{ github.sha }} .
          docker push myregistry/myapp:${{ github.sha }}

      - name: Deploy to Portainer via webhook
        run: |
          curl -s -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}?tag=${{ github.sha }}" \
            --fail
          echo "Deployment triggered successfully"
```

## GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t registry.gitlab.com/org/myapp:$CI_COMMIT_SHA .
    - docker push registry.gitlab.com/org/myapp:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - |
      curl -s -X POST \
        "${PORTAINER_WEBHOOK_URL}?tag=${CI_COMMIT_SHA}" \
        --fail
      echo "Deployment triggered for tag ${CI_COMMIT_SHA}"
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Using the tag Query Parameter

When Portainer receives a webhook with a `tag` query parameter, it updates the container to use that image tag:

```bash
# Deploy specific version via webhook
WEBHOOK_URL="https://portainer.example.com/api/webhooks/abc123"
IMAGE_TAG="v2.1.0"

curl -s -X POST "${WEBHOOK_URL}?tag=${IMAGE_TAG}"
# Portainer will redeploy the container with image:v2.1.0
```

## Secure Webhooks

Webhook URLs contain a UUID that acts as a secret. Protect them:
- Store webhook URLs as CI/CD secrets (never in code)
- Use HTTPS for all webhook calls
- Rotate webhook URLs if compromised (by disabling and re-enabling)

---

*Monitor deployment status and container health post-webhook with [OneUptime](https://oneuptime.com).*
