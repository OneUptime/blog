# How to Set Up Container Registry in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Container Registry, Docker, CI/CD, DevOps, Containers

Description: Learn how to set up and use GitLab Container Registry in your CI/CD pipelines. This guide covers building images, pushing to registry, image tagging strategies, and cleanup policies.

> GitLab Container Registry provides a secure, integrated place to store your Docker images, with automatic authentication in CI/CD pipelines and fine-grained access control.

GitLab Container Registry is a built-in Docker registry that comes with every GitLab project. It integrates seamlessly with GitLab CI/CD, providing automatic authentication and making it easy to build, push, and deploy container images as part of your pipeline.

## Enabling Container Registry

Container Registry is enabled by default on GitLab.com. For self-managed GitLab instances, an administrator needs to enable it in the GitLab configuration.

To verify Container Registry is enabled for your project, go to Settings > Packages and registries > Container Registry.

## Container Registry URLs

Each project has a unique Container Registry URL based on your GitLab instance and project path.

```
# GitLab.com format
registry.gitlab.com/group/project

# Self-managed format
registry.example.com/group/project
```

You can also use nested paths for different images within a project.

```
registry.gitlab.com/group/project/api
registry.gitlab.com/group/project/frontend
registry.gitlab.com/group/project/worker
```

## Building and Pushing Images in CI

GitLab CI provides predefined variables for Container Registry authentication.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

variables:
  # Use Kaniko for building without Docker daemon
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  before_script:
    # Login to GitLab Container Registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE
  after_script:
    - docker logout $CI_REGISTRY
```

## Image Tagging Strategies

Proper tagging makes it easy to identify and deploy specific versions of your images.

```yaml
# Comprehensive tagging strategy
stages:
  - build

build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Build the image once
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .

    # Tag with commit SHA (immutable reference)
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

    # Tag with branch name (mutable reference)
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG

    # Tag with latest for main branch
    - |
      if [ "$CI_COMMIT_BRANCH" == "main" ]; then
        docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
        docker push $CI_REGISTRY_IMAGE:latest
      fi

    # Tag with semantic version from git tag
    - |
      if [ -n "$CI_COMMIT_TAG" ]; then
        docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
        docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
      fi
```

## Building Multiple Images

For monorepos or multi-service projects, build multiple images in a single pipeline.

```yaml
# Build multiple images from a monorepo
stages:
  - build

.build_template:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

