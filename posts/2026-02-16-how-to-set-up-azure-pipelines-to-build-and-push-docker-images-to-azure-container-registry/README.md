# How to Set Up Azure Pipelines to Build and Push Docker Images to Azure Container Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Docker, Azure Container Registry, CI/CD, Containers, DevOps, ACR

Description: A complete walkthrough of configuring Azure Pipelines to build Docker images, tag them properly, and push them to Azure Container Registry.

---

Containerized applications need a reliable CI/CD pipeline that builds Docker images on every commit, tags them properly, and pushes them to a container registry where deployment tools can pick them up. Azure Pipelines and Azure Container Registry (ACR) are a natural fit for this workflow. ACR integrates tightly with other Azure services like AKS, App Service, and Azure Functions, and Azure Pipelines has first-class Docker support built right in.

In this post, I will walk through setting up a complete pipeline that builds a Docker image, runs tests inside a container, tags the image with meaningful versions, and pushes it to ACR.

## Prerequisites

Before starting, you need:

- An Azure Container Registry. If you do not have one, create it with the Azure CLI:

```bash
# Create a resource group for the container registry
az group create --name container-rg --location eastus

# Create the Azure Container Registry
# The SKU options are Basic, Standard, and Premium
az acr create \
  --resource-group container-rg \
  --name myappregistry \
  --sku Standard \
  --admin-enabled false
```

- A service connection from Azure DevOps to your Azure subscription (or directly to the ACR)
- A Dockerfile in your repository

## Setting Up the Service Connection

Azure Pipelines needs credentials to push images to ACR. The cleanest approach is a Docker Registry service connection:

1. In Azure DevOps, go to Project Settings, then Service Connections
2. Click "New service connection" and select "Docker Registry"
3. Choose "Azure Container Registry"
4. Select your subscription and the ACR instance
5. Give the connection a name like `acr-connection`

Alternatively, you can use an Azure Resource Manager service connection, which gives broader access to Azure resources.

## Basic Pipeline for Building and Pushing

Here is a straightforward pipeline that builds a Docker image and pushes it to ACR:

```yaml
# Pipeline to build and push Docker images to Azure Container Registry
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    exclude:
      - '*.md'
      - 'docs/**'

pool:
  vmImage: 'ubuntu-latest'

variables:
  # Container registry service connection name
  dockerRegistryServiceConnection: 'acr-connection'
  # Full registry URL
  containerRegistry: 'myappregistry.azurecr.io'
  # Image repository name
  imageRepository: 'myapp/web'
  # Dockerfile location
  dockerfilePath: '$(Build.SourcesDirectory)/Dockerfile'
  # Tag with build ID and also tag as latest for the branch
  tag: '$(Build.BuildId)'

steps:
  # Build the Docker image
  - task: Docker@2
    displayName: 'Build Docker image'
    inputs:
      containerRegistry: $(dockerRegistryServiceConnection)
      repository: $(imageRepository)
      command: 'build'
      Dockerfile: $(dockerfilePath)
      tags: |
        $(tag)
        latest

  # Push the image to ACR
  - task: Docker@2
    displayName: 'Push to ACR'
    inputs:
      containerRegistry: $(dockerRegistryServiceConnection)
      repository: $(imageRepository)
      command: 'push'
      tags: |
        $(tag)
        latest
```

## Smarter Tagging Strategies

Using just the build ID as a tag works, but it does not tell you much about what is in the image. A better approach combines multiple pieces of information:

```yaml
variables:
  containerRegistry: 'myappregistry.azurecr.io'
  imageRepository: 'myapp/web'

steps:
  # Generate meaningful tags based on branch and commit info
  - script: |
      # Short commit hash for traceability
      SHORT_SHA=$(echo $(Build.SourceVersion) | cut -c1-8)

      # Branch name, sanitized for use as a Docker tag
      BRANCH=$(echo $(Build.SourceBranchName) | sed 's/[^a-zA-Z0-9._-]/-/g')

      # Build timestamp for ordering
      BUILD_TIME=$(date +%Y%m%d-%H%M%S)

      # Set pipeline variables for use in later steps
      echo "##vso[task.setvariable variable=shortSha]${SHORT_SHA}"
      echo "##vso[task.setvariable variable=branchTag]${BRANCH}"
      echo "##vso[task.setvariable variable=buildTime]${BUILD_TIME}"
    displayName: 'Generate image tags'

  # Build with multiple tags for different use cases
  - task: Docker@2
    displayName: 'Build and push'
    inputs:
      containerRegistry: 'acr-connection'
      repository: $(imageRepository)
      command: 'buildAndPush'
      Dockerfile: 'Dockerfile'
      tags: |
        $(shortSha)
        $(branchTag)-$(shortSha)
        $(branchTag)-latest
        build-$(Build.BuildId)
```

This gives you tags like `a1b2c3d4`, `main-a1b2c3d4`, `main-latest`, and `build-456`. Each serves a different purpose - exact commit reference, branch-specific latest, and build number.

## Multi-Stage Docker Builds

Most real applications use multi-stage Dockerfiles. Here is an example for a Node.js application:

