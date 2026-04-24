# How to Use Portainer Webhooks in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Webhook, CI/CD, Automation, GitOps

Description: Configure and use Portainer webhooks to trigger stack redeployments from CI/CD pipelines, GitHub, GitLab, and custom scripts.

## Introduction

Portainer webhooks provide a simple HTTP endpoint that triggers a stack or service update when called. This is one of the simplest ways to integrate Portainer with CI/CD pipelines - your pipeline pushes a new image and calls the webhook, and Portainer redeploys the stack or service. No Portainer API key required. Stack webhooks require Portainer Business Edition, and Portainer webhooks are only available on non-Edge environments.

## Step 1: Configure Portainer Webhooks

### For Docker Compose Stacks:
1. In Portainer, navigate to **Stacks**
2. Click your stack name
3. Open the **Editor** tab
4. Scroll to **Webhooks**
5. Toggle **Create a stack webhook** to ON
6. Copy the webhook URL

### For Docker Swarm Services:
1. Navigate to **Services**
2. Click your service
3. Find the **Service webhook** section
4. Copy the webhook URL

Stack webhook URL format: `https://portainer.yourdomain.com/api/stacks/webhooks/{uuid}`

Service webhook URL format: `https://portainer.yourdomain.com/api/webhooks/{uuid}`

## Step 2: Test the Webhook

```bash
# Test webhook with curl (no authentication required)

WEBHOOK_URL="https://portainer.yourdomain.com/api/stacks/webhooks/your-stack-webhook-uuid"
# or: https://portainer.yourdomain.com/api/webhooks/your-service-webhook-uuid

curl -s -o /dev/null -w "%{http_code}\n" -X POST "$WEBHOOK_URL"

# Expected response: a 2xx status code
# Portainer will redeploy the stack or service
```

## Step 3: Integrate with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy on Push

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Log in to container registry
        uses: docker/login-action@v4
        with:
          registry: registry.yourdomain.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Build and push Docker image
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: registry.yourdomain.com/myapp:latest

      - name: Trigger Portainer deployment
        run: |
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}")

          case "$HTTP_STATUS" in
            2*)
              echo "Deployment triggered successfully"
              ;;
            *)
              echo "Webhook failed with HTTP $HTTP_STATUS"
              exit 1
              ;;
          esac
```

## Step 4: Integrate with GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  image: docker:24.0.5-cli
  services:
    - docker:24.0.5-dind
  script:
    - echo "$REGISTRY_PASSWORD" | docker login registry.yourdomain.com -u "$REGISTRY_USERNAME" --password-stdin
    - docker build -t registry.yourdomain.com/myapp:latest .
    - docker push registry.yourdomain.com/myapp:latest

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$PORTAINER_WEBHOOK_URL")

      case "$HTTP" in
        2*) echo "Deployed!" ;;
        *) echo "Webhook failed with HTTP $HTTP"; exit 1 ;;
      esac
  environment:
    name: production
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Step 5: Integrate with Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'registry-credentials', passwordVariable: 'REGISTRY_PASSWORD', usernameVariable: 'REGISTRY_USERNAME')]) {
                    sh '''
                        echo "$REGISTRY_PASSWORD" | docker login registry.yourdomain.com -u "$REGISTRY_USERNAME" --password-stdin
                        docker build -t registry.yourdomain.com/myapp:latest .
                        docker push registry.yourdomain.com/myapp:latest
                    '''
                }
            }
        }

        stage('Deploy via Webhook') {
            steps {
                withCredentials([string(credentialsId: 'portainer-webhook-url', variable: 'PORTAINER_WEBHOOK_URL')]) {
                    script {
                        def response = httpRequest(
                            url: env.PORTAINER_WEBHOOK_URL,
                            httpMode: 'POST',
                            validResponseCodes: '200:299'
                        )
                        echo "Deployment triggered: ${response.status}"
                    }
                }
            }
        }
    }
}
```

## Step 6: Webhook with Image Update Verification

```bash
#!/bin/bash
# deploy-and-verify.sh - Deploy via webhook and verify

WEBHOOK_URL="${1:?Provide webhook URL}"
HEALTH_URL="${2:?Provide health check URL}"

echo "Triggering deployment..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL")

case "$HTTP" in
    2*) ;;
    *)
        echo "Webhook failed: HTTP $HTTP"
        exit 1
        ;;
esac

echo "Webhook triggered. Waiting for deployment..."

# Wait for deployment to complete
for i in $(seq 1 30); do
    sleep 5
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
    if [ "$HTTP" = "200" ]; then
        echo "Deployment verified! Service is healthy."
        exit 0
    fi
    echo "Attempt $i/30: HTTP $HTTP"
done

echo "TIMEOUT: Service not healthy after 150 seconds"
exit 1
```

## Step 7: Multiple Webhooks for Multi-Environment Deployment

```bash
#!/bin/bash
# multi-env-deploy.sh - Deploy to multiple environments

STAGING_WEBHOOK="${STAGING_WEBHOOK:?Required}"
PROD_WEBHOOK="${PROD_WEBHOOK:?Required}"

# Always deploy to staging
echo "Deploying to staging..."
STAGING_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$STAGING_WEBHOOK")

case "$STAGING_HTTP" in
    2*) ;;
    *)
        echo "Staging webhook failed: HTTP $STAGING_HTTP"
        exit 1
        ;;
esac

# Verify staging
sleep 30
STAGING_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://staging.yourdomain.com/health")

if [ "$STAGING_HEALTH" != "200" ]; then
    echo "Staging unhealthy. Blocking production deployment."
    exit 1
fi

echo "Staging healthy. Deploying to production..."
PROD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_WEBHOOK")

case "$PROD_HTTP" in
    2*) ;;
    *)
        echo "Production webhook failed: HTTP $PROD_HTTP"
        exit 1
        ;;
esac

echo "Production deployment triggered!"
```

## Step 8: Secure Webhooks with a Proxy

By default, webhooks require no authentication. For additional security, put Portainer behind a proxy that restricts access to static egress IPs that you control, such as self-hosted runners or internal CI servers:

```nginx
# nginx.conf - Restrict webhook access to CI/CD servers with static IPs
location ~* ^/api/(stacks/)?webhooks/ {
    # Only allow self-hosted runners or internal CI servers with fixed egress IPs
    allow 203.0.113.10;
    allow 203.0.113.11;
    allow 10.0.0.100;
    deny all;

    proxy_pass http://portainer:9000;
    proxy_set_header Host $host;
}
```

## Monitoring Webhook Deployments in Portainer

After a webhook triggers:
1. Go to **Stacks** or **Services** to see the update
2. Container list will show containers being restarted
3. Check **Logs** to verify the new version started correctly

```bash
# Verify new image is running after webhook
docker inspect my_container | jq '.[].Config.Image'

# Check when container last restarted
docker inspect my_container | jq '.[].State.StartedAt'
```

## Conclusion

Portainer webhooks provide a simple CI/CD integration - a single HTTP POST can trigger a stack or service redeployment. Treat the webhook URL as a secret, because calling it does not require separate authentication. Combine webhooks with health checks to verify deployments succeeded, and use multi-environment webhooks to promote changes through Dev → Staging → Production in a controlled pipeline.
