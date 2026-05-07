# How to Use Podman in Buildkite Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildkite, CI/CD, Pipeline

Description: Learn how to configure and use Podman in Buildkite pipelines for building, testing, and deploying container images with self-hosted agents.

---

> Buildkite's agent-based architecture makes it straightforward to use Podman since you control the agent environment and can install Podman directly.

Buildkite uses self-hosted agents, which means you have full control over the build environment. This makes Podman integration simple -- install Podman on your agents and use it directly in your pipeline steps. This guide covers practical patterns for using Podman in Buildkite pipelines for container workflows.

---

## Setting Up Buildkite Agents with Podman

Install Podman on your Buildkite agent machines.

```bash
#!/bin/bash
# Install Podman on a Buildkite agent running Ubuntu

# Run this as part of your agent provisioning

# Install Podman
sudo apt-get update
sudo apt-get install -y podman fuse-overlayfs uidmap slirp4netns

# Rootless Podman requires subordinate UID/GID ranges
sudo grep -q '^buildkite-agent:' /etc/subuid || echo 'buildkite-agent:100000:65536' | sudo tee -a /etc/subuid
sudo grep -q '^buildkite-agent:' /etc/subgid || echo 'buildkite-agent:100000:65536' | sudo tee -a /etc/subgid

# Configure storage for the buildkite-agent user
sudo -u buildkite-agent mkdir -p /home/buildkite-agent/.config/containers
sudo -u buildkite-agent tee /home/buildkite-agent/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Verify Podman works for the buildkite-agent user
sudo -u buildkite-agent podman info
sudo -u buildkite-agent podman --version

# Add a tag to the agent so pipelines can target Podman-enabled agents
# In /etc/buildkite-agent/buildkite-agent.cfg:
# tags="podman=true"
```

## Basic Buildkite Pipeline with Podman

Create a pipeline that builds and tests a container image.

```yaml
# .buildkite/pipeline.yml
# Basic Podman build and test pipeline
steps:
  # Verify Podman is available on the agent
  - label: ":podman: Check Podman"
    command: podman --version
    agents:
      podman: "true"

  # Build the image and run tests in the same step
  - label: ":building_construction: Build and Test"
    command: |
      podman build \
        --tag myapp:${BUILDKITE_BUILD_NUMBER} \
        --tag myapp:${BUILDKITE_COMMIT} \
        .
      podman run --rm myapp:${BUILDKITE_COMMIT} npm test
    agents:
      podman: "true"
```

## Building and Pushing Images to a Registry

Push images to a container registry after successful builds.

```yaml
# .buildkite/pipeline.yml
# Build and push pipeline with registry authentication
steps:
  - label: ":rocket: Build and Push"
    command: |
      podman build \
        -t ${REGISTRY}/${IMAGE_NAME}:${BUILDKITE_COMMIT} \
        -t ${REGISTRY}/${IMAGE_NAME}:latest \
        .

      echo "$REGISTRY_PASSWORD" | podman login "$REGISTRY" \
        -u "$REGISTRY_USERNAME" \
        --password-stdin

      podman push ${REGISTRY}/${IMAGE_NAME}:${BUILDKITE_COMMIT}
      podman push ${REGISTRY}/${IMAGE_NAME}:latest
    agents:
      podman: "true"
    # Only push on the main branch
    branches: "main"
```

## Integration Testing with Podman

Run multi-container integration tests in Buildkite.

```yaml
# .buildkite/pipeline.yml
# Integration testing with Podman
steps:
  - label: ":database: Build and Integration Tests"
    command: |
      set -euo pipefail

      podman build -t myapp:test .
      podman network create bk-test-net

      cleanup() {
        podman rm -f bk-postgres 2>/dev/null || true
        podman network rm bk-test-net 2>/dev/null || true
      }
      trap cleanup EXIT

      podman run -d \
        --name bk-postgres \
        --network bk-test-net \
        -e POSTGRES_PASSWORD=testpass \
        -e POSTGRES_DB=testdb \
        postgres:16-alpine

      until podman exec bk-postgres pg_isready -U postgres -d testdb; do
        sleep 1
      done

      podman run --rm \
        --network bk-test-net \
        -e DATABASE_URL=postgresql://postgres:testpass@bk-postgres/testdb \
        myapp:test npm run test:integration
    agents:
      podman: "true"
```

## Using Buildkite Hooks with Podman

Use a repository hook for common Podman operations.

```yaml
# .buildkite/pipeline.yml
# Using environment hooks for Podman setup
steps:
  - label: ":building_construction: Build and Test"
    commands:
      - podman build -t myapp:${BUILDKITE_COMMIT} .
      - podman run --rm myapp:${BUILDKITE_COMMIT} npm test
    env:
      STORAGE_DRIVER: overlay
    agents:
      podman: "true"
```

```bash
#!/bin/bash
# .buildkite/hooks/pre-command
# Pre-command hook that runs before every build step
# Use this to configure Podman for the build environment

# Clean up any stopped containers left over from previous builds
podman container prune -f 2>/dev/null || true

# Prune dangling images older than 24h
podman image prune -f --filter "until=24h" 2>/dev/null || true

echo "Podman environment ready"
podman info --format 'Storage driver: {{.Store.GraphDriverName}}'
```

## Dynamic Pipeline Generation

Generate pipeline steps dynamically using Podman for complex workflows.

```bash
#!/bin/bash
# .buildkite/scripts/generate-pipeline.sh
# Generate Buildkite pipeline steps based on changed files

cat << 'YAML'
steps:
YAML

# Always build the image
cat << YAML
  - label: ":building_construction: Build Image"
    command: podman build -t myapp:${BUILDKITE_COMMIT} .
    agents:
      podman: "true"
YAML

# Add test steps based on what changed
if git diff --name-only HEAD~1 | grep -q "^src/"; then
cat << YAML
  - label: ":test_tube: Build and Unit Tests"
    command: |
      podman build -t myapp:${BUILDKITE_COMMIT} .
      podman run --rm myapp:${BUILDKITE_COMMIT} npm test
    agents:
      podman: "true"
YAML
fi

if git diff --name-only HEAD~1 | grep -q "^test/integration"; then
cat << YAML
  - label: ":database: Build and Integration Tests"
    command: |
      set -euo pipefail
      podman build -t myapp:${BUILDKITE_COMMIT} .
      podman network create bk-net
      cleanup() {
        podman rm -f testdb 2>/dev/null || true
        podman network rm bk-net 2>/dev/null || true
      }
      trap cleanup EXIT
      podman run -d --name testdb --network bk-net -e POSTGRES_PASSWORD=test postgres:16-alpine
      until podman exec testdb pg_isready -U postgres; do
        sleep 1
      done
      podman run --rm --network bk-net -e DB_HOST=testdb myapp:${BUILDKITE_COMMIT} npm run test:integration
    agents:
      podman: "true"
YAML
fi
```

```yaml
# .buildkite/pipeline.yml for dynamic generation
steps:
  - label: ":pipeline: Generate Pipeline"
    command: .buildkite/scripts/generate-pipeline.sh | buildkite-agent pipeline upload
```

## Summary

Buildkite's self-hosted agent model gives you full control over the build environment, making Podman integration straightforward. Install Podman on your agents, tag them appropriately, and use Podman commands directly in your pipeline steps. Pre-command hooks help manage cleanup and configuration, while dynamic pipeline generation lets you create complex workflows based on code changes. The agent-based approach means you can optimize your Podman configuration per machine, including storage drivers and caching strategies, for the best possible performance.
