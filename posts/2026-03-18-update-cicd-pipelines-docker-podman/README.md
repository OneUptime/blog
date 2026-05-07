# How to Update CI/CD Pipelines from Docker to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, CI/CD, GitHub Action, GitLab CI, Jenkins, Migration

Description: Learn how to update your CI/CD pipelines to use Podman instead of Docker for building, testing, and deploying container images.

---

> Updating CI/CD pipelines from Docker to Podman eliminates the need for a container daemon, improves security with rootless builds, and simplifies pipeline runner configuration.

CI/CD pipelines are often the most Docker-dependent part of an organization's infrastructure. They build images, run tests in containers, push to registries, and deploy applications. Migrating these pipelines to Podman requires updating build commands, authentication methods, and runner configurations. This guide provides concrete examples for the most popular CI/CD platforms.

---

## Key Differences in CI/CD Context

Understanding the differences helps you plan the migration.

```bash
# Docker CI/CD requirements:

# - Docker daemon running on the CI runner
# - Docker-in-Docker (DinD) for containerized runners
# - Docker socket mounting for access to host Docker

# Podman CI/CD advantages:
# - No daemon needed (simpler runner setup)
# - Rootless operation (better security)
# - No Docker-in-Docker complexity
# - Skopeo for efficient image copies between registries
```

## GitHub Actions Migration

Update GitHub Actions workflows from Docker to Podman.

```yaml
# BEFORE: Docker-based GitHub Actions workflow
# .github/workflows/build.yml (Docker version)
# name: Build with Docker
# jobs:
#   build:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - run: docker build -t myapp .
#       - run: docker push myapp

# AFTER: Podman-based GitHub Actions workflow
# .github/workflows/build.yml
name: Build with Podman

on:
  push:
    branches: [main]
  pull_request:

env:
  REGISTRY: registry.example.com
  IMAGE_NAME: myapp

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Podman and Skopeo
        run: |
          sudo apt-get update
          sudo apt-get install -y podman skopeo

      - name: Log in to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
            podman login ${{ env.REGISTRY }} \
              --username "${{ secrets.REGISTRY_USERNAME }}" \
              --password-stdin

      - name: Build image
        run: |
          podman build \
            -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
            .

      - name: Run tests
        run: |
          podman run --rm \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            pytest tests/

      - name: Push image
        if: github.ref == 'refs/heads/main'
        run: |
          podman push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          podman push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

## GitLab CI Migration

Update GitLab CI pipelines to use Podman.

```yaml
# .gitlab-ci.yml - Podman-based pipeline
stages:
  - build
  - test
  - deploy

variables:
  IMAGE: ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}

build:
  stage: build
  image: quay.io/podman/stable
  script:
    - podman login -u ${CI_REGISTRY_USER} -p ${CI_REGISTRY_PASSWORD} ${CI_REGISTRY}
    - podman build -t ${IMAGE} .
    - podman push ${IMAGE}

test:
  stage: test
  image: quay.io/podman/stable
  script:
    - podman login -u ${CI_REGISTRY_USER} -p ${CI_REGISTRY_PASSWORD} ${CI_REGISTRY}
    - podman run --rm ${IMAGE} npm test

deploy:
  stage: deploy
  image: quay.io/skopeo/stable
  only:
    - tags
  script:
    - skopeo copy
        --src-creds "${CI_REGISTRY_USER}:${CI_REGISTRY_PASSWORD}"
        --dest-creds "${PROD_USER}:${PROD_PASS}"
        docker://${IMAGE}
        docker://${PROD_REGISTRY}/myapp:${CI_COMMIT_TAG}
