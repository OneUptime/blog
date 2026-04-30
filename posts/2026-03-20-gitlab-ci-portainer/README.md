# How to Set Up GitLab CI Pipelines That Deploy to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GitLab CI, CI/CD, DevOps, GitOps

Description: Configure GitLab CI/CD pipelines to build Docker images and deploy to Portainer environments using the Portainer API.

## Introduction

GitLab CI/CD provides a powerful pipeline system tightly integrated with your Git repository. This guide covers configuring `.gitlab-ci.yml` to build, test, and deploy Docker-based applications to Portainer, supporting multi-environment deployments with manual approval gates.

## Step 1: Deploy Self-Hosted GitLab (Optional)

If you want to self-host GitLab alongside Portainer:

```yaml
# docker-compose.yml - Self-hosted GitLab

version: "3.8"

networks:
  gitlab_network:
    driver: bridge

volumes:
  gitlab_config:
  gitlab_logs:
  gitlab_data:

services:
  gitlab:
    image: gitlab/gitlab-ce:latest
    container_name: gitlab
    restart: unless-stopped
    hostname: gitlab.yourdomain.com
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'http://gitlab.yourdomain.com:8929'
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
        nginx['listen_https'] = false
    ports:
      - "8929:8929"
      - "2222:22"
    volumes:
      - gitlab_config:/etc/gitlab
      - gitlab_logs:/var/log/gitlab
      - gitlab_data:/var/opt/gitlab
    networks:
      - gitlab_network
    shm_size: 256m
```

## Step 2: Configure GitLab CI Variables

In GitLab: **Settings** > **CI/CD** > **Variables**, add:

| Key | Value | Masked | Protected |
|-----|-------|--------|-----------|
| `PORTAINER_URL` | `https://portainer.yourdomain.com` | No | No |
| `PORTAINER_API_KEY` | Your API token | Yes | Yes |
| `SAFETY_API_KEY` | Your Safety API key | Yes | No |
| `REGISTRY_URL` | `registry.yourdomain.com` | No | No |
| `REGISTRY_USER` | Registry username | No | No |
| `REGISTRY_PASSWORD` | Registry password | Yes | Yes |
| `STAGING_ENDPOINT_ID` | `1` | No | No |
| `STAGING_STACK_ID` | `11` | No | No |
| `PRODUCTION_ENDPOINT_ID` | `2` | No | Yes |
| `PRODUCTION_STACK_ID` | `22` | No | Yes |
| `PORTAINER_STACK_WEBHOOK` | `https://portainer.yourdomain.com/api/stacks/webhooks/<webhook-id>` | Yes | No |

## Step 3: Complete GitLab CI Pipeline

This example assumes your Portainer stack file uses `${IMAGE_TAG}` in the image reference and that the stack was created from the Web editor or an uploaded Compose file.

