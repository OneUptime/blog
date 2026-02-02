# How to Create GitLab CI Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, CI/CD, Pipelines, DevOps, Automation

Description: Learn how to build GitLab CI pipelines from scratch, covering stages, jobs, artifacts, caching, and deployment strategies for automating your software delivery.

---

GitLab CI is one of the most popular CI/CD platforms, and for good reason. It comes built into GitLab, requires minimal setup, and scales from simple test pipelines to complex multi-stage deployments. If you're tired of manually running tests and deploying code, this guide will get you up and running.

---

## How GitLab CI Works

GitLab CI uses a YAML file called `.gitlab-ci.yml` in your repository root to define your pipeline. When you push code, GitLab reads this file and executes jobs on runners (either shared GitLab runners or your own).

```mermaid
flowchart LR
    A[Push Code] --> B[GitLab Detects .gitlab-ci.yml]
    B --> C[Pipeline Created]
    C --> D[Jobs Run on Runners]
    D --> E[Results Reported]
```

---

## Your First Pipeline

Let's start with a minimal working example. This pipeline has a single job that runs tests for a Node.js application.

```yaml
# .gitlab-ci.yml - Minimal pipeline configuration
# This file must be in the root of your repository

# Define the stages in order of execution
stages:
  - test

# A simple job that runs npm test
run-tests:
  stage: test
  image: node:20  # Docker image to use for this job
  script:
    - npm install
    - npm test
```

Push this to your repo and GitLab will automatically pick it up and run the pipeline.

---

## Understanding Stages and Jobs

Stages run sequentially, while jobs within a stage run in parallel. This lets you organize your pipeline logically and speed up execution.

```mermaid
flowchart TB
    subgraph Stage1[Build Stage]
        B1[build-frontend]
        B2[build-backend]
    end
    subgraph Stage2[Test Stage]
        T1[unit-tests]
        T2[integration-tests]
        T3[lint]
    end
    subgraph Stage3[Deploy Stage]
        D1[deploy-staging]
    end
    Stage1 --> Stage2 --> Stage3
```

This configuration shows a multi-stage pipeline with build, test, and deploy stages. Jobs in the same stage run simultaneously.

```yaml
# Multi-stage pipeline with parallel jobs
stages:
  - build
  - test
  - deploy

# Build jobs run in parallel
build-frontend:
  stage: build
  image: node:20
  script:
    - cd frontend
    - npm install
    - npm run build
  artifacts:
    paths:
      - frontend/dist/  # Save build output for later stages

build-backend:
  stage: build
  image: node:20
  script:
    - cd backend
    - npm install
    - npm run build
  artifacts:
    paths:
      - backend/dist/

# Test jobs run in parallel after all build jobs complete
unit-tests:
  stage: test
  image: node:20
  script:
    - npm install
    - npm run test:unit

integration-tests:
  stage: test
  image: node:20
  services:
    - postgres:15  # Spin up PostgreSQL for integration tests
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_pass
    DATABASE_URL: "postgresql://test_user:test_pass@postgres:5432/test_db"
  script:
    - npm install
    - npm run test:integration

lint:
  stage: test
  image: node:20
  script:
    - npm install
    - npm run lint

# Deploy only runs after all tests pass
deploy-staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
  environment:
    name: staging
    url: https://staging.example.com
```

---

## Working with Variables

GitLab CI supports variables at multiple levels. You can define them in the CI file, in the GitLab UI, or pass them at runtime.

```yaml
# Variables can be defined globally or per-job
variables:
  # Global variables available to all jobs
  NODE_ENV: production
  APP_NAME: my-application

build:
  stage: build
  variables:
    # Job-specific variables override global ones
    NODE_ENV: development
    BUILD_FLAGS: "--verbose"
  script:
    - echo "Building $APP_NAME in $NODE_ENV mode"
    - npm run build -- $BUILD_FLAGS
```

### Predefined Variables

GitLab provides many built-in variables. Here are the most useful ones.

