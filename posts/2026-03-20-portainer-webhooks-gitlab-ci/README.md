# How to Integrate Portainer Webhooks with GitLab CI - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GitLab, CI/CD, Webhook

Description: Learn how to create a GitLab CI/CD pipeline that builds Docker images and deploys them to Portainer using webhooks.

## Introduction

GitLab CI/CD provides a powerful pipeline platform that integrates well with Portainer webhooks. By building your Docker image in GitLab CI and triggering a Portainer webhook at the end of the pipeline, you create a complete automated deployment flow from code commit to running container.

## Prerequisites

- GitLab repository with your application
- GitLab Runner configured to run Docker jobs (`docker:dind` requires runner support and privileged mode)
- GitLab Container Registry or external Docker registry
- Portainer with a service, container, or stack webhook configured on a non-Edge environment (stack webhooks are a Portainer Business Edition feature)
- GitLab CI/CD variables configured

## Step 1: Configure GitLab CI/CD Variables

In your GitLab project:
1. Go to **Settings > CI/CD > Variables**.
2. Add the following variables (mark as **Protected** and **Masked** for secrets):

```text
PORTAINER_WEBHOOK_URL   → Full webhook URL from Portainer (Protected, Masked)
PORTAINER_WEBHOOK_STAGING → Staging webhook URL
PORTAINER_WEBHOOK_PROD    → Production webhook URL
```

For external registry (if not using GitLab Registry):
```text
DOCKER_REGISTRY         → registry.example.com
DOCKER_REGISTRY_USER    → Registry username
DOCKER_REGISTRY_PASS    → Registry password (Masked)
```

## Step 2: Basic GitLab CI Pipeline

```yaml
# .gitlab-ci.yml

# Basic build + deploy pipeline with Portainer

stages:
  - build
  - deploy

variables:
  # Use GitLab Container Registry by default
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE
  DOCKER_TAG: $CI_COMMIT_SHORT_SHA

# Build and push Docker image
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    # Log in to GitLab Container Registry
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
  script:
    # Build image tagged with commit SHA
    - docker build -t $DOCKER_IMAGE:$DOCKER_TAG -t $DOCKER_IMAGE:latest .
    # Push both tags
    - docker push $DOCKER_IMAGE:$DOCKER_TAG
    - docker push $DOCKER_IMAGE:latest
    - |
      if [ -n "$CI_COMMIT_TAG" ]; then
        docker tag $DOCKER_IMAGE:$DOCKER_TAG $DOCKER_IMAGE:$CI_COMMIT_TAG
        docker push $DOCKER_IMAGE:$CI_COMMIT_TAG
      fi
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# Deploy to staging (main branch)
deploy-staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      echo "Deploying to staging (${DOCKER_TAG})..."
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        --max-time 30 \
        "${PORTAINER_WEBHOOK_STAGING}?tag=${DOCKER_TAG}")

      if [ "$HTTP_STATUS" = "204" ]; then
        echo "✓ Staging deployment triggered"
      else
        echo "✗ Staging deployment failed: HTTP ${HTTP_STATUS}"
        exit 1
      fi
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Deploy to production (version tags only)
deploy-production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      echo "Deploying version ${CI_COMMIT_TAG} to production..."
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        --max-time 30 \
        "${PORTAINER_WEBHOOK_PROD}?tag=${CI_COMMIT_TAG}")

      if [ "$HTTP_STATUS" = "204" ]; then
        echo "✓ Production deployment triggered"
      else
        echo "✗ Production deployment failed: HTTP ${HTTP_STATUS}"
        exit 1
      fi
  environment:
    name: production
    url: https://production.example.com
  rules:
    - if: $CI_COMMIT_TAG =~ /^v[0-9]+\.[0-9]+\.[0-9]+$/
      when: manual   # Require manual approval for production
```

## Step 3: Full Pipeline with Testing

