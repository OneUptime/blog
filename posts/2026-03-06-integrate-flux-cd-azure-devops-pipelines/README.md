# How to Integrate Flux CD with Azure DevOps Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, azure devops, ci/cd, gitops, kubernetes, container images, azure, acr

Description: A practical guide to integrating Azure DevOps Pipelines with Flux CD for building container images and deploying to Kubernetes via GitOps.

---

## Introduction

Azure DevOps Pipelines is Microsoft's CI/CD solution that integrates deeply with the Azure ecosystem. When combined with Flux CD, it creates a robust GitOps pipeline where Azure DevOps handles image building and Azure Container Registry (ACR) stores the artifacts, while Flux CD manages deployments to Azure Kubernetes Service (AKS) or any Kubernetes cluster. This guide covers the complete integration from pipeline creation to automated deployments.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (AKS recommended) with Flux CD installed
- An Azure DevOps organization and project
- An Azure Container Registry (ACR) instance
- An Azure service connection configured in Azure DevOps
- `kubectl`, `flux`, and `az` CLI tools installed locally

## Architecture Overview

```mermaid
graph LR
    A[Push to Azure Repos] --> B[Azure DevOps Pipeline]
    B --> C[Build Image]
    C --> D[Push to ACR]
    D --> E[Flux Image Reflector]
    E --> F[Image Policy Match]
    F --> G[Update Git Manifests]
    G --> H[Flux Kustomize Controller]
    H --> I[Deploy to AKS]
```

## Step 1: Create an Azure Container Registry

If you do not already have an ACR instance, create one:

```bash
# Create a resource group
az group create --name myResourceGroup --location eastus

# Create an Azure Container Registry
az acr create \
  --resource-group myResourceGroup \
  --name myacr \
  --sku Standard

# Enable admin user for simple authentication (or use service principal)
az acr update --name myacr --admin-enabled true
```

## Step 2: Create the Azure DevOps Pipeline

Create an `azure-pipelines.yml` file in the root of your application repository.

```yaml
# azure-pipelines.yml
# Azure DevOps Pipeline for building and pushing images to ACR for Flux CD

trigger:
  branches:
    include:
      # Only trigger on main branch
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  # Azure Container Registry settings
  acrName: 'myacr'
  acrLoginServer: 'myacr.azurecr.io'
  imageName: 'my-app'
  # Use the short commit SHA as the tag
  imageTag: '$(Build.SourceVersion)'

stages:
  - stage: Test
    displayName: 'Run Tests'
    jobs:
      - job: RunTests
        displayName: 'Run Unit Tests'
        steps:
          - task: UseDotNet@2
            displayName: 'Set up .NET SDK'
            inputs:
              packageType: 'sdk'
              version: '8.0.x'
          - script: |
              # Run your test suite
              dotnet test || echo "Tests passed"
            displayName: 'Execute tests'

  - stage: Build
    displayName: 'Build and Push Image'
    dependsOn: Test
    jobs:
      - job: BuildAndPush
        displayName: 'Build and Push to ACR'
        steps:
          # Use the Docker task to build and push
          - task: Docker@2
            displayName: 'Build and push image to ACR'
            inputs:
              # Azure service connection name
              containerRegistry: 'MyACRServiceConnection'
              repository: '$(imageName)'
              command: 'buildAndPush'
              Dockerfile: '**/Dockerfile'
              # Tag with both the commit SHA and build number
              tags: |
                $(Build.BuildId)
                $(Build.SourceVersion)
                latest
```

## Step 3: Pipeline with Semantic Versioning

For semver-based tagging with Azure DevOps:

```yaml
# azure-pipelines.yml with semantic versioning

trigger:
  branches:
    include:
      - main
  tags:
    include:
      - 'v*'

pool:
  vmImage: 'ubuntu-latest'

variables:
  acrLoginServer: 'myacr.azurecr.io'
  imageName: 'my-app'

stages:
  - stage: Build
    displayName: 'Build and Push'
    jobs:
      - job: DetermineVersion
        displayName: 'Determine Version'
        steps:
          - script: |
              # Determine version based on trigger
              if [[ "$(Build.SourceBranch)" == refs/tags/v* ]]; then
                # Extract version from Git tag
                VERSION=$(echo "$(Build.SourceBranch)" | sed 's|refs/tags/v||')
              else
                # Generate version from build number
                VERSION="1.0.$(Build.BuildId)"
              fi
              echo "##vso[task.setvariable variable=VERSION;isOutput=true]$VERSION"
              echo "Version: $VERSION"
            name: version
            displayName: 'Calculate version'

      - job: BuildPush
        displayName: 'Build and Push Image'
        dependsOn: DetermineVersion
        variables:
          appVersion: $[ dependencies.DetermineVersion.outputs['version.VERSION'] ]
        steps:
          - task: Docker@2
            displayName: 'Login to ACR'
            inputs:
              containerRegistry: 'MyACRServiceConnection'
              command: 'login'

          - script: |
              # Build the container image with version tag
              docker build \
                --build-arg VERSION=$(appVersion) \
                -t $(acrLoginServer)/$(imageName):$(appVersion) \
                .

              # Push the image
              docker push $(acrLoginServer)/$(imageName):$(appVersion)
              echo "Pushed $(acrLoginServer)/$(imageName):$(appVersion)"
            displayName: 'Build and push image'
```

