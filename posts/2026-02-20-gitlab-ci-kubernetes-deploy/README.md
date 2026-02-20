# How to Set Up GitLab CI/CD for Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Kubernetes, CI/CD, Pipeline, Deployment

Description: Learn how to configure GitLab CI/CD pipelines for automated building, testing, and deploying to Kubernetes clusters.

---

## Introduction

GitLab CI/CD provides a built-in pipeline system that integrates tightly with Kubernetes. From building Docker images using GitLab's container registry to deploying with review environments, GitLab offers a complete deployment workflow for Kubernetes workloads.

This guide walks through setting up a full GitLab CI/CD pipeline that builds, tests, scans, and deploys your application to Kubernetes across multiple environments.

## Pipeline Architecture

```mermaid
graph LR
    A[Commit] --> B[Build Stage]
    B --> C[Test Stage]
    C --> D[Scan Stage]
    D --> E[Deploy Staging]
    E --> F[Deploy Production]
    F --> G[Verify]
```

## Prerequisites

Before you begin:

- GitLab repository with your application code
- Access to a Kubernetes cluster
- Kubernetes manifests in the repository
- GitLab Runner configured (shared or project-specific)

## Setting Up CI/CD Variables

Configure these variables in GitLab under Settings > CI/CD > Variables.

| Variable | Description | Masked | Protected |
|----------|-------------|--------|-----------|
| KUBE_CONFIG | Base64-encoded kubeconfig | Yes | Yes |
| KUBE_NAMESPACE | Target namespace | No | No |
| REGISTRY_USER | Container registry username | No | No |
| REGISTRY_PASSWORD | Container registry password | Yes | Yes |

## Basic Pipeline Configuration

```yaml
# .gitlab-ci.yml
# Define the stages of the pipeline
stages:
  - build
  - test
  - scan
  - deploy-staging
  - deploy-production

# Default settings applied to all jobs
default:
  # Use Docker-in-Docker for building images
  image: docker:24
  services:
    - docker:24-dind

# Variables available to all jobs
variables:
  # Docker-in-Docker settings
  DOCKER_TLS_CERTDIR: "/certs"
  # Image name using GitLab's built-in registry
  IMAGE_NAME: $CI_REGISTRY_IMAGE
  # Tag with the commit SHA for traceability
  IMAGE_TAG: $CI_COMMIT_SHORT_SHA
```

## Build Stage

```yaml
# Build and push the Docker image
build:
  stage: build
  before_script:
    # Log in to GitLab's container registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Build the Docker image with commit info labels
    - |
      docker build \
        --label "org.opencontainers.image.revision=$CI_COMMIT_SHA" \
        --label "org.opencontainers.image.source=$CI_PROJECT_URL" \
        -t $IMAGE_NAME:$IMAGE_TAG \
        -t $IMAGE_NAME:latest \
        .
    # Push both tags to the registry
    - docker push $IMAGE_NAME:$IMAGE_TAG
    - docker push $IMAGE_NAME:latest
  rules:
    # Only build on pushes, not on merge requests (to avoid duplicate builds)
    - if: $CI_COMMIT_BRANCH
```

## Test Stage

```yaml
# Run unit tests
unit-tests:
  stage: test
  image: node:20-alpine
  before_script:
    - npm ci
  script:
    - npm test
  # Cache node_modules across pipeline runs
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  # Store test results as artifacts
  artifacts:
    reports:
      junit: test-results.xml
    when: always

# Run integration tests
integration-tests:
  stage: test
  image: node:20-alpine
  services:
    # Spin up a PostgreSQL instance for integration tests
    - name: postgres:15
      alias: test-db
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
    DATABASE_URL: "postgresql://test_user:test_password@test-db:5432/test_db"
  before_script:
    - npm ci
  script:
    - npm run test:integration
```

## Security Scanning

```yaml
# Scan the Docker image for vulnerabilities
container-scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  before_script:
    # Log in to pull the image we built
    - export TRIVY_USERNAME=$CI_REGISTRY_USER
    - export TRIVY_PASSWORD=$CI_REGISTRY_PASSWORD
  script:
    # Scan for critical and high severity vulnerabilities
    - trivy image --severity CRITICAL,HIGH --exit-code 1 $IMAGE_NAME:$IMAGE_TAG
  allow_failure: false
```

