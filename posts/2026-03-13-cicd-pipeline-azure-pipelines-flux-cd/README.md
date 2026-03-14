# How to Build a Complete CI/CD Pipeline with Azure Pipelines and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Azure Pipelines, Azure DevOps, CI/CD, GitOps, Kubernetes, AKS

Description: Learn how to combine Azure Pipelines for continuous integration with Flux CD for GitOps deployment to build a complete DevOps pipeline for AKS.

---

## Introduction

Azure Pipelines integrates naturally with Azure Container Registry, Azure Kubernetes Service, and Azure Repos, making it a popular choice for teams on the Azure platform. Combined with Flux CD running on AKS, you get a GitOps pipeline that leverages Azure's native identity and secret management systems while keeping cluster access out of your CI pipelines.

The key to this integration is Azure Workload Identity or a managed identity for Flux CD to pull images from ACR without static credentials. Azure Pipelines builds the image, pushes to ACR, updates the fleet repository tag, and Flux CD detects the change and reconciles it on AKS.

This guide covers setting up Azure Pipelines to work with Flux CD, using YAML pipelines, ACR, and Azure Repos or GitHub as the fleet repository.

## Prerequisites

- An AKS cluster with Flux CD bootstrapped
- Azure Container Registry (ACR) linked to AKS via managed identity or admin credentials
- Azure DevOps organization with a project and pipeline
- A fleet repository in Azure Repos or GitHub
- Azure CLI and `flux` CLI installed

## Step 1: Bootstrap Flux on AKS

```bash
# Using GitHub as the fleet repository
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/aks-production \
  --personal

# OR using Azure Repos
flux bootstrap git \
  --url=https://dev.azure.com/your-org/your-project/_git/fleet-repo \
  --branch=main \
  --path=clusters/aks-production \
  --username=git \
  --password=$AZURE_DEVOPS_PAT
```

## Step 2: Configure ACR Integration with AKS

Grant AKS kubelet managed identity pull access to ACR:

```bash
# Get the ACR resource ID
ACR_ID=$(az acr show --name yourregistry --resource-group your-rg --query id --output tsv)

# Attach ACR to AKS (grants AcrPull role)
az aks update --name your-aks --resource-group your-rg --attach-acr $ACR_ID
```

## Step 3: Define Flux Application Resources

```yaml
# clusters/aks-production/apps/myapp.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/fleet-repo
  ref:
    branch: main
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
```

## Step 4: Write the Azure Pipeline YAML

```yaml
# azure-pipelines.yml
trigger:
  tags:
    include:
      - 'v*'

pr: none

variables:
  acrName: 'yourregistry'
  imageName: 'myapp'
  imageTag: '$(Build.SourceBranchName)'
  fleetRepo: 'https://$(AZURE_DEVOPS_PAT)@github.com/your-org/fleet-repo.git'

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Test
    displayName: 'Run Tests'
    jobs:
      - job: Test
        steps:
          - checkout: self
          - script: make test
            displayName: 'Run unit tests'

  - stage: Build
    displayName: 'Build and Push Image'
    dependsOn: Test
    jobs:
      - job: BuildPush
        steps:
          - checkout: self

          - task: Docker@2
            displayName: 'Build and push to ACR'
            inputs:
              containerRegistry: 'acr-service-connection'
              repository: '$(imageName)'
              command: 'buildAndPush'
              Dockerfile: '**/Dockerfile'
              tags: |
                $(imageTag)
                latest

  - stage: UpdateFleet
    displayName: 'Update Fleet Repository'
    dependsOn: Build
    jobs:
      - job: UpdateFleet
        steps:
          - checkout: none

          - script: |
              git clone $(fleetRepo) fleet-repo
              cd fleet-repo
              git config user.email "azurepipelines@your-org.com"
              git config user.name "Azure Pipelines"
              sed -i "s|image: $(acrName).azurecr.io/$(imageName):.*|image: $(acrName).azurecr.io/$(imageName):$(imageTag)|" apps/myapp/deployment.yaml
              git add apps/myapp/deployment.yaml
              git commit -m "chore: update myapp to $(imageTag) [skip ci]"
              git push origin main
            displayName: 'Update image tag in fleet repo'
            env:
              AZURE_DEVOPS_PAT: $(AZURE_DEVOPS_PAT)
```

## Step 5: Configure Flux Image Policy for ACR

```yaml
# clusters/aks-production/apps/myapp-image.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: yourregistry.azurecr.io/myapp
  interval: 1m
  # AKS managed identity handles pull access; no secretRef needed
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 6: Verify the Deployment

```bash
# Check Flux reconciled the new tag
flux get kustomizations myapp -n flux-system

# Verify pod image version
kubectl describe deployment myapp -n myapp | grep Image

# View Flux events
flux events --for Kustomization/myapp -n flux-system
```

## Best Practices

- Use Azure Service Connections for ACR rather than embedding credentials in the pipeline YAML.
- Leverage Azure Managed Identity for Flux CD to authenticate to ACR on AKS; this eliminates static credentials entirely.
- Store the fleet repository PAT as a secret variable in Azure DevOps library and link it to the pipeline.
- Use Azure Pipeline environments with approval gates to require manual approval before updating the production fleet.
- Use `[skip ci]` in fleet repository commits to prevent re-triggering the pipeline on bot commits.
- Separate the fleet update stage into its own deployment job so it can be audited and rolled back independently.

## Conclusion

Azure Pipelines and Flux CD integrate well for AKS workloads, especially when combined with ACR and managed identity for secretless image pulling. Azure handles the enterprise-grade identity and compliance tooling, while Flux CD provides the GitOps reconciliation that keeps AKS clusters synchronized with declared state.