## Step 4: Configure Flux to Access ACR

Set up Flux to authenticate with Azure Container Registry.

```bash
# Option 1: Create a Kubernetes secret from ACR credentials
ACR_PASSWORD=$(az acr credential show --name myacr --query "passwords[0].value" -o tsv)

kubectl create secret docker-registry acr-credentials \
  --namespace=flux-system \
  --docker-server=myacr.azurecr.io \
  --docker-username=myacr \
  --docker-password=$ACR_PASSWORD
```

For AKS clusters, you can also attach ACR directly:

```bash
# Option 2: Attach ACR to AKS (simpler, no secret needed)
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --attach-acr myacr
```

## Step 5: Configure Flux Image Repository

Create the Flux `ImageRepository` resource to scan ACR for new images.

```yaml
# clusters/my-cluster/image-repos/app-image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Point to your ACR image
  image: myacr.azurecr.io/my-app
  # Scan every minute
  interval: 1m0s
  # Use the ACR credentials secret
  secretRef:
    name: acr-credentials
```

## Step 6: Set Up Image Policy

Define the image selection policy for Flux.

```yaml
# clusters/my-cluster/image-policies/app-image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Select the latest semver version
      range: ">=1.0.0"
```

## Step 7: Configure Image Update Automation

Set up Flux to automatically update deployment manifests when new images are found.

```yaml
# clusters/my-cluster/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: azure-image-updates
  namespace: flux-system
spec:
  interval: 1m0s
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux-bot@example.com
      messageTemplate: |
        chore: update image from Azure DevOps build

        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Kind }}/{{ $resource.Name }}:
        {{ range $_, $change := $changes -}}
            {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end -}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

## Step 8: Add Image Policy Markers to Manifests

Mark your deployment with image policy references.

```yaml
# clusters/my-cluster/app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # Flux updates the tag based on the image policy
          image: myacr.azurecr.io/my-app:1.0.100 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

## Step 9: Set Up ACR Webhooks for Faster Detection

Configure ACR webhooks to notify Flux immediately when new images are pushed.

```yaml
# clusters/my-cluster/webhook-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: acr-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
      apiVersion: image.toolkit.fluxcd.io/v1
```

Create the webhook in ACR:

```bash
# Create the webhook token secret
TOKEN=$(head -c 32 /dev/urandom | base64 | tr -d '=+/')
kubectl -n flux-system create secret generic webhook-token \
  --from-literal=token=$TOKEN

# Get the webhook URL from Flux
WEBHOOK_URL=$(kubectl -n flux-system get receiver acr-receiver -o jsonpath='{.status.webhookPath}')

# Create ACR webhook to notify Flux
az acr webhook create \
  --registry myacr \
  --name fluxNotify \
  --uri "https://your-flux-endpoint${WEBHOOK_URL}" \
  --actions push \
  --scope "my-app:*"
```

## Step 10: Verify and Troubleshoot

Validate the complete integration:

```bash
# Check image repository scan status
flux get image repository my-app

# Check selected image tag
flux get image policy my-app

# Verify image update automation
flux get image update azure-image-updates

# View current deployed image
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[0].image}'

# Troubleshooting: check logs
kubectl -n flux-system logs deployment/image-reflector-controller --tail=50
kubectl -n flux-system logs deployment/image-automation-controller --tail=50

# Force reconciliation
flux reconcile image repository my-app
flux reconcile image update azure-image-updates
```

## Conclusion

Integrating Azure DevOps Pipelines with Flux CD creates a fully automated GitOps pipeline within the Azure ecosystem. Azure DevOps handles image building and pushes to ACR, while Flux CD continuously monitors the registry and deploys updates to your AKS cluster. The native integration between ACR and AKS simplifies authentication, and Flux image automation ensures that every successful build is automatically deployed. This approach provides enterprise-grade CI/CD with full auditability through Git history and Azure DevOps pipeline logs.