| Variable | Description |
|----------|-------------|
| `CI_COMMIT_SHA` | Full commit hash |
| `CI_COMMIT_SHORT_SHA` | Short commit hash (8 chars) |
| `CI_COMMIT_BRANCH` | Branch name |
| `CI_COMMIT_TAG` | Tag name (if tagged) |
| `CI_PIPELINE_ID` | Unique pipeline ID |
| `CI_JOB_ID` | Unique job ID |
| `CI_PROJECT_NAME` | Repository name |
| `CI_REGISTRY_IMAGE` | Container registry path |

This example uses predefined variables to tag Docker images with meaningful identifiers.

```yaml
# Using predefined variables for Docker tagging
build-docker:
  stage: build
  image: docker:24
  services:
    - docker:24-dind  # Docker-in-Docker service
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    # Tag with branch name and commit SHA for traceability
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_BRANCH .
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_BRANCH
```

### Protected and Masked Variables

For sensitive data, configure variables in GitLab UI under Settings > CI/CD > Variables.

- **Protected**: Only available on protected branches
- **Masked**: Hidden in job logs

```yaml
# Using protected variables for deployment credentials
deploy-production:
  stage: deploy
  script:
    # These variables should be set in GitLab UI, not in the file
    - echo "Deploying with API key..."
    - ./deploy.sh --api-key=$DEPLOY_API_KEY --secret=$DEPLOY_SECRET
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

---

## Caching Dependencies

Caching speeds up pipelines by reusing downloaded dependencies between runs. This is especially important for package managers like npm, pip, or Maven.

```yaml
# Global cache configuration for Node.js
cache:
  key: ${CI_COMMIT_REF_SLUG}  # Different cache per branch
  paths:
    - node_modules/
    - .npm/

# All jobs will share this cache
test:
  stage: test
  image: node:20
  script:
    # npm ci uses package-lock.json for reproducible installs
    - npm ci --cache .npm --prefer-offline
    - npm test
```

### Cache Strategies

Different cache strategies for different use cases.

```yaml
# Per-job cache with fallback keys
build:
  stage: build
  cache:
    key:
      files:
        - package-lock.json  # Cache key changes when lock file changes
    paths:
      - node_modules/
    policy: pull-push  # Download cache, then upload updated cache
  script:
    - npm ci
    - npm run build

# Read-only cache for test jobs (faster, no upload)
test:
  stage: test
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
    policy: pull  # Only download, never upload
  script:
    - npm test
```

---

## Artifacts

Artifacts are files created by jobs that you want to pass to later stages or download after the pipeline completes.

```yaml
# Build job creates artifacts for other stages
build:
  stage: build
  script:
    - npm run build
    - npm run test -- --coverage
  artifacts:
    paths:
      - dist/                    # Build output
      - coverage/                # Test coverage reports
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    expire_in: 1 week           # Auto-delete after 1 week

# Deploy job automatically receives artifacts from build stage
deploy:
  stage: deploy
  script:
    - ls dist/  # Build files are available here
    - ./deploy.sh dist/
```

### Artifacts vs Cache

Understanding when to use each.

| Feature | Cache | Artifacts |
|---------|-------|-----------|
| Purpose | Speed up jobs | Pass files between jobs |
| Persistence | Between pipeline runs | Within a single pipeline |
| Scope | Usually dependencies | Build outputs |
| Availability | Same job in future runs | Different jobs in same pipeline |

---

## Rules and Conditions

Control when jobs run using `rules`. This replaced the older `only/except` syntax.

```yaml
# Run tests on all branches
test:
  stage: test
  script:
    - npm test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

# Deploy to staging on main branch pushes
deploy-staging:
  stage: deploy
  script:
    - ./deploy.sh staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Deploy to production only on tags
deploy-production:
  stage: deploy
  script:
    - ./deploy.sh production
  rules:
    - if: $CI_COMMIT_TAG
      when: manual  # Require manual approval

