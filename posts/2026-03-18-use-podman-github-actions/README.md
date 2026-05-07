# How to Use Podman in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, GitHub Action, CI/CD, Automation

Description: Learn how to configure and use Podman as your container runtime in GitHub Actions workflows for building, testing, and deploying container images.

---

> Podman integrates seamlessly with GitHub Actions, giving you a daemonless, rootless container experience right in your CI pipelines.

GitHub Actions is one of the most popular CI/CD platforms, and Podman is an excellent alternative to Docker for container operations within your workflows. Since GitHub-hosted runners come with Podman pre-installed on Ubuntu images, getting started is straightforward. This guide walks you through practical examples of using Podman in GitHub Actions for real-world CI/CD tasks.

---

## Setting Up a Basic Podman Workflow

Create a workflow file at `.github/workflows/podman-build.yml` to get started with Podman in your GitHub Actions pipeline.

```yaml
# .github/workflows/podman-build.yml

# Basic workflow that builds and tests a container image using Podman
name: Podman Build and Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # Check out the repository code
      - name: Checkout code
        uses: actions/checkout@v4

      # Verify Podman is available on the runner
      - name: Check Podman version
        run: podman --version

      # Build the container image using Podman
      - name: Build image
        run: podman build -t myapp:${{ github.sha }} .

      # Run tests inside the container
      - name: Run tests
        run: |
          podman run --rm myapp:${{ github.sha }} npm test
```

## Building and Pushing Images to a Registry

One of the most common CI tasks is building an image and pushing it to a container registry. Here is how to push to GitHub Container Registry (GHCR) using Podman.

```yaml
# .github/workflows/podman-push.yml
# Workflow that builds and pushes images to GitHub Container Registry
name: Podman Push to GHCR

on:
  push:
    branches: [main]

jobs:
  push:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Log in to GitHub Container Registry using Podman
      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            podman login ghcr.io \
              -u ${{ github.actor }} \
              --password-stdin

      # Build the image with proper tagging and source metadata for GHCR
      - name: Build image
        run: |
          podman build \
            --label org.opencontainers.image.source=https://github.com/${{ github.repository }} \
            -t ghcr.io/${{ github.repository }}:${{ github.sha }} \
            -t ghcr.io/${{ github.repository }}:latest \
            .

      # Push both tags to the registry
      - name: Push image
        run: |
          podman push ghcr.io/${{ github.repository }}:${{ github.sha }}
          podman push ghcr.io/${{ github.repository }}:latest
```

## Running Multi-Container Tests with Podman Pod

Podman pods let you group containers together, which is useful for integration testing in CI.

```yaml
# Job that uses a Podman pod for multi-container integration tests
jobs:
  integration-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Create a pod that groups the app and database containers
      - name: Create pod
        run: |
          podman pod create \
            --name test-pod \
            -p 8080:8080

      # Start a PostgreSQL database inside the pod
      - name: Start database
        run: |
          podman run -d \
            --pod test-pod \
            --name db \
            -e POSTGRES_PASSWORD=testpass \
            -e POSTGRES_DB=testdb \
            postgres:16

      # Wait for the database to be ready
      - name: Wait for database
        run: |
          sleep 5
          podman exec db pg_isready -U postgres

      # Build and run the application inside the pod
      - name: Build and run app
        run: |
          podman build -t myapp:test .
          podman run -d \
            --pod test-pod \
            --name app \
            -e DATABASE_URL=postgresql://postgres:testpass@localhost/testdb \
            myapp:test

      # Execute the integration test suite
      - name: Run integration tests
        run: |
          curl --fail --retry 10 --retry-delay 2 --retry-connrefused \
            http://localhost:8080/health
          podman run --rm --pod test-pod myapp:test npm run test:integration

      # Clean up the pod and all its containers
      - name: Cleanup
        if: always()
        run: podman pod rm -f test-pod
```

## Using Podman with a Matrix Strategy

You can test across multiple base images using GitHub Actions matrix strategy combined with Podman.

```yaml
# Job that tests against multiple base images using a matrix
jobs:
  matrix-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        base-image: ["node:22", "node:24", "node:25"]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Build the image using the matrix base image variable
      - name: Build with ${{ matrix.base-image }}
        run: |
          podman build \
            --build-arg BASE_IMAGE=${{ matrix.base-image }} \
            -t myapp:test .

      # Run the test suite against this specific base image
      - name: Test with ${{ matrix.base-image }}
        run: podman run --rm myapp:test npm test
```

## Summary

Podman works out of the box on GitHub Actions Ubuntu runners, making it a drop-in replacement for Docker in your CI workflows. You can build images, push to registries like GHCR, run multi-container integration tests using pods, and leverage matrix strategies for broad test coverage. The daemonless architecture of Podman is a natural fit for the ephemeral nature of CI runners, and the rootless capabilities add an extra layer of security to your pipelines.
