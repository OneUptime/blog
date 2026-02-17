# How to Set Up Azure Pipelines Container Jobs to Run Builds in Custom Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Docker, Container Jobs, CI/CD, DevOps, Containers, Build Automation

Description: Learn how to configure Azure Pipelines container jobs to run build steps inside custom Docker containers for consistent and reproducible build environments.

---

One of the most frustrating problems in CI/CD is "it works on my machine but not in the pipeline." The root cause is usually environment differences - different tool versions, missing dependencies, or OS-level configuration that varies between the pipeline agent and the developer's machine. Container jobs solve this by running your build steps inside a Docker container that you control completely.

Instead of relying on whatever tools are pre-installed on the Azure Pipelines agent, you define a Docker image with exactly the tools and versions you need. Every build runs in the same environment, whether it is on a Microsoft-hosted agent, your self-hosted agent, or a developer's laptop. In this post, I will walk through configuring container jobs in Azure Pipelines, building custom build images, and handling the common scenarios.

## Basic Container Job

The simplest container job specifies a public Docker image and runs your steps inside it:

```yaml
# Run all job steps inside an Ubuntu container
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

# Specify the container image for all steps in this job
container: ubuntu:22.04

steps:
  - script: |
      cat /etc/os-release
      echo "Running inside container"
    displayName: 'Verify container environment'
```

When this pipeline runs, Azure Pipelines:

1. Starts the pipeline agent on an Ubuntu VM (the host)
2. Pulls the specified Docker image
3. Starts a container from that image
4. Runs all the pipeline steps inside the container
5. Maps the source code and pipeline workspace into the container

## Using Custom Build Images

For real projects, you want a custom image with your specific toolchain. Here is a Dockerfile for a Node.js project:

```dockerfile
# Dockerfile.build - Custom build image for Node.js projects
FROM node:20-slim

# Install additional tools needed during the build
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    jq \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install global npm tools
RUN npm install -g typescript eslint prettier

# Create a non-root user for security
# Azure Pipelines requires the user to have a home directory
RUN useradd -m -d /home/vsts -s /bin/bash vsts
USER vsts
WORKDIR /home/vsts
```

Build and push this image to a container registry:

```bash
# Build the custom image
docker build -t myregistry.azurecr.io/build-images/node20:latest -f Dockerfile.build .

# Push to Azure Container Registry
docker push myregistry.azurecr.io/build-images/node20:latest
```

Reference it in your pipeline:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

# Use a custom image from Azure Container Registry
container:
  image: myregistry.azurecr.io/build-images/node20:latest
  endpoint: acr-service-connection  # Service connection for ACR authentication

steps:
  - script: |
      node --version
      npm --version
      tsc --version
    displayName: 'Check tool versions'

  - script: |
      npm ci
      npm run build
      npm test
    displayName: 'Build and test'
```

## Container Resource with Options

The `container` keyword supports various Docker options:

```yaml
resources:
  containers:
    # Define the container with detailed configuration
    - container: build_container
      image: myregistry.azurecr.io/build-images/node20:latest
      endpoint: acr-service-connection
      # Environment variables available inside the container
      env:
        NODE_ENV: production
        CI: true
      # Volume mounts for sharing data between host and container
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock  # Docker-in-Docker
      # Networking options
      ports:
        - 8080:8080
      # Resource limits
      options: '--memory 4g --cpus 2'

pool:
  vmImage: 'ubuntu-latest'

jobs:
  - job: Build
    container: build_container
    steps:
      - script: npm ci && npm run build
        displayName: 'Build'
```

## Multiple Containers in One Pipeline

Different jobs can use different containers. This is useful when your pipeline has stages that need different toolchains:

```yaml
resources:
  containers:
    # Node.js container for frontend build
    - container: node_container
      image: node:20-slim

    # Python container for backend tests
    - container: python_container
      image: python:3.12-slim

    # .NET container for API build
    - container: dotnet_container
      image: mcr.microsoft.com/dotnet/sdk:8.0

pool:
  vmImage: 'ubuntu-latest'

jobs:
  # Frontend build runs in Node.js container
  - job: BuildFrontend
    container: node_container
    steps:
      - script: |
          cd frontend
          npm ci
          npm run build
        displayName: 'Build frontend'

  # Backend tests run in Python container
  - job: TestBackend
    container: python_container
    steps:
      - script: |
          cd backend
          pip install -r requirements.txt
          pytest tests/
        displayName: 'Test backend'

  # API build runs in .NET container
  - job: BuildAPI
    container: dotnet_container
    steps:
      - script: |
          cd api
          dotnet restore
          dotnet build
          dotnet test
        displayName: 'Build and test API'
```

## Sidecar Containers for Service Dependencies

Your build might need external services like databases or caches. Sidecar containers run alongside your build container:

```yaml
resources:
  containers:
    # Main build container
    - container: build
      image: node:20-slim

    # PostgreSQL sidecar for integration tests
    - container: postgres
      image: postgres:16
      env:
        POSTGRES_DB: testdb
        POSTGRES_USER: testuser
        POSTGRES_PASSWORD: testpass
      ports:
        - 5432:5432

    # Redis sidecar for caching tests
    - container: redis
      image: redis:7-alpine
      ports:
        - 6379:6379