# Run only when specific files change
lint-frontend:
  stage: test
  script:
    - cd frontend && npm run lint
  rules:
    - changes:
        - frontend/**/*
        - package.json
```

### Common Rule Patterns

```yaml
# Skip job for certain conditions
skip-on-draft:
  rules:
    - if: $CI_MERGE_REQUEST_TITLE =~ /^Draft:/
      when: never
    - when: on_success

# Allow failure without blocking the pipeline
optional-security-scan:
  script:
    - npm audit
  rules:
    - when: always
      allow_failure: true

# Scheduled pipelines only
nightly-tests:
  script:
    - npm run test:e2e
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

---

## Job Templates and Extends

Avoid repetition by defining templates that other jobs can extend.

```yaml
# Hidden job (starts with .) used as template
.node-template:
  image: node:20
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - npm ci

# Jobs inherit from template
test:
  extends: .node-template
  stage: test
  script:
    - npm test

lint:
  extends: .node-template
  stage: test
  script:
    - npm run lint

build:
  extends: .node-template
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
```

### Multiple Inheritance

Jobs can extend multiple templates, with later ones taking precedence.

```yaml
.docker-template:
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"

.deploy-template:
  before_script:
    - apk add --no-cache curl
    - echo "Setting up deployment..."

# Combine both templates
deploy-container:
  extends:
    - .docker-template
    - .deploy-template
  stage: deploy
  script:
    - docker build -t myapp .
    - docker push myapp
```

---

## Services

Services are additional Docker containers that run alongside your job. They're perfect for databases, Redis, or other dependencies.

```yaml
# Integration tests with PostgreSQL and Redis
integration-tests:
  stage: test
  image: node:20
  services:
    - name: postgres:15
      alias: db  # Access as 'db' instead of 'postgres'
    - name: redis:7
      alias: cache
  variables:
    # PostgreSQL configuration
    POSTGRES_DB: test
    POSTGRES_USER: runner
    POSTGRES_PASSWORD: password
    # Application configuration pointing to services
    DATABASE_URL: "postgresql://runner:password@db:5432/test"
    REDIS_URL: "redis://cache:6379"
  script:
    - npm ci
    - npm run db:migrate
    - npm run test:integration
```

---

## Docker Builds

Building and pushing Docker images is a common CI task.

```yaml
# Build and push to GitLab Container Registry
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    # Login to GitLab's built-in registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Build with build args and labels for traceability
    - |
      docker build \
        --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
        --build-arg VCS_REF=$CI_COMMIT_SHA \
        --label org.opencontainers.image.created=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
        --label org.opencontainers.image.revision=$CI_COMMIT_SHA \
        -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
        -t $CI_REGISTRY_IMAGE:latest \
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Multi-platform Builds

Building for multiple architectures using buildx.

```yaml
# Build for AMD64 and ARM64
build-multiarch:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    # Set up buildx for multi-platform builds
    - docker buildx create --use
  script:
    - |
      docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --push \
        -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
        .
```

---

## Environment Deployments

GitLab tracks deployments to environments, showing you what's deployed where.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/

# Staging auto-deploys on main branch
deploy-staging:
  stage: deploy
  script:
    - ./deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Production requires manual approval
deploy-production:
  stage: deploy
  script:
    - ./deploy.sh production
  environment:
    name: production
    url: https://example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

### Review Apps

Create temporary environments for merge requests.

```yaml
# Deploy a review app for each merge request
deploy-review:
  stage: deploy
  script:
    - ./deploy.sh review-$CI_MERGE_REQUEST_IID
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://review-$CI_MERGE_REQUEST_IID.example.com
    on_stop: stop-review  # Link to cleanup job
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Cleanup job runs when MR is merged or closed
stop-review:
  stage: deploy
  script:
    - ./destroy.sh review-$CI_MERGE_REQUEST_IID
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  rules:
    - if: $CI_MERGE_REQUEST_IID
      when: manual
