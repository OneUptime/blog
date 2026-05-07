# How to Use Podman in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, GitLab CI, CI/CD, Automation

Description: Learn how to integrate Podman into GitLab CI pipelines for building, testing, and deploying container images without a Docker daemon.

---

> GitLab CI and Podman can eliminate the need for Docker-in-Docker, simplifying your pipeline architecture while improving security.

GitLab CI is a powerful CI/CD platform built into GitLab, and using Podman as your container engine can eliminate the complexities of Docker-in-Docker (DinD). Podman runs without a daemon, so you do not need a Docker daemon sidecar service, but whether you can also avoid privileged containers depends on how your runner is configured. This guide shows you how to set up Podman in GitLab CI for common container workflows.

---

## Configuring the GitLab CI Runner for Podman

First, you need a runner environment where Podman is available. You can use a shell executor on a machine with Podman installed, or configure a container-based runner to support Podman and use a container image that includes it. Using a Podman image alone is not enough; the runner still needs a compatible Podman setup.

```yaml
# .gitlab-ci.yml

# Use a base image that has Podman pre-installed
image: quay.io/podman/stable:latest

# Define the pipeline stages
stages:
  - build
  - test
  - deploy

# Global variables for the pipeline
variables:
  # Use vfs when overlay or fuse-overlayfs is unavailable in the runner environment
  STORAGE_DRIVER: vfs
  # Build Docker-format image manifests instead of the default OCI format
  BUILDAH_FORMAT: docker
```

## Building Container Images in GitLab CI

Here is how to build a container image and store it as an artifact or push it to a registry.

```yaml
# Build stage: create the container image
build-image:
  stage: build
  script:
    # Verify Podman is working
    - podman --version
    - podman info

    # Build the application image
    - podman build
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        --tag $CI_REGISTRY_IMAGE:latest
        .

    # Save the image to a tar file for use in later stages
    - podman save
        -o image.tar
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

  artifacts:
    paths:
      - image.tar
    expire_in: 1 hour
```

## Running Tests with Podman in GitLab CI

Load the built image and run your test suite inside a container.

```yaml
# Test stage: run tests inside the built container
test-app:
  stage: test
  dependencies:
    - build-image
  script:
    # Load the image from the previous stage artifact
    - podman load -i image.tar

    # Run unit tests inside the container
    - podman run --rm
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        npm test

    # Run linting inside the container
    - podman run --rm
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        npm run lint
```

## Pushing Images to GitLab Container Registry

After building and testing, push the image to the GitLab Container Registry.

```yaml
# Deploy stage: push the image to GitLab Container Registry
push-image:
  stage: deploy
  dependencies:
    - build-image
  script:
    # Load the image from artifact
    - podman load -i image.tar

    # Log in to GitLab Container Registry
    - podman login
        -u $CI_REGISTRY_USER
        -p $CI_REGISTRY_PASSWORD
        $CI_REGISTRY

    # Push both the commit SHA tag and the latest tag
    - podman push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - podman push $CI_REGISTRY_IMAGE:latest

  # Only push on the main branch
  only:
    - main
```

## Integration Testing with Podman and Services

Use Podman to spin up dependent services for integration testing.

```yaml
# Integration test job with a database dependency
integration-test:
  stage: test
  dependencies:
    - build-image
  script:
    # Load the application image
    - podman load -i image.tar

    # Create a network for inter-container communication
    - podman network create testnet

    # Start PostgreSQL for integration tests
    - podman run -d
        --name postgres
        --network testnet
        -e POSTGRES_PASSWORD=testpass
        -e POSTGRES_DB=testdb
        postgres:16

    # Wait for the database to accept connections
    - sleep 5
    - podman exec postgres pg_isready -U postgres

    # Run integration tests connected to the database
    - podman run --rm
        --network testnet
        -e DATABASE_URL=postgresql://postgres:testpass@postgres/testdb
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        npm run test:integration

  # Always clean up containers and networks
  after_script:
    - podman rm -f postgres || true
    - podman network rm testnet || true
```

## Using a Shell Executor with Podman

If you prefer a shell executor, configure your GitLab runner to use Podman directly on the host.

```bash
#!/bin/bash
# Create the runner in GitLab first, then copy its runner authentication token.
# Configure the runner's "podman" tag when you create it in GitLab.

# Register the runner with shell executor
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.com/" \
  --token "glrt-YOUR_RUNNER_AUTH_TOKEN" \
  --executor "shell" \
  --description "Podman Shell Runner"
```

```yaml
# .gitlab-ci.yml using the shell executor with tags
build-shell:
  stage: build
  tags:
    - podman
  script:
    # Podman is available directly on the host
    - podman build -t myapp:$CI_COMMIT_SHA .
    - podman run --rm myapp:$CI_COMMIT_SHA npm test
```

## Summary

Podman in GitLab CI can remove the need for Docker-in-Docker, and with the right runner setup it can also avoid privileged containers, making your pipelines simpler and more secure. You can build images, run tests, push to GitLab Container Registry, and manage multi-container integration tests all without a container daemon. Whether you use a shell executor on a Podman-enabled host or a container-based executor that is already configured to support Podman, the workflow remains clean and maintainable.