build_api:
  extends: .build_template
  script:
    - docker build -t $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA -f services/api/Dockerfile .
    - docker push $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA
  rules:
    - changes:
        - services/api/**

build_frontend:
  extends: .build_template
  script:
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -f services/frontend/Dockerfile .
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
  rules:
    - changes:
        - services/frontend/**

build_worker:
  extends: .build_template
  script:
    - docker build -t $CI_REGISTRY_IMAGE/worker:$CI_COMMIT_SHA -f services/worker/Dockerfile .
    - docker push $CI_REGISTRY_IMAGE/worker:$CI_COMMIT_SHA
  rules:
    - changes:
        - services/worker/**
```

## Using Kaniko for Rootless Builds

Kaniko builds Docker images without requiring a Docker daemon, making it more secure for shared runners.

```yaml
# Kaniko build without Docker daemon
stages:
  - build

build_with_kaniko:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:v1.9.0-debug
    entrypoint: [""]
  script:
    - |
      /kaniko/executor \
        --context $CI_PROJECT_DIR \
        --dockerfile $CI_PROJECT_DIR/Dockerfile \
        --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
        --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG \
        --cache=true \
        --cache-repo=$CI_REGISTRY_IMAGE/cache
```

Create a Kaniko config file for registry authentication.

```yaml
# Kaniko with explicit config
build_with_kaniko:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:v1.9.0-debug
    entrypoint: [""]
  before_script:
    # Create Docker config for authentication
    - mkdir -p /kaniko/.docker
    - |
      echo "{\"auths\":{\"$CI_REGISTRY\":{\"auth\":\"$(echo -n ${CI_REGISTRY_USER}:${CI_REGISTRY_PASSWORD} | base64)\"}}}" > /kaniko/.docker/config.json
  script:
    - |
      /kaniko/executor \
        --context $CI_PROJECT_DIR \
        --dockerfile $CI_PROJECT_DIR/Dockerfile \
        --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Pulling Images in Deployment Jobs

Use built images in subsequent pipeline stages.

```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  script:
    - npm test

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/myapp app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Multi-Stage Builds with Caching

Use multi-stage builds and registry caching for faster builds.

```dockerfile
# Dockerfile with multi-stage build
# Stage 1: Build dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```yaml
# Use BuildKit cache mounts
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_BUILDKIT: "1"
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - |
      docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --cache-from $CI_REGISTRY_IMAGE:cache \
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
        --tag $CI_REGISTRY_IMAGE:cache \
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:cache
```

## Container Registry Cleanup

Set up cleanup policies to remove old images and save storage space.

### Via GitLab UI

Go to Settings > Packages and registries > Container Registry > Manage cleanup policies.

### Via API

```yaml
# Cleanup job using GitLab API
cleanup_images:
  stage: cleanup
  image: curlimages/curl:latest
  script:
    - |
      curl --request DELETE \
        --header "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/registry/repositories/1/tags/old-tag"
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

### Using reg tool

```yaml
# Cleanup using reg tool
cleanup_images:
  stage: cleanup
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
    - curl -sSL https://github.com/genuinetools/reg/releases/download/v0.16.1/reg-linux-amd64 -o /usr/local/bin/reg
    - chmod +x /usr/local/bin/reg
  script:
    # Delete images older than 30 days
    - reg rm -d -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY_IMAGE:old-tag
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

## Scanning Images for Vulnerabilities

Integrate container scanning into your pipeline.

```yaml
stages:
  - build
  - scan
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

# GitLab container scanning
container_scanning:
  stage: scan
  image: registry.gitlab.com/security-products/container-scanning:latest
  variables:
    CS_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  script:
    - gtcs scan
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json

# Trivy scanning alternative
trivy_scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: true
```

## Complete Container Registry Pipeline

Here is a complete pipeline demonstrating best practices.

```yaml
stages:
  - build
  - scan
  - test
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  DOCKER_BUILDKIT: "1"

.docker_login:
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  extends: .docker_login
  script:
    - |
      docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --cache-from $CI_REGISTRY_IMAGE:cache \
        --tag $DOCKER_IMAGE \
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG \
        --tag $CI_REGISTRY_IMAGE:cache \
        .
    - docker push $DOCKER_IMAGE
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG
    - docker push $CI_REGISTRY_IMAGE:cache

scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --format json --output trivy-report.json $DOCKER_IMAGE
    - trivy image --exit-code 1 --severity CRITICAL $DOCKER_IMAGE
  artifacts:
    paths:
      - trivy-report.json
  allow_failure: true

test:
  stage: test
  image: $DOCKER_IMAGE
  script:
    - npm test

deploy_staging:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT
    - kubectl set image deployment/myapp app=$DOCKER_IMAGE -n staging
  environment:
    name: staging
  rules:
    - if: '$CI_COMMIT_BRANCH == "develop"'

deploy_production:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT
    - kubectl set image deployment/myapp app=$DOCKER_IMAGE -n production
  environment:
    name: production
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  when: manual
```

## Best Practices

Use immutable tags like commit SHA for deployments and mutable tags like latest for convenience. Enable container scanning to catch vulnerabilities before deployment. Use multi-stage builds to keep production images small. Configure cleanup policies to manage storage costs. Use Kaniko for rootless builds on shared runners. Cache base images and build layers to speed up builds.

GitLab Container Registry provides everything you need for container-based deployments without requiring external registry services. Its tight integration with GitLab CI makes it the natural choice for GitLab-hosted projects.
