# How to Use Azure DevOps Pipelines with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure DevOps, CI/CD, Pipeline, DevOps

Description: Learn how to configure Azure DevOps Pipelines for Dapr applications with build, test, and deploy stages that handle Dapr component deployment and sidecar configuration.

---

Azure DevOps Pipelines integrates with Dapr applications through YAML pipelines that install the Dapr CLI, run tests with Dapr sidecars, and deploy to AKS or any Kubernetes cluster. Azure's service connections and environments provide secure credential management.

## Pipeline YAML Structure

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
    - main
    - develop

pr:
  branches:
    include:
    - main

variables:
  daprVersion: '1.13.0'
  imageRepository: 'order-service'
  containerRegistry: 'myacr.azurecr.io'
  dockerfilePath: 'Dockerfile'
  tag: '$(Build.BuildId)'
  vmImageName: 'ubuntu-latest'

stages:
- stage: Test
  displayName: Test Stage
  jobs:
  - job: UnitTest
    displayName: Unit Tests
    pool:
      vmImage: $(vmImageName)
    steps:
    - task: UsePythonVersion@0
      inputs:
        versionSpec: '3.11'
    - script: |
        pip install -r requirements.txt -r requirements-dev.txt
        pytest tests/unit/ -v --junitxml=$(Agent.TempDirectory)/unit-test-results.xml
      displayName: Run unit tests
    - task: PublishTestResults@2
      inputs:
        testResultsFiles: '$(Agent.TempDirectory)/unit-test-results.xml'
        testRunTitle: 'Unit Tests'
```

## Dapr Integration Tests Stage

```yaml
  - job: IntegrationTest
    displayName: Dapr Integration Tests
    pool:
      vmImage: $(vmImageName)
    steps:
    - script: |
        wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
        echo "##vso[task.prependpath]/usr/local/bin"
      displayName: Install Dapr CLI

    - script: dapr init --runtime-version $(daprVersion)
      displayName: Initialize Dapr

    - script: |
        pip install -r requirements.txt
        dapr run --app-id test-subscriber --app-port 5001 \
          --resources-path ./components/local \
          -- python subscriber.py &
        sleep 3
        pytest tests/integration/ -v --junitxml=$(Agent.TempDirectory)/integration-results.xml
      displayName: Run integration tests

    - task: PublishTestResults@2
      inputs:
        testResultsFiles: '$(Agent.TempDirectory)/integration-results.xml'
        testRunTitle: 'Integration Tests'
```

## Build and Push Image Stage

```yaml
- stage: Build
  displayName: Build and Push
  dependsOn: Test
  jobs:
  - job: BuildImage
    pool:
      vmImage: $(vmImageName)
    steps:
    - task: Docker@2
      displayName: Build and push image
      inputs:
        command: buildAndPush
        repository: $(imageRepository)
        dockerfile: $(dockerfilePath)
        containerRegistry: 'myACRServiceConnection'
        tags: |
          $(tag)
          latest
```

## Deploy to AKS Stage

```yaml
- stage: DeployStaging
  displayName: Deploy to Staging
  dependsOn: Build
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployDapr
    environment: 'staging'
    pool:
      vmImage: $(vmImageName)
    strategy:
      runOnce:
        deploy:
          steps:
          - checkout: self

          - task: KubernetesManifest@1
            displayName: Deploy Dapr components
            inputs:
              action: deploy
              connectionType: kubernetesServiceConnection
              kubernetesServiceConnection: 'staging-aks-connection'
              namespace: staging
              manifests: k8s/components/*.yaml

          - task: KubernetesManifest@1
            displayName: Deploy application
            inputs:
              action: deploy
              connectionType: kubernetesServiceConnection
              kubernetesServiceConnection: 'staging-aks-connection'
              namespace: staging
              manifests: k8s/base/*.yaml
              containers: $(containerRegistry)/$(imageRepository):$(tag)
```

## Summary

Azure DevOps Pipelines supports Dapr application workflows through multi-stage YAML pipelines. Use the Dapr CLI in hosted agents for integration testing, Azure Container Registry for image storage, and the KubernetesManifest task to deploy both Dapr components and application manifests. Use Azure Environments with approval gates for production deployments.