pool:
  vmImage: 'ubuntu-latest'

jobs:
  - job: IntegrationTests
    container: build
    # Sidecar containers start alongside the build container
    services:
      postgres: postgres
      redis: redis
    steps:
      - script: |
          npm ci
          npm run test:integration
        displayName: 'Run integration tests'
        env:
          # Connect to sidecar services using their service names
          DATABASE_URL: postgresql://testuser:testpass@postgres:5432/testdb
          REDIS_URL: redis://redis:6379
```

The sidecar containers are accessible by their service name (the key in the `services` map). In this example, the PostgreSQL database is reachable at `postgres:5432` from inside the build container.

## Docker-in-Docker for Building Images

If your pipeline needs to build Docker images inside a container job, you need Docker-in-Docker (DinD):

```yaml
resources:
  containers:
    - container: dind
      image: docker:24-dind
      options: '--privileged'  # Required for Docker-in-Docker
      env:
        DOCKER_TLS_CERTDIR: ''

pool:
  vmImage: 'ubuntu-latest'

jobs:
  - job: BuildImages
    container: dind
    steps:
      - script: |
          # Wait for Docker daemon to be ready
          while ! docker info > /dev/null 2>&1; do
            echo "Waiting for Docker daemon..."
            sleep 1
          done
          echo "Docker is ready"
        displayName: 'Wait for Docker'

      - script: |
          docker build -t myapp:$(Build.BuildId) .
          docker images
        displayName: 'Build Docker image'
```

Alternatively, you can mount the host's Docker socket into the container (less isolated but simpler):

```yaml
resources:
  containers:
    - container: builder
      image: myregistry.azurecr.io/build-images/node20:latest
      endpoint: acr-connection
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock

jobs:
  - job: Build
    container: builder
    steps:
      - script: |
          # Uses the host's Docker daemon
          docker build -t myapp:latest .
        displayName: 'Build image via host Docker'
```

## Building the Build Image in the Same Pipeline

You can even build your custom build image as the first step of your pipeline and then use it for subsequent jobs:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  # Stage 1: Build the custom build image
  - stage: BuildImage
    jobs:
      - job: CreateBuildImage
        steps:
          - task: Docker@2
            inputs:
              containerRegistry: 'acr-connection'
              repository: 'build-images/myapp-builder'
              command: 'buildAndPush'
              Dockerfile: 'Dockerfile.build'
              tags: 'latest'

  # Stage 2: Use the freshly built image for the actual build
  - stage: Build
    dependsOn: BuildImage
    jobs:
      - job: BuildApp
        container:
          image: myregistry.azurecr.io/build-images/myapp-builder:latest
          endpoint: acr-connection
        steps:
          - script: |
              npm ci
              npm run build
              npm test
            displayName: 'Build and test'
```

## Handling File Permissions

A common issue with container jobs is file permission conflicts. The pipeline agent runs as one user, but the container might use a different user. If you see "Permission denied" errors, you have a few options:

```yaml
# Option 1: Run the container as root
container:
  image: myregistry.azurecr.io/build-images/node20:latest
  options: '--user 0:0'  # Run as root

# Option 2: Match the container user to the agent user
# In your Dockerfile, create a user with UID 1001 (common agent UID)
```

In your Dockerfile:

```dockerfile
# Create a user that matches the Azure Pipelines agent UID
RUN groupadd -g 1001 vsts && \
    useradd -u 1001 -g 1001 -m vsts
USER vsts
```

## Caching in Container Jobs

The pipeline cache task works with container jobs, but the cache path must be accessible to both the host agent and the container:

```yaml
container:
  image: node:20-slim

steps:
  # Cache node_modules to speed up subsequent builds
  - task: Cache@2
    inputs:
      key: 'npm | "$(Agent.OS)" | package-lock.json'
      path: '$(Pipeline.Workspace)/.npm'
    displayName: 'Cache npm packages'

  - script: |
      npm ci --cache $(Pipeline.Workspace)/.npm
      npm run build
    displayName: 'Install and build'
```

## When to Use Container Jobs vs. Pipeline Tasks

Container jobs are ideal when:

- You need specific tool versions that differ from the agent image
- Your build has complex system-level dependencies
- You want identical environments across local development and CI
- You need to test against specific OS configurations

Stick with regular pipeline tasks when:

- The agent image already has what you need
- You need to use pipeline tasks that interact with the agent OS directly
- Performance is critical (container startup adds some overhead)

## Wrapping Up

Container jobs give you full control over your build environment. No more debugging tool version mismatches between the agent and your project requirements. Define your build image once, push it to a registry, and every pipeline run gets exactly the same environment. Combined with sidecar containers for service dependencies, you can run even complex integration tests in a fully isolated, reproducible setup. Start with a basic container job using a public image, and graduate to custom build images as your needs grow.