```dockerfile
# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --production=false

# Copy source code and build
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production image (much smaller)
FROM node:20-alpine AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Running Tests in the Pipeline Before Pushing

You should run tests before pushing the image to ACR. Here is a pipeline that builds the image, runs tests inside a container, and only pushes if tests pass:

```yaml
stages:
  # Stage 1: Build and test
  - stage: BuildAndTest
    displayName: 'Build and Test'
    jobs:
      - job: Build
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          # Build the test stage of the multi-stage Dockerfile
          - script: |
              docker build \
                --target builder \
                --tag myapp-test:$(Build.BuildId) \
                --file Dockerfile .
            displayName: 'Build test image'

          # Run tests inside the container
          - script: |
              docker run --rm \
                myapp-test:$(Build.BuildId) \
                npm test
            displayName: 'Run tests in container'

          # Run linting inside the container
          - script: |
              docker run --rm \
                myapp-test:$(Build.BuildId) \
                npm run lint
            displayName: 'Run linting in container'

          # Build the final production image
          - task: Docker@2
            displayName: 'Build production image'
            inputs:
              containerRegistry: 'acr-connection'
              repository: 'myapp/web'
              command: 'build'
              Dockerfile: 'Dockerfile'
              tags: |
                $(Build.BuildId)
                latest

          # Push only if everything passed
          - task: Docker@2
            displayName: 'Push to ACR'
            inputs:
              containerRegistry: 'acr-connection'
              repository: 'myapp/web'
              command: 'push'
              tags: |
                $(Build.BuildId)
                latest
```

## Using Docker Layer Caching

Docker builds can be slow if layers are rebuilt from scratch every time. Azure Pipelines supports layer caching to speed things up:

```yaml
steps:
  # Pull the previous image to use as a cache source
  - script: |
      docker pull myappregistry.azurecr.io/myapp/web:latest || true
    displayName: 'Pull cache image'

  # Build using the previous image as cache
  - script: |
      docker build \
        --cache-from myappregistry.azurecr.io/myapp/web:latest \
        --tag myappregistry.azurecr.io/myapp/web:$(Build.BuildId) \
        --tag myappregistry.azurecr.io/myapp/web:latest \
        --file Dockerfile .
    displayName: 'Build with layer cache'

  # Push the new image
  - task: Docker@2
    displayName: 'Push to ACR'
    inputs:
      containerRegistry: 'acr-connection'
      repository: 'myapp/web'
      command: 'push'
      tags: |
        $(Build.BuildId)
        latest
```

## Scanning Images for Vulnerabilities

Before pushing to ACR, scan the image for known vulnerabilities. You can use tools like Trivy:

```yaml
steps:
  - task: Docker@2
    displayName: 'Build image'
    inputs:
      containerRegistry: 'acr-connection'
      repository: 'myapp/web'
      command: 'build'
      Dockerfile: 'Dockerfile'
      tags: $(Build.BuildId)

  # Install and run Trivy vulnerability scanner
  - script: |
      # Install Trivy
      sudo apt-get install -y wget apt-transport-https gnupg lsb-release
      wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
      echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee /etc/apt/sources.list.d/trivy.list
      sudo apt-get update && sudo apt-get install -y trivy

      # Scan the image - fail if HIGH or CRITICAL vulnerabilities found
      trivy image \
        --severity HIGH,CRITICAL \
        --exit-code 1 \
        myappregistry.azurecr.io/myapp/web:$(Build.BuildId)
    displayName: 'Scan image for vulnerabilities'

  # Only push if the scan passed
  - task: Docker@2
    displayName: 'Push to ACR'
    inputs:
      containerRegistry: 'acr-connection'
      repository: 'myapp/web'
      command: 'push'
      tags: $(Build.BuildId)
```

## Building Multiple Images in One Pipeline

Many applications are composed of multiple services, each with its own Dockerfile. You can build them all in one pipeline:

```yaml
# Build matrix for multiple services
strategy:
  matrix:
    WebApp:
      serviceName: 'webapp'
      dockerFile: 'src/webapp/Dockerfile'
    API:
      serviceName: 'api'
      dockerFile: 'src/api/Dockerfile'
    Worker:
      serviceName: 'worker'
      dockerFile: 'src/worker/Dockerfile'

steps:
  - task: Docker@2
    displayName: 'Build and push $(serviceName)'
    inputs:
      containerRegistry: 'acr-connection'
      repository: 'myapp/$(serviceName)'
      command: 'buildAndPush'
      Dockerfile: '$(dockerFile)'
      tags: |
        $(Build.BuildId)
        latest
```

## ACR Tasks for Server-Side Builds

For simpler scenarios, you can use ACR Tasks to build images directly in the registry without needing a pipeline agent:

```yaml
steps:
  # Trigger a build on ACR itself (no Docker needed on the agent)
  - task: AzureCLI@2
    displayName: 'Build image using ACR Tasks'
    inputs:
      azureSubscription: 'azure-subscription'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az acr build \
          --registry myappregistry \
          --image myapp/web:$(Build.BuildId) \
          --image myapp/web:latest \
          --file Dockerfile .
```

## Wrapping Up

Building and pushing Docker images to ACR through Azure Pipelines is a foundational pattern for containerized applications on Azure. The key pieces are proper tagging for traceability, testing before pushing, vulnerability scanning for security, and layer caching for speed. Once this pipeline is in place, every commit automatically produces a tested, tagged, scanned container image ready for deployment to AKS, App Service, or any other container runtime.