```

## Jenkins Migration

Update Jenkins pipelines to use Podman.

```groovy
// Jenkinsfile - Podman-based pipeline
pipeline {
    agent any

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'myapp'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Build') {
            steps {
                sh '''
                    podman build \
                        -t ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                        -t ${REGISTRY}/${IMAGE_NAME}:latest \
                        .
                '''
            }
        }

        stage('Test') {
            steps {
                sh '''
                    podman run --rm \
                        ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                        npm test
                '''
            }
        }

        stage('Push') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'registry-creds',
                        usernameVariable: 'REG_USER',
                        passwordVariable: 'REG_PASS'
                    )
                ]) {
                    sh '''
                        echo "${REG_PASS}" | podman login ${REGISTRY} \
                            --username "${REG_USER}" --password-stdin
                        podman push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        podman push ${REGISTRY}/${IMAGE_NAME}:latest
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'podman system prune -f'
        }
    }
}
```

## Writing Runtime-Agnostic Pipelines

Create pipelines that work with both Docker and Podman.

```bash
#!/bin/bash
# ci-build.sh - Runtime-agnostic build script

# Auto-detect the container runtime
if command -v podman &>/dev/null; then
    RUNTIME="podman"
elif command -v docker &>/dev/null; then
    RUNTIME="docker"
else
    echo "Error: No container runtime found" >&2
    exit 1
fi

echo "Using container runtime: ${RUNTIME}"

# Common variables
REGISTRY="${REGISTRY:-registry.example.com}"
IMAGE_NAME="${IMAGE_NAME:-myapp}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# Build
echo "Building ${FULL_IMAGE}..."
$RUNTIME build -t "$FULL_IMAGE" .

# Test
echo "Running tests..."
$RUNTIME run --rm "$FULL_IMAGE" npm test

# Push
echo "Pushing ${FULL_IMAGE}..."
$RUNTIME push "$FULL_IMAGE"

echo "CI build complete."
```

## Handling Docker-in-Docker Replacement

Many CI systems use Docker-in-Docker (DinD). Podman eliminates this need.

```yaml
# BEFORE: GitLab CI with Docker-in-Docker
# build:
#   image: docker:latest
#   services:
#     - docker:dind
#   variables:
#     DOCKER_TLS_CERTDIR: "/certs"
#   script:
#     - docker build -t myapp .

# AFTER: GitLab CI with Podman (no DinD needed)
build:
  image: quay.io/podman/stable
  variables:
    STORAGE_DRIVER: vfs
    IMAGE: ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
  script:
    - podman login -u ${CI_REGISTRY_USER} -p ${CI_REGISTRY_PASSWORD} ${CI_REGISTRY}
    - podman build -t ${IMAGE} .
    - podman push ${IMAGE}
```

## Setting Up CI Runners for Podman

Configure your CI runners to support Podman builds.

```bash
# Install Podman on a CI runner (Ubuntu)
sudo apt-get update
sudo apt-get install -y podman skopeo buildah fuse-overlayfs

# Configure storage for CI (use vfs for containerized runners)
mkdir -p ~/.config/containers/
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# For containerized CI runners where overlay is not available
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "vfs"
EOF

# Verify the setup
podman info | grep -A 5 store
podman run --rm alpine echo "Podman CI runner is working"
```

## Cleaning Up in CI Pipelines

Keep CI runners clean to avoid disk space issues.

```bash
# Clean up after each pipeline run
podman system prune -f --volumes

# Remove all containers and images (aggressive cleanup)
podman rm -a -f
podman rmi -a -f

# Check disk usage
podman system df

# Add cleanup as a post-build step in your pipeline
# This prevents disk space exhaustion on shared runners
```

## Summary

Updating CI/CD pipelines from Docker to Podman simplifies runner configuration by eliminating the Docker daemon and Docker-in-Docker requirements. Replace `docker` commands with `podman` commands, use `podman login` for registry authentication, and leverage Skopeo for efficient image promotion between environments. For maximum flexibility, write runtime-agnostic scripts that detect the available container tool. Configure CI runners with appropriate storage drivers and add cleanup steps to maintain disk health. The migration is largely a matter of command substitution, with the significant benefit of improved security through rootless, daemonless operation.