## Kubernetes Deployment Template

Use YAML anchors to avoid repeating deployment steps.

```yaml
# Template for Kubernetes deployments
.deploy-template: &deploy-template
  image:
    name: bitnami/kubectl:latest
    entrypoint: [""]
  before_script:
    # Set up kubeconfig from the CI variable
    - mkdir -p $HOME/.kube
    - echo "$KUBE_CONFIG" | base64 -d > $HOME/.kube/config
    - kubectl version --client
  script:
    # Replace placeholders in Kubernetes manifests
    - sed -i "s|__IMAGE__|$IMAGE_NAME:$IMAGE_TAG|g" k8s/deployment.yaml
    - sed -i "s|__NAMESPACE__|$KUBE_NAMESPACE|g" k8s/*.yaml

    # Apply the manifests
    - kubectl apply -f k8s/namespace.yaml
    - kubectl apply -f k8s/configmap.yaml
    - kubectl apply -f k8s/deployment.yaml
    - kubectl apply -f k8s/service.yaml

    # Wait for the rollout to complete
    - kubectl rollout status deployment/my-app -n $KUBE_NAMESPACE --timeout=300s
```

## Deploy to Staging

```yaml
# Deploy to the staging environment
deploy-staging:
  stage: deploy-staging
  <<: *deploy-template
  variables:
    KUBE_NAMESPACE: staging
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    # Auto-deploy to staging on main branch pushes
    - if: $CI_COMMIT_BRANCH == "main"
```

## Deploy to Production

```yaml
# Deploy to the production environment with manual approval
deploy-production:
  stage: deploy-production
  <<: *deploy-template
  variables:
    KUBE_NAMESPACE: production
  environment:
    name: production
    url: https://app.example.com
  rules:
    # Require manual trigger for production deployments
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

## Review Environments

GitLab supports dynamic review environments for merge requests.

```yaml
# Create a temporary environment for each merge request
deploy-review:
  stage: deploy-staging
  <<: *deploy-template
  variables:
    KUBE_NAMESPACE: review-$CI_MERGE_REQUEST_IID
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://review-$CI_MERGE_REQUEST_IID.example.com
    on_stop: stop-review
    auto_stop_in: 1 week
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Clean up the review environment
stop-review:
  stage: deploy-staging
  image:
    name: bitnami/kubectl:latest
    entrypoint: [""]
  before_script:
    - mkdir -p $HOME/.kube
    - echo "$KUBE_CONFIG" | base64 -d > $HOME/.kube/config
  script:
    # Delete the entire review namespace
    - kubectl delete namespace review-$CI_MERGE_REQUEST_IID --ignore-not-found
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  rules:
    - if: $CI_MERGE_REQUEST_IID
      when: manual
```

## Pipeline Visualization

The complete pipeline looks like this.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GL as GitLab
    participant Reg as Container Registry
    participant Scan as Trivy Scanner
    participant K8s as Kubernetes

    Dev->>GL: Push to main
    GL->>GL: Build Docker image
    GL->>Reg: Push image
    GL->>GL: Run unit tests
    GL->>GL: Run integration tests
    GL->>Scan: Scan image
    Scan-->>GL: No vulnerabilities
    GL->>K8s: Deploy to staging
    K8s-->>GL: Staging healthy
    Dev->>GL: Manual approval
    GL->>K8s: Deploy to production
    K8s-->>GL: Production healthy
```

## Rollback with GitLab

```yaml
# Manual rollback job
rollback-production:
  stage: deploy-production
  image:
    name: bitnami/kubectl:latest
    entrypoint: [""]
  before_script:
    - mkdir -p $HOME/.kube
    - echo "$KUBE_CONFIG" | base64 -d > $HOME/.kube/config
  script:
    # Undo the last deployment
    - kubectl rollout undo deployment/my-app -n production
    - kubectl rollout status deployment/my-app -n production --timeout=300s
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

## Monitoring Your GitLab Deployments

A CI/CD pipeline is only as good as the monitoring behind it. OneUptime (https://oneuptime.com) provides deployment monitoring that tracks the health of your Kubernetes applications after every GitLab CI/CD deployment. With automated health checks, incident management, and status pages, OneUptime ensures your team knows instantly when a deployment causes issues in staging or production.
