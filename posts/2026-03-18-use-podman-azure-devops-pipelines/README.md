# How to Use Podman in Azure DevOps Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Azure DevOps, CI/CD, Pipeline

Description: Learn how to integrate Podman into Azure DevOps Pipelines for building, testing, and deploying container images to Azure Container Registry.

---

> Podman in Azure DevOps Pipelines offers a daemonless container workflow that pairs naturally with Azure Container Registry and Azure Kubernetes Service.

Azure DevOps Pipelines is a robust CI/CD service from Microsoft, and Podman can be used as an alternative to Docker for container operations. Ubuntu-based Microsoft-hosted agents support Podman installation, and self-hosted agents can be configured with Podman pre-installed. This guide covers practical patterns for using Podman in your Azure DevOps pipelines.

---

## Setting Up Podman in Azure Pipelines

Create a pipeline YAML file that installs and uses Podman on Microsoft-hosted agents.

```yaml
# azure-pipelines.yml

# Pipeline that uses Podman for container operations
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  # Azure Container Registry settings
  acrName: 'myregistry'
  acrLoginServer: 'myregistry.azurecr.io'
  imageName: 'myapp'
  imageTag: '$(Build.BuildId)'

steps:
  # Install Podman on the agent
  - script: |
      sudo apt-get update
      sudo apt-get install -y podman
      podman --version
    displayName: 'Install Podman'

  # Build the container image
  - script: |
      podman build \
        -t $(acrLoginServer)/$(imageName):$(imageTag) \
        -t $(acrLoginServer)/$(imageName):latest \
        .
    displayName: 'Build Container Image'

  # Run unit tests inside the container
  - script: |
      podman run --rm \
        $(acrLoginServer)/$(imageName):$(imageTag) \
        npm test
    displayName: 'Run Unit Tests'
```

## Pushing Images to Azure Container Registry

Use an Azure service connection to authenticate and push images to ACR.

```yaml
# Steps to push images to Azure Container Registry
steps:
  # Use Azure CLI task to get ACR credentials
  - task: AzureCLI@2
    displayName: 'Login to ACR with Podman'
    inputs:
      azureSubscription: 'my-azure-subscription'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Get ACR access token using Azure CLI
        ACR_TOKEN=$(az acr login --name $(acrName) --expose-token --query accessToken -o tsv)

        # Login to ACR using Podman
        echo "$ACR_TOKEN" | podman login \
          $(acrLoginServer) \
          -u 00000000-0000-0000-0000-000000000000 \
          --password-stdin

        # Push the images to ACR
        podman push $(acrLoginServer)/$(imageName):$(imageTag)
        podman push $(acrLoginServer)/$(imageName):latest
```

## Multi-Stage Pipeline with Podman

Create a multi-stage pipeline for build, test, and deploy workflows.

```yaml
# azure-pipelines.yml
# Multi-stage pipeline using Podman
trigger:
  - main

variables:
  # Azure Container Registry settings
  acrName: 'myregistry'
  acrLoginServer: 'myregistry.azurecr.io'
  imageName: 'myapp'
  imageTag: '$(Build.BuildId)'

stages:
  # Build stage: create and save the container image
  - stage: Build
    displayName: 'Build Image'
    jobs:
      - job: BuildJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: sudo apt-get update && sudo apt-get install -y podman
            displayName: 'Install Podman'

          - script: |
              podman build \
                -t $(acrLoginServer)/$(imageName):$(imageTag) .
            displayName: 'Build Image'

          # Save image as a pipeline artifact for later stages
          - script: |
              podman save \
                -o $(Build.ArtifactStagingDirectory)/image.tar \
                $(acrLoginServer)/$(imageName):$(imageTag)
            displayName: 'Save Image'

          - publish: $(Build.ArtifactStagingDirectory)/image.tar
            artifact: container-image
            displayName: 'Publish Image Artifact'

  # Test stage: load the image and run tests
  - stage: Test
    displayName: 'Run Tests'
    dependsOn: Build
    jobs:
      - job: TestJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: sudo apt-get update && sudo apt-get install -y podman
            displayName: 'Install Podman'

          - download: current
            artifact: container-image

          - script: |
              # Load image from artifact
              podman load -i $(Pipeline.Workspace)/container-image/image.tar

              # Run test suite
              podman run --rm \
                $(acrLoginServer)/$(imageName):$(imageTag) \
                npm test
            displayName: 'Load and Test Image'

  # Deploy stage: push to ACR (runs only on main branch)
  - stage: Deploy
    displayName: 'Push to ACR'
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: DeployJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: sudo apt-get update && sudo apt-get install -y podman
            displayName: 'Install Podman'

          - download: current
            artifact: container-image

          - task: AzureCLI@2
            displayName: 'Push to ACR'
            inputs:
              azureSubscription: 'my-azure-subscription'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                podman load -i $(Pipeline.Workspace)/container-image/image.tar
                ACR_TOKEN=$(az acr login --name $(acrName) --expose-token --query accessToken -o tsv)
                echo "$ACR_TOKEN" | podman login $(acrLoginServer) -u 00000000-0000-0000-0000-000000000000 --password-stdin
                podman push $(acrLoginServer)/$(imageName):$(imageTag)
```

## Integration Testing with Podman in Azure Pipelines

Run multi-container integration tests using Podman pods.

```yaml
# Integration test job using Podman pods
- job: IntegrationTest
  pool:
    vmImage: 'ubuntu-latest'
  steps:
    - script: sudo apt-get update && sudo apt-get install -y podman
      displayName: 'Install Podman'

    - script: |
        # Build the application image
        podman build -t myapp:test .

        # Create a pod with the required ports
        podman pod create --name az-test-pod -p 5432:5432

        # Start PostgreSQL in the pod
        podman run -d \
          --pod az-test-pod \
          --name testdb \
          -e POSTGRES_PASSWORD=testpass \
          -e POSTGRES_DB=mydb \
          postgres:16

        # Wait for database
        until podman exec testdb pg_isready -U postgres; do
          sleep 2
        done

        # Run integration tests
        podman run --rm \
          --pod az-test-pod \
          -e DATABASE_URL=postgresql://postgres:testpass@localhost/mydb \
          myapp:test npm run test:integration
      displayName: 'Run Integration Tests'

    - script: |
        podman pod rm -f az-test-pod || true
      displayName: 'Cleanup'
      condition: always()
```

## Summary

Podman integrates smoothly with Azure DevOps Pipelines, providing a daemonless container runtime for building, testing, and deploying images. You can push to Azure Container Registry using the Azure CLI task for authentication, pass images between pipeline stages using artifacts, and run multi-container integration tests with Podman pods. Multi-stage pipelines give you clear separation of build, test, and deploy phases while keeping Podman as your consistent container engine throughout.
