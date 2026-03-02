# How to Run OpenTofu in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Docker, Container, IaC, DevOps, CI/CD

Description: A complete guide to running OpenTofu inside Docker containers, covering official images, custom Dockerfiles, volume mounts, credential management, and CI/CD integration patterns.

---

Running OpenTofu in Docker gives you a consistent, reproducible environment for your infrastructure-as-code workflows. It eliminates "works on my machine" issues, simplifies CI/CD pipelines, and lets you pin the exact version of OpenTofu along with all its dependencies. This guide walks through everything from using the official image to building custom containers for your team.

## Using the Official OpenTofu Docker Image

The OpenTofu project publishes official Docker images to GitHub Container Registry:

```bash
# Pull the latest OpenTofu image
docker pull ghcr.io/opentofu/opentofu:latest

# Pull a specific version
docker pull ghcr.io/opentofu/opentofu:1.6.2

# Run a simple command
docker run --rm ghcr.io/opentofu/opentofu:1.6.2 version
```

The official image is minimal - it contains the `tofu` binary and essential system libraries. This keeps the image small and reduces the attack surface.

## Running OpenTofu with Your Configuration

To run OpenTofu against your local configuration files, mount your project directory into the container:

```bash
# Mount your project directory and run plan
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan

# Run init first, then plan
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.6.2 \
  init

docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan
```

There is a problem with this approach: each `docker run` creates a fresh container, so the `.terraform` directory created by `init` is lost between commands if it is only in the container filesystem. Make sure your volume mount captures it:

```bash
# The volume mount handles this - .terraform is created inside /workspace
# which is your mounted directory, so it persists between runs
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.6.2 \
  init

# Now plan will work because .terraform exists on your host
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan
```

## Passing Cloud Credentials

Your containerized OpenTofu needs access to cloud provider credentials. There are several approaches, each with different security trade-offs.

### Environment Variables

```bash
# Pass AWS credentials as environment variables
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION=us-east-1 \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan

# Pass Azure credentials
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e ARM_CLIENT_ID \
  -e ARM_CLIENT_SECRET \
  -e ARM_TENANT_ID \
  -e ARM_SUBSCRIPTION_ID \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan

# Pass GCP credentials
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e GOOGLE_APPLICATION_CREDENTIALS=/workspace/credentials.json \
  -v "$HOME/.config/gcloud/application_default_credentials.json:/workspace/credentials.json:ro" \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan
```

### Mount AWS Credentials File

```bash
# Mount your AWS credentials directory (read-only)
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=my-profile \
  ghcr.io/opentofu/opentofu:1.6.2 \
  plan
```

### Using Docker Secrets (Docker Swarm)

```bash
# In a Docker Swarm environment
echo "my-secret-key" | docker secret create aws_secret_key -

# Reference in docker-compose.yml
# version: "3.8"
# services:
#   tofu:
#     image: ghcr.io/opentofu/opentofu:1.6.2
#     secrets:
#       - aws_secret_key
```

## Building a Custom OpenTofu Image

The official image is minimal. For real projects, you usually need additional tools. Here is a Dockerfile for a more complete setup:

```dockerfile
# Dockerfile.opentofu
FROM ghcr.io/opentofu/opentofu:1.6.2 AS tofu

FROM ubuntu:22.04

# Install common dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    python3 \
    python3-pip \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy the tofu binary from the official image
COPY --from=tofu /usr/local/bin/tofu /usr/local/bin/tofu

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

# Install Azure CLI
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Install checkov for security scanning
RUN pip3 install checkov

# Install tflint
RUN curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Set up working directory
WORKDIR /workspace

# Default entrypoint
ENTRYPOINT ["tofu"]
```

Build and use the custom image:

```bash
# Build the image
docker build -t my-opentofu:1.6.2 -f Dockerfile.opentofu .

# Use it just like the official image
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  my-opentofu:1.6.2 \
  plan
```

## Docker Compose for Complex Workflows

For projects that need multiple steps or services alongside OpenTofu, Docker Compose simplifies the setup:

```yaml
# docker-compose.yml
version: "3.8"

services:
  tofu:
    image: ghcr.io/opentofu/opentofu:1.6.2
    volumes:
      - .:/workspace
      - tofu-plugins:/workspace/.terraform
      - ${HOME}/.aws:/root/.aws:ro
    working_dir: /workspace
    environment:
      - AWS_PROFILE=${AWS_PROFILE:-default}
      - AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
      - TF_VAR_environment=${ENVIRONMENT:-dev}

  # Security scanner
  checkov:
    image: bridgecrew/checkov:latest
    volumes:
      - .:/workspace
    working_dir: /workspace
    command: ["-d", "/workspace", "--framework", "terraform"]

  # Linter
  tflint:
    image: ghcr.io/terraform-linters/tflint:latest
    volumes:
      - .:/workspace
    working_dir: /workspace

volumes:
  tofu-plugins:
    # Named volume for plugin cache to speed up repeated init
```

Use it with these commands:

```bash
# Initialize
docker compose run --rm tofu init

# Plan
docker compose run --rm tofu plan

# Apply
docker compose run --rm tofu apply -auto-approve

# Run security scan
docker compose run --rm checkov

# Run linter
docker compose run --rm tflint
```

## Creating a Wrapper Script

Typing long Docker commands gets old quickly. Create a wrapper script:

```bash
#!/bin/bash
# scripts/tofu.sh - Wrapper for running OpenTofu in Docker

TOFU_VERSION="${TOFU_VERSION:-1.6.2}"
IMAGE="ghcr.io/opentofu/opentofu:${TOFU_VERSION}"

# Build the docker run command
DOCKER_ARGS=(
  "run" "--rm"
  "-v" "$(pwd):/workspace"
  "-w" "/workspace"
)

# Pass through AWS credentials if they exist
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  DOCKER_ARGS+=("-e" "AWS_ACCESS_KEY_ID")
  DOCKER_ARGS+=("-e" "AWS_SECRET_ACCESS_KEY")
  DOCKER_ARGS+=("-e" "AWS_SESSION_TOKEN")
fi

# Or mount AWS config if available
if [ -d "$HOME/.aws" ]; then
  DOCKER_ARGS+=("-v" "$HOME/.aws:/root/.aws:ro")
fi

# Pass through common environment variables
for var in AWS_PROFILE AWS_DEFAULT_REGION TF_VAR_environment; do
  if [ -n "${!var}" ]; then
    DOCKER_ARGS+=("-e" "$var")
  fi
done

# Run OpenTofu with all arguments passed through
docker "${DOCKER_ARGS[@]}" "$IMAGE" "$@"
```

Make it executable and use it like a local `tofu` command:

```bash
chmod +x scripts/tofu.sh

# Use it like normal
./scripts/tofu.sh init
./scripts/tofu.sh plan
./scripts/tofu.sh apply
```

## CI/CD Integration

### GitHub Actions with Docker

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure

on:
  pull_request:
    paths:
      - "infrastructure/**"

jobs:
  plan:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/opentofu/opentofu:1.6.2

    steps:
      - uses: actions/checkout@v4

      - name: OpenTofu Init
        working-directory: ./infrastructure
        run: tofu init

      - name: OpenTofu Plan
        working-directory: ./infrastructure
        run: tofu plan -no-color
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### GitLab CI with Docker

```yaml
# .gitlab-ci.yml
image: ghcr.io/opentofu/opentofu:1.6.2

stages:
  - validate
  - plan
  - apply

variables:
  TF_ROOT: "infrastructure"

validate:
  stage: validate
  script:
    - cd $TF_ROOT
    - tofu init -backend=false
    - tofu validate

plan:
  stage: plan
  script:
    - cd $TF_ROOT
    - tofu init
    - tofu plan -out=plan.tfplan
  artifacts:
    paths:
      - $TF_ROOT/plan.tfplan
```

## Plugin Cache for Faster Builds

Provider plugins are the largest download during `tofu init`. Cache them to speed up repeated runs:

```bash
# Set up a persistent plugin cache
docker run --rm \
  -v "$(pwd):/workspace" \
  -v "tofu-plugin-cache:/root/.terraform.d/plugin-cache" \
  -e TF_PLUGIN_CACHE_DIR="/root/.terraform.d/plugin-cache" \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.6.2 \
  init
```

Or in Docker Compose:

```yaml
services:
  tofu:
    image: ghcr.io/opentofu/opentofu:1.6.2
    volumes:
      - .:/workspace
      - plugin-cache:/root/.terraform.d/plugin-cache
    environment:
      - TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache

volumes:
  plugin-cache:
```

## Security Considerations

Running OpenTofu in Docker adds isolation, but keep these security practices in mind:

1. **Never bake credentials into images.** Use environment variables, mounted files, or IAM roles.
2. **Use read-only mounts for credentials.** The `:ro` flag prevents the container from modifying your credential files.
3. **Scan your custom images.** Use tools like Trivy or Snyk to scan for vulnerabilities.
4. **Pin image versions.** Use specific tags instead of `latest` for reproducibility.
5. **Run as non-root when possible.** Create a non-root user in your custom Dockerfile.

```dockerfile
# Run as non-root user
RUN useradd -m -s /bin/bash tofu
USER tofu
WORKDIR /home/tofu/workspace
```

## Monitoring Your Infrastructure

After deploying infrastructure with OpenTofu, monitoring ensures everything stays healthy. [OneUptime](https://oneuptime.com) provides uptime monitoring and alerting for your services, giving you visibility into the infrastructure your Docker-based pipelines deploy.

## Conclusion

Docker provides a clean, repeatable environment for running OpenTofu. Whether you use the official image for simple workflows or build custom images with your full toolchain, containerization eliminates environment inconsistencies and makes your IaC pipelines more reliable. Start with the official image and customize as your needs grow.

For more OpenTofu guides, see our posts on [version management with tofuenv](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-opentofu-version-management-with-tofuenv/view) and [using OpenTofu with existing Terraform Enterprise](https://oneuptime.com/blog/post/2026-02-23-how-to-use-opentofu-with-existing-terraform-enterprise/view).