```

---

## Complete Pipeline Example

Here's a full pipeline bringing everything together for a typical web application.

```yaml
# Complete GitLab CI pipeline for a Node.js application
# Includes testing, building, security scanning, and deployment

stages:
  - install
  - test
  - build
  - security
  - deploy

variables:
  NODE_ENV: production
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

# Reusable template for Node.js jobs
.node-base:
  image: node:20-alpine
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
      - node_modules/

# Install dependencies once and share via artifacts
install-deps:
  extends: .node-base
  stage: install
  script:
    - npm ci
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

# Parallel test jobs
unit-tests:
  extends: .node-base
  stage: test
  needs: [install-deps]  # Explicit dependency
  script:
    - npm run test:unit -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'  # Extract coverage from output
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

integration-tests:
  extends: .node-base
  stage: test
  needs: [install-deps]
  services:
    - postgres:15
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: "postgresql://test:test@postgres:5432/test"
  script:
    - npm run db:migrate
    - npm run test:integration

lint:
  extends: .node-base
  stage: test
  needs: [install-deps]
  script:
    - npm run lint
    - npm run typecheck

# Build application
build:
  extends: .node-base
  stage: build
  needs: [install-deps]
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

# Build Docker image
build-docker:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  needs: [build]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Security scanning
dependency-scan:
  stage: security
  needs: [install-deps]
  image: node:20-alpine
  script:
    - npm audit --audit-level=high
  allow_failure: true

container-scan:
  stage: security
  needs: [build-docker]
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - apk add --no-cache curl
    - curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: true
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Deploy to staging (automatic)
deploy-staging:
  stage: deploy
  needs: [build-docker, unit-tests, integration-tests]
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - echo "Deploying $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA to staging"
    # Add your deployment commands here
    # kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Deploy to production (manual approval required)
deploy-production:
  stage: deploy
  needs: [deploy-staging]
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - echo "Deploying $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA to production"
    # Add your deployment commands here
  environment:
    name: production
    url: https://example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

---

## Debugging Failed Pipelines

When things go wrong, here's how to investigate.

```yaml
# Add verbose output for debugging
debug-job:
  script:
    - set -x  # Print each command before executing
    - env | sort  # Print all environment variables
    - pwd
    - ls -la
    - npm run build
```

You can also SSH into failed jobs using GitLab's debug mode.

```yaml
# Enable debug mode for interactive troubleshooting
failing-job:
  stage: test
  script:
    - npm test
  after_script:
    # This runs even if the job fails
    - echo "Job finished with exit code $CI_JOB_STATUS"
```

### Common Issues and Fixes

| Problem | Solution |
|---------|----------|
| "Job failed: exit code 1" | Check script output, add `set -e` to fail fast |
| Cache not working | Verify cache key and paths, check runner has cache storage |
| Service unavailable | Use service alias, wait for service startup |
| Artifacts not found | Check job names match, use `needs:` for explicit deps |
| Permission denied | Check file permissions, runner configuration |

---

## Quick Reference

```yaml
# Minimal pipeline structure
stages:
  - test
  - build
  - deploy

job-name:
  stage: test
  image: node:20
  script:
    - npm test
  rules:
    - if: $CI_COMMIT_BRANCH

# Common patterns
# Cache: key + paths + policy (pull-push/pull/push)
# Artifacts: paths + expire_in + reports
# Services: name + alias + variables
# Rules: if + when + changes + allow_failure
# Environment: name + url + on_stop
```

---

## Summary

- Pipeline configuration lives in `.gitlab-ci.yml` at the repo root
- Stages run sequentially, jobs within stages run in parallel
- Use caching for dependencies, artifacts for build outputs
- Control execution with `rules` for flexible pipeline logic
- Templates and `extends` reduce duplication
- Services provide databases and dependencies for testing
- Environments track what's deployed where

Start simple, then add complexity as your needs grow. A basic test pipeline is infinitely better than no pipeline at all.

---

*Need to monitor your GitLab pipelines and deployments in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring, alerting, and incident management to help you track deployment health and respond quickly when issues arise.*
