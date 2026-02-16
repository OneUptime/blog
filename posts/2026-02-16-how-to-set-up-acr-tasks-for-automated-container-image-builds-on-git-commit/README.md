# How to Set Up ACR Tasks for Automated Container Image Builds on Git Commit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACR, Azure Container Registry, ACR Tasks, CI/CD, Docker, Automated Builds, Git

Description: Step-by-step guide to setting up ACR Tasks for automatically building and pushing container images to Azure Container Registry on every Git commit.

---

Building container images locally and pushing them to a registry is fine for development, but it does not scale for teams. You need automated builds that trigger on every commit, build the image in the cloud, and push it to the registry without any local Docker dependency. Azure Container Registry Tasks (ACR Tasks) provides exactly this - a serverless build service that watches your Git repository and builds images automatically.

## What ACR Tasks Offers

ACR Tasks goes beyond simple image builds:

- **Quick tasks**: One-off cloud builds without a local Docker daemon.
- **Automatically triggered tasks**: Builds that fire on Git commits, base image updates, or schedules.
- **Multi-step tasks**: Complex workflows with multiple build, push, and test steps.
- **Cross-platform builds**: Build Linux and Windows images from the same task.
- **Base image update triggers**: Automatically rebuild your images when the base image gets a security patch.

For this guide, we focus on the most common use case: automatically building and pushing an image whenever code is committed to a Git repository.

## Prerequisites

- Azure Container Registry (any SKU, but tasks work best with Standard or Premium)
- A GitHub or Azure DevOps repository with a Dockerfile
- Azure CLI 2.40+
- A personal access token (PAT) for your Git provider

## Step 1: Quick Task - Build Once from Source

Before setting up automatic triggers, test that ACR Tasks can build your image.

```bash
# Run a quick build task from a local directory
# This uploads your source code to ACR and builds it in the cloud
az acr build \
  --registry myregistry \
  --image my-app:latest \
  --file Dockerfile \
  .
```

This command:

1. Packages your local source code.
2. Uploads it to ACR.
3. Builds the Dockerfile in ACR's cloud build infrastructure.
4. Pushes the resulting image to the registry.

No local Docker daemon needed. This is great for developers who do not want to install Docker locally or for building on machines without Docker support.

## Step 2: Build from a Git Repository

You can also build directly from a Git URL without any local source.

```bash
# Build directly from a GitHub repository
# ACR clones the repo and builds the Dockerfile
az acr build \
  --registry myregistry \
  --image my-app:{{.Run.ID}} \
  https://github.com/my-org/my-app.git#main
```

The `{{.Run.ID}}` template creates a unique tag for each build run. This helps trace which build produced which image.

## Step 3: Create a Git Commit Trigger

Now set up an automatic task that builds on every commit to the main branch.

```bash
# Create a task that triggers on Git commits to the main branch
# PAT is your GitHub personal access token with repo permissions
az acr task create \
  --registry myregistry \
  --name build-my-app \
  --image my-app:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT"
```

This creates a persistent task that:

1. Registers a webhook on your GitHub repository.
2. On every commit to `main`, triggers a cloud build.
3. Builds the Dockerfile and pushes the image with a unique tag.

Verify the task was created.

```bash
# List all tasks on the registry
az acr task list --registry myregistry --output table

# View task details
az acr task show --registry myregistry --name build-my-app
```

## Step 4: Customize the Build Trigger

### Trigger on Multiple Branches

```bash
# Create separate tasks for different branches
# Production builds from main
az acr task create \
  --registry myregistry \
  --name build-production \
  --image my-app:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT"

# Development builds from develop
az acr task create \
  --registry myregistry \
  --name build-development \
  --image my-app-dev:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch develop \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT"
```

### Trigger on Pull Requests

```bash
# Trigger builds on pull requests for validation
az acr task create \
  --registry myregistry \
  --name validate-pr \
  --image my-app-pr:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --pull-request-trigger-enabled true \
  --commit-trigger-enabled false
```

### Tag Images with Git SHA

Use the Git commit SHA as the image tag for traceability.

```bash
# Use the commit SHA as the image tag
az acr task create \
  --registry myregistry \
  --name build-my-app \
  --image "my-app:{{.Run.ID}}" \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --arg "BUILD_ID={{.Run.ID}}"
```

## Step 5: Multi-Step Tasks

For more complex builds that involve testing, scanning, or building multiple images, use multi-step task YAML files.

Create a `acr-task.yaml` in your repository.