```yaml
# .gitlab-ci.yml - Complete CI/CD pipeline for file-based Portainer stack deployments

# Global defaults
# Requires a GitLab Runner configured for privileged Docker-in-Docker jobs.
default:
  image: docker:24-alpine
  services:
    - docker:24-dind
  before_script:
    - echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_URL" -u "$REGISTRY_USER" --password-stdin

variables:
  DOCKER_HOST: "tcp://docker:2375"
  DOCKER_TLS_CERTDIR: ""
  DOCKER_BUILDKIT: "1"
  IMAGE_BASE: "${REGISTRY_URL}/myapp/api"
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

# Stage definitions
stages:
  - test
  - build
  - deploy-staging
  - integration-test
  - deploy-production

# Cache configuration
cache:
  key: "$CI_COMMIT_REF_SLUG"
  paths:
    - .cache/pip

# ============================================================
# Test Stage
# ============================================================
unit-tests:
  stage: test
  image: python:3.12-slim
  before_script: []  # Override global before_script
  script:
    - pip install -q -r requirements.txt
    - pip install -q pytest pytest-cov
    - pytest tests/unit/ -v --junitxml=test-results/unit.xml --cov=src --cov-report=term --cov-report=xml
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    reports:
      junit: test-results/unit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    expire_in: 1 week

code-quality:
  stage: test
  image: python:3.12-slim
  before_script: []
  script:
    - pip install -q flake8 black mypy
    - flake8 src/ --max-line-length=100
    - black --check src/
  allow_failure: true

security-scan:
  stage: test
  image: python:3.12-slim
  before_script: []
  script:
    - pip install -q safety bandit
    - safety --key "$SAFETY_API_KEY" --stage cicd scan
    - bandit -r src/ -ll
  allow_failure: true

# ============================================================
# Build Stage
# ============================================================
build-image:
  stage: build
  needs: ["unit-tests"]
  script:
    - |
      # Build with multiple tags
      IMAGE_TAG="${CI_PIPELINE_IID}-${CI_COMMIT_SHORT_SHA}"
      FULL_IMAGE="${IMAGE_BASE}:${IMAGE_TAG}"

      docker pull ${IMAGE_BASE}:latest || true

      docker build \
        --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
        --build-arg VCS_REF=${CI_COMMIT_SHORT_SHA} \
        --cache-from ${IMAGE_BASE}:latest \
        -t ${FULL_IMAGE} \
        -t ${IMAGE_BASE}:latest \
        .

      docker push ${FULL_IMAGE}
      docker push ${IMAGE_BASE}:latest

      # Export tag for downstream jobs
      echo "IMAGE_TAG=${IMAGE_TAG}" >> build.env
  artifacts:
    reports:
      dotenv: build.env
  rules:
    - if: $CI_COMMIT_BRANCH

# ============================================================
# Staging Deployment
# ============================================================
deploy-to-staging:
  stage: deploy-staging
  image: alpine:latest
  needs: ["build-image"]
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      echo "Deploying ${IMAGE_TAG} to staging..."

      # Update a file-based stack via the Portainer API
      STACK_FILE_CONTENT=$(curl -fsS \
        -H "X-API-Key: ${PORTAINER_API_KEY}" \
        "${PORTAINER_URL}/api/stacks/${STAGING_STACK_ID}/file" |
        jq -er '.StackFileContent')

      RESPONSE=$(jq -n \
        --arg stackFileContent "$STACK_FILE_CONTENT" \
        --arg imageTag "$IMAGE_TAG" \
        '{
          StackFileContent: $stackFileContent,
          Env: [
            {"name": "IMAGE_TAG", "value": $imageTag},
            {"name": "ENVIRONMENT", "value": "staging"}
          ],
          Prune: false,
          RepullImageAndRedeploy: true
        }' |
        curl -fsS -X PUT \
          -H "X-API-Key: ${PORTAINER_API_KEY}" \
          -H "Content-Type: application/json" \
          "${PORTAINER_URL}/api/stacks/${STAGING_STACK_ID}?endpointId=${STAGING_ENDPOINT_ID}" \
          --data-binary @-)

      echo "$RESPONSE" | jq '.'

      # Verify deployment succeeded
      if echo "$RESPONSE" | jq -e '.Id' > /dev/null; then
        echo "Staging deployment successful!"
      else
        echo "Deployment failed!"
        exit 1
      fi
  environment:
    name: staging
    url: https://staging.yourdomain.com
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

# ============================================================
# Integration Tests Against Staging
# ============================================================
integration-tests:
  stage: integration-test
  image: python:3.12-slim
  needs: ["deploy-to-staging"]
  before_script:
    - pip install -q requests pytest pytest-base-url
  script:
    - sleep 30  # Wait for deployment to be ready
    - |
      TARGET_URL=${STAGING_URL:-"https://staging.yourdomain.com"}
      pytest tests/integration/ \
        -v \
        --base-url="$TARGET_URL" \
        --junitxml=integration-results.xml
  artifacts:
    reports:
      junit: integration-results.xml
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

# ============================================================
# Production Deployment (Manual Approval)
# ============================================================
deploy-to-production:
  stage: deploy-production
  image: alpine:latest
  needs: ["build-image"]
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      echo "Deploying ${IMAGE_TAG} to PRODUCTION..."

      STACK_FILE_CONTENT=$(curl -fsS \
        -H "X-API-Key: ${PORTAINER_API_KEY}" \
        "${PORTAINER_URL}/api/stacks/${PRODUCTION_STACK_ID}/file" |
        jq -er '.StackFileContent')

      RESPONSE=$(jq -n \
        --arg stackFileContent "$STACK_FILE_CONTENT" \
        --arg imageTag "$IMAGE_TAG" \
        '{
          StackFileContent: $stackFileContent,
          Env: [
            {"name": "IMAGE_TAG", "value": $imageTag},
            {"name": "ENVIRONMENT", "value": "production"}
          ],
          Prune: false,
          RepullImageAndRedeploy: true
        }' |
        curl -fsS -X PUT \
          -H "X-API-Key: ${PORTAINER_API_KEY}" \
          -H "Content-Type: application/json" \
          "${PORTAINER_URL}/api/stacks/${PRODUCTION_STACK_ID}?endpointId=${PRODUCTION_ENDPOINT_ID}" \
          --data-binary @-)

      if echo "$RESPONSE" | jq -e '.Id' > /dev/null; then
        echo "Production deployment successful! Version: ${IMAGE_TAG}"
      else
        echo "Production deployment FAILED!"
        echo "$RESPONSE"
        exit 1
      fi
  environment:
    name: production
    url: https://yourdomain.com
  when: manual  # Requires manual approval in GitLab
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

## Step 4: GitLab CI for Git-Based Portainer Webhook Trigger

If the stack was deployed from a Git repository and GitOps webhook updates are enabled in Portainer:

```yaml
# Simpler approach using a Portainer stack webhook
deploy-webhook:
  stage: deploy-staging
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    # Trigger Portainer stack redeploy via webhook
    - curl -fsS -X POST "$PORTAINER_STACK_WEBHOOK"
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"
```

## Step 5: Verify the Deployment in Portainer

After deployments, check Portainer's:
- **Stacks** view for current configuration
- **Container logs** for deployment errors
- **Service status** to confirm the new image tag is running

## Conclusion

GitLab CI/CD + Portainer creates a clean separation: GitLab handles code testing and building, Portainer handles the deployment and container management. The manual approval gate for production prevents accidental deployments. GitLab's environment tracking shows you the current deployed version, and Portainer's stack management lets you redeploy a previous image tag if you need to roll back.