```yaml
# .gitlab-ci.yml (complete pipeline)
stages:
  - test
  - build
  - deploy
  - verify

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE
  APP_PORT: "8080"

# Run unit tests
test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci --prefer-offline
    - npm test
    - npm run lint
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# Build Docker image
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
  script:
    - |
      # Build with build args
      docker build \
        --build-arg APP_VERSION=$CI_COMMIT_TAG \
        --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
        --label "org.opencontainers.image.revision=$CI_COMMIT_SHA" \
        -t $DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA \
        -t $DOCKER_IMAGE:latest \
        .

      docker push $DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA
      docker push $DOCKER_IMAGE:latest

      # Also tag with semver if this is a release
      if [ -n "$CI_COMMIT_TAG" ]; then
        docker tag $DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA $DOCKER_IMAGE:$CI_COMMIT_TAG
        docker push $DOCKER_IMAGE:$CI_COMMIT_TAG
      fi
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# Deploy to staging
deploy-staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      echo "=== Deploying to Staging ==="
      echo "Image: $DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA"

      RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${PORTAINER_WEBHOOK_STAGING}?tag=${CI_COMMIT_SHORT_SHA}" \
        --max-time 60)

      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      if [ "$HTTP_CODE" = "204" ]; then
        echo "✓ Staging deployment triggered"
      else
        echo "✗ Deployment failed: HTTP $HTTP_CODE"
        exit 1
      fi
  environment:
    name: staging
    url: https://staging.myapp.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Verify staging deployment
verify-staging:
  stage: verify
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      echo "Waiting for staging deployment to be healthy..."
      MAX_ATTEMPTS=24  # 4 minutes
      SLEEP_SECONDS=10

      for i in $(seq 1 $MAX_ATTEMPTS); do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
          --max-time 10 \
          "https://staging.myapp.com/health")

        if [ "$STATUS" = "200" ]; then
          echo "✓ Staging is healthy (check $i/$MAX_ATTEMPTS)"
          exit 0
        fi

        echo "Attempt $i/$MAX_ATTEMPTS: HTTP $STATUS - waiting ${SLEEP_SECONDS}s..."
        sleep $SLEEP_SECONDS
      done

      echo "✗ Staging health check timed out"
      exit 1
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  needs:
    - deploy-staging

# Deploy to production (manual)
deploy-production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      echo "=== Deploying to Production ==="
      echo "Version: $CI_COMMIT_TAG"

      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${PORTAINER_WEBHOOK_PROD}?tag=${CI_COMMIT_TAG}" \
        --max-time 60)

      if [ "$HTTP_STATUS" = "204" ]; then
        echo "✓ Production deployment triggered for $CI_COMMIT_TAG"
      else
        echo "✗ Production deployment failed: HTTP $HTTP_STATUS"
        exit 1
      fi
  environment:
    name: production
    url: https://myapp.com
  rules:
    - if: $CI_COMMIT_TAG
      when: manual
```

## Step 4: Rollback Pipeline

```yaml
# .gitlab-ci.yml addition: manual rollback to a specific image tag
rollback:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - |
      if [ -z "$ROLLBACK_TAG" ]; then
        echo "Set ROLLBACK_TAG to the image tag you want to redeploy"
        exit 1
      fi

      echo "Rolling back production to ${ROLLBACK_TAG}..."
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${PORTAINER_WEBHOOK_PROD}?tag=${ROLLBACK_TAG}" \
        --max-time 60)

      if [ "$HTTP_STATUS" = "204" ]; then
        echo "✓ Rollback triggered for ${ROLLBACK_TAG}"
      else
        echo "✗ Rollback failed: HTTP $HTTP_STATUS"
        exit 1
      fi
  environment:
    name: production
  allow_failure: true
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
    - if: $CI_COMMIT_TAG
      when: manual
```

## Step 5: Notifications

```yaml
# Add notification steps to your pipeline

.notify-template: &notify
  image: alpine:latest
  before_script:
    - apk add --no-cache curl

notify-success:
  <<: *notify
  stage: .post
  script:
    - |
      curl -X POST "${SLACK_WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d "{
          \"text\": \"✅ Deployed ${CI_PROJECT_NAME} ${CI_COMMIT_TAG:-${CI_COMMIT_SHORT_SHA}} to production\",
          \"username\": \"GitLab CI\"
        }"
  when: on_success
  rules:
    - if: $CI_COMMIT_TAG

notify-failure:
  <<: *notify
  stage: .post
  script:
    - |
      curl -X POST "${SLACK_WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d "{
          \"text\": \"❌ Pipeline FAILED for ${CI_PROJECT_NAME} - check pipeline ${CI_PIPELINE_URL}\",
          \"username\": \"GitLab CI\"
        }"
  when: on_failure
  rules:
    - if: $CI_COMMIT_TAG
```

## Conclusion

GitLab CI + Portainer webhooks form a clean CI/CD pipeline: GitLab handles building, testing, and image pushing, while Portainer handles the deployment. The manual approval for production, health check verification, and rollback capability make this a production-ready deployment workflow. Store your Portainer webhook URLs as GitLab CI masked variables to keep them secure throughout the pipeline.