```yaml
# acr-task.yaml
# Multi-step ACR task: build, test, and push
version: v1.1.0
steps:
  # Step 1: Build the application image
  - build: -t {{.Run.Registry}}/my-app:{{.Run.ID}} -f Dockerfile .
    id: build-app

  # Step 2: Run unit tests inside the built image
  - cmd: "{{.Run.Registry}}/my-app:{{.Run.ID}} npm test"
    id: run-tests
    # Only run tests if the build succeeded
    when: ["build-app"]

  # Step 3: Push the image only if tests pass
  - push:
    - "{{.Run.Registry}}/my-app:{{.Run.ID}}"
    - "{{.Run.Registry}}/my-app:latest"
    when: ["run-tests"]
```

Create the task referencing the YAML file.

```bash
# Create a task using the multi-step YAML definition
az acr task create \
  --registry myregistry \
  --name build-test-push \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file acr-task.yaml \
  --git-access-token "$GITHUB_PAT"
```

## Step 6: Base Image Update Triggers

One of ACR Tasks' best features is rebuilding your images when the base image gets updated. This ensures your images always have the latest security patches.

```bash
# Create a task that rebuilds when the base image changes
# If nginx:1.25 gets a security patch, this task automatically rebuilds
az acr task create \
  --registry myregistry \
  --name auto-rebuild-on-base \
  --image my-app:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --base-image-trigger-enabled true \
  --base-image-trigger-type All
```

For this to work, your Dockerfile must reference a specific base image tag (not `latest`). The task tracks the digest of the base image and triggers a rebuild when it changes.

```dockerfile
# Dockerfile
# Using a specific tag that ACR Tasks can track for updates
FROM nginx:1.25-alpine

# Copy application files
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost/ || exit 1
```

## Step 7: Schedule Periodic Builds

Create tasks that run on a schedule, useful for nightly builds or periodic security scans.

```bash
# Create a task that runs every day at 2 AM UTC
az acr task create \
  --registry myregistry \
  --name nightly-build \
  --image my-app:nightly-{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --schedule "0 2 * * *" \
  --commit-trigger-enabled false
```

## Step 8: View Build Logs and History

Monitor your builds and troubleshoot failures.

```bash
# List recent task runs
az acr task list-runs \
  --registry myregistry \
  --output table

# View logs for a specific run
az acr task logs \
  --registry myregistry \
  --run-id abc123

# View logs for the latest run of a specific task
az acr task logs \
  --registry myregistry \
  --name build-my-app

# Stream logs in real time for the latest run
az acr task logs \
  --registry myregistry \
  --name build-my-app \
  --no-format
```

## Step 9: Build Arguments and Secrets

Pass build arguments and secrets to your tasks without embedding them in the Dockerfile.

```bash
# Create a task with build arguments
az acr task create \
  --registry myregistry \
  --name build-with-args \
  --image my-app:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --arg "NPM_TOKEN=\$NPM_TOKEN" \
  --secret-arg "NPM_TOKEN=$NPM_TOKEN"
```

The `--secret-arg` parameter ensures the value is not logged in build output.

Reference the argument in your Dockerfile.

```dockerfile
# Dockerfile with build argument for private NPM registry
FROM node:20-alpine

# Declare the build argument
ARG NPM_TOKEN

WORKDIR /app

# Use the token to install private packages
COPY package*.json ./
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm ci --production && \
    rm .npmrc

COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Step 10: Task Identity for Azure Resource Access

If your build needs to access Azure resources (like pulling base images from another ACR), assign a managed identity to the task.

```bash
# Create a task with a system-assigned managed identity
az acr task create \
  --registry myregistry \
  --name build-with-identity \
  --image my-app:{{.Run.ID}} \
  --context https://github.com/my-org/my-app.git \
  --branch main \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --assign-identity
```

## Troubleshooting

**Task not triggering on commits**: Verify the webhook was created on your GitHub repository. Check Settings > Webhooks. If the webhook is missing, re-create the task with a fresh PAT.

**Build fails with "Dockerfile not found"**: Check the `--file` path relative to the repository root. If your Dockerfile is in a subdirectory, specify the full path (e.g., `--file docker/Dockerfile`).

**Build timeout**: The default timeout is 3600 seconds (1 hour). For large builds, increase it with `--timeout 7200`.

**Authentication errors pulling base images**: If your base image is in a private registry, configure credentials or use a managed identity with AcrPull access.

**Build cache not working**: ACR Tasks do not cache layers between runs by default. Use `--cache-from` to specify cache sources, or use multi-stage builds to minimize rebuild time.

## Summary

ACR Tasks turns Azure Container Registry into a complete CI/CD build system for container images. Set up a Git trigger to build on every commit, add base image triggers to automatically pick up security patches, and use multi-step tasks for build-test-push workflows. The entire build happens in the cloud - no local Docker daemon needed, no build infrastructure to manage. Combined with AKS deployments through Flux or other GitOps tools, you get a complete image pipeline from source code to running containers.
