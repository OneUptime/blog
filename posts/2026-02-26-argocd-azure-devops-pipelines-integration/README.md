# How to Integrate ArgoCD with Azure DevOps Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure DevOps, CI/CD

Description: Learn how to integrate ArgoCD with Azure DevOps Pipelines for GitOps-based Kubernetes deployments, including YAML pipeline examples, ACR integration, and multi-stage promotion workflows.

---

Azure DevOps Pipelines is the CI/CD platform of choice for many enterprises running on Azure. Integrating it with ArgoCD creates a GitOps workflow where Azure Pipelines handles building and testing while ArgoCD manages deployments to AKS or any Kubernetes cluster. This guide covers the full integration, from basic image tag updates to multi-stage pipelines with approval gates.

## Azure DevOps and ArgoCD Architecture

```mermaid
flowchart LR
    A[Azure Repos Push] --> B[Azure Pipeline]
    B --> C[Build & Test]
    C --> D[Push to ACR]
    D --> E[Update Git Manifests]
    E --> F[ArgoCD Detects Change]
    F --> G[Deploy to AKS]
```

Azure Pipelines builds the container image and pushes it to Azure Container Registry (ACR). Then it updates the deployment manifests in a Git repository. ArgoCD watches that repository and deploys changes to the Kubernetes cluster.

## Setting Up Pipeline Variables

First, configure the required variables in your Azure DevOps project:

1. Go to **Pipelines > Library > Variable Groups**
2. Create a variable group named `argocd-credentials`:

| Variable | Value | Secret |
|----------|-------|--------|
| `ARGOCD_SERVER` | argocd.example.com | No |
| `ARGOCD_TOKEN` | (API token) | Yes |
| `DEPLOY_PAT` | (Personal Access Token for deployment repo) | Yes |

3. Create another group for `acr-credentials`:

| Variable | Value | Secret |
|----------|-------|--------|
| `ACR_NAME` | myacr.azurecr.io | No |
| `ACR_USERNAME` | (service principal client ID) | No |
| `ACR_PASSWORD` | (service principal password) | Yes |

## Pattern 1: Basic Image Tag Update Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

variables:
  - group: argocd-credentials
  - group: acr-credentials
  - name: imageName
    value: 'myacr.azurecr.io/my-app'
  - name: imageTag
    value: '$(Build.SourceVersion)'
  - name: deployRepo
    value: 'https://dev.azure.com/myorg/myproject/_git/k8s-manifests'

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    displayName: 'Build and Push'
    jobs:
      - job: BuildImage
        steps:
          - task: Docker@2
            displayName: 'Login to ACR'
            inputs:
              command: login
              containerRegistry: 'acr-service-connection'

          - task: Docker@2
            displayName: 'Build and Push Image'
            inputs:
              command: buildAndPush
              repository: 'my-app'
              dockerfile: 'Dockerfile'
              containerRegistry: 'acr-service-connection'
              tags: |
                $(imageTag)
                latest

  - stage: UpdateManifests
    displayName: 'Update Deployment Manifests'
    dependsOn: Build
    jobs:
      - job: UpdateGit
        steps:
          - checkout: none

          - script: |
              # Install kustomize
              curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin

              # Clone deployment repo using PAT
              git clone https://deploy-bot:$(DEPLOY_PAT)@dev.azure.com/myorg/myproject/_git/k8s-manifests
              cd k8s-manifests/apps/my-app/production

              # Update image tag
              kustomize edit set image $(imageName)=$(imageName):$(imageTag)

              # Commit and push
              git config user.name "Azure DevOps Pipeline"
              git config user.email "pipeline@dev.azure.com"
              git add .
              git commit -m "Deploy my-app:$(imageTag) from Azure Pipeline $(Build.BuildNumber)"
              git push
            displayName: 'Update manifests in deployment repo'
```

## Pattern 2: Sync and Verify with ArgoCD CLI

```yaml
# azure-pipelines.yml
stages:
  - stage: Build
    # ... build stage as above ...

  - stage: Deploy
    displayName: 'Deploy and Verify'
    dependsOn: Build
    jobs:
      - job: DeployToArgoCD
        steps:
          - script: |
              # Install ArgoCD CLI
              curl -sSL -o /usr/local/bin/argocd \
                https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
              chmod +x /usr/local/bin/argocd
            displayName: 'Install ArgoCD CLI'

          - script: |
              # Login to ArgoCD
              argocd login $(ARGOCD_SERVER) \
                --auth-token $(ARGOCD_TOKEN) \
                --grpc-web
            displayName: 'Login to ArgoCD'

          - script: |
              # Refresh to detect latest Git changes
              argocd app get my-app --refresh --grpc-web

              # Trigger sync
              argocd app sync my-app --grpc-web

              # Wait for completion
              argocd app wait my-app \
                --sync --health \
                --timeout 300 \
                --grpc-web
            displayName: 'Sync and wait for ArgoCD'

          - script: |
              # Verify deployment
              HEALTH=$(argocd app get my-app -o json --grpc-web | jq -r '.status.health.status')
              SYNC=$(argocd app get my-app -o json --grpc-web | jq -r '.status.sync.status')

              echo "##vso[task.setvariable variable=appHealth]$HEALTH"
              echo "##vso[task.setvariable variable=appSync]$SYNC"

              echo "Health: $HEALTH"
              echo "Sync: $SYNC"

              if [ "$HEALTH" != "Healthy" ] || [ "$SYNC" != "Synced" ]; then
                echo "##vso[task.logissue type=error]Deployment verification failed!"
                exit 1
              fi
            displayName: 'Verify deployment health'
```

## Pattern 3: Multi-Stage Pipeline with Environments

Azure DevOps Environments provide built-in approval gates:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

variables:
  - group: argocd-credentials
  - name: imageName
    value: 'myacr.azurecr.io/my-app'
  - name: imageTag
    value: '$(Build.SourceVersion)'

stages:
  - stage: Build
    displayName: 'Build'
    jobs:
      - job: BuildAndPush
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: Docker@2
            inputs:
              command: buildAndPush
              repository: 'my-app'
              containerRegistry: 'acr-service-connection'
              tags: $(imageTag)

  - stage: DeployStaging
    displayName: 'Deploy to Staging'
    dependsOn: Build
    jobs:
      - deployment: DeployStaging
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    # Install tools
                    curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin
                    curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                    chmod +x /usr/local/bin/argocd

                    # Update staging manifests
                    git clone https://deploy-bot:$(DEPLOY_PAT)@dev.azure.com/myorg/myproject/_git/k8s-manifests
                    cd k8s-manifests/apps/my-app/staging
                    kustomize edit set image $(imageName)=$(imageName):$(imageTag)
                    git config user.name "Azure Pipeline"
                    git config user.email "pipeline@dev.azure.com"
                    git add .
                    git commit -m "Deploy $(imageTag) to staging"
                    git push

                    # Sync with ArgoCD
                    argocd login $(ARGOCD_SERVER) --auth-token $(ARGOCD_TOKEN) --grpc-web
                    argocd app sync my-app-staging --grpc-web
                    argocd app wait my-app-staging --sync --health --timeout 300 --grpc-web
                  displayName: 'Deploy to staging'

  - stage: DeployProduction
    displayName: 'Deploy to Production'
    dependsOn: DeployStaging
    jobs:
      - deployment: DeployProduction
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'production'  # Requires approval
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin
                    curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                    chmod +x /usr/local/bin/argocd

                    # Update production manifests
                    git clone https://deploy-bot:$(DEPLOY_PAT)@dev.azure.com/myorg/myproject/_git/k8s-manifests
                    cd k8s-manifests/apps/my-app/production
                    kustomize edit set image $(imageName)=$(imageName):$(imageTag)
                    git config user.name "Azure Pipeline"
                    git config user.email "pipeline@dev.azure.com"
                    git add .
                    git commit -m "Deploy $(imageTag) to production"
                    git push

                    # Sync with ArgoCD
                    argocd login $(ARGOCD_SERVER) --auth-token $(ARGOCD_TOKEN) --grpc-web
                    argocd app sync my-app-production --grpc-web
                    argocd app wait my-app-production --sync --health --timeout 300 --grpc-web
                  displayName: 'Deploy to production'
```

Configure the `production` environment in Azure DevOps to require approvals:

1. Go to **Pipelines > Environments**
2. Select the `production` environment
3. Click **Approvals and checks**
4. Add required approvers

## Pattern 4: Using Azure Container Registry with ArgoCD

If ArgoCD pulls Helm charts from ACR, configure the OCI registry credentials:

```yaml
# In ArgoCD, add ACR as a Helm repository
apiVersion: v1
kind: Secret
metadata:
  name: acr-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: myacr
  url: myacr.azurecr.io
  enableOCI: "true"
  username: <service-principal-id>
  password: <service-principal-password>
```

## Pattern 5: Azure DevOps Pipeline Templates

Create reusable templates for ArgoCD operations:

```yaml
# templates/argocd-deploy.yml
parameters:
  - name: appName
    type: string
  - name: environment
    type: string
  - name: imageName
    type: string
  - name: imageTag
    type: string
  - name: deployPath
    type: string
  - name: timeout
    type: number
    default: 300

steps:
  - script: |
      # Install tools
      curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin
      curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
      chmod +x /usr/local/bin/argocd
    displayName: 'Install tools'

  - script: |
      git clone https://deploy-bot:$(DEPLOY_PAT)@dev.azure.com/myorg/myproject/_git/k8s-manifests
      cd k8s-manifests/${{ parameters.deployPath }}
      kustomize edit set image ${{ parameters.imageName }}=${{ parameters.imageName }}:${{ parameters.imageTag }}
      git config user.name "Azure Pipeline"
      git config user.email "pipeline@dev.azure.com"
      git add .
      git commit -m "Deploy ${{ parameters.imageTag }} to ${{ parameters.environment }}"
      git push
    displayName: 'Update ${{ parameters.environment }} manifests'

  - script: |
      argocd login $(ARGOCD_SERVER) --auth-token $(ARGOCD_TOKEN) --grpc-web
      argocd app sync ${{ parameters.appName }} --grpc-web
      argocd app wait ${{ parameters.appName }} --sync --health --timeout ${{ parameters.timeout }} --grpc-web
    displayName: 'Sync ${{ parameters.appName }}'
```

Use the template:

```yaml
# azure-pipelines.yml
stages:
  - stage: DeployStaging
    jobs:
      - deployment: Staging
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/argocd-deploy.yml
                  parameters:
                    appName: my-app-staging
                    environment: staging
                    imageName: myacr.azurecr.io/my-app
                    imageTag: $(Build.SourceVersion)
                    deployPath: apps/my-app/staging
```

## Configuring Azure DevOps Git Webhook for ArgoCD

Speed up ArgoCD sync detection by configuring a webhook from Azure Repos:

1. In Azure DevOps, go to **Project Settings > Service Hooks**
2. Create a new subscription
3. Select **Web Hooks** as the service
4. Select **Code pushed** as the trigger
5. Set the URL to `https://argocd.example.com/api/webhook`
6. Configure the webhook secret to match `argocd-secret`

## Security Best Practices

**Use Service Connections**: Create Azure DevOps service connections for ACR and AKS instead of storing raw credentials.

**Variable Groups with Azure Key Vault**: Link variable groups to Azure Key Vault for automatic secret rotation:

```yaml
variables:
  - group: argocd-keyvault-secrets  # Linked to Azure Key Vault
```

**Restrict pipeline access**: Use Azure DevOps branch policies to require pull request reviews before merging to main.

**Managed identities**: When running self-hosted agents in Azure, use managed identities instead of service principal credentials.

## Troubleshooting

**Git push authentication failure**: Ensure the `DEPLOY_PAT` has Code Read & Write permissions for the deployment repository.

**ArgoCD CLI connection timeout**: Verify the ArgoCD server is reachable from Azure DevOps hosted agents. If using a private ArgoCD instance, use self-hosted agents.

**Pipeline stuck on environment approval**: Check that the required approvers have been notified and have access to the Azure DevOps project.

## Conclusion

Azure DevOps Pipelines and ArgoCD form a solid enterprise GitOps stack, especially for organizations already invested in the Azure ecosystem. The built-in environment approval gates, variable groups linked to Key Vault, and native ACR integration make it a natural fit. Start with the basic image tag update pattern and layer on sync verification and multi-stage promotions as your confidence grows. For integrations with other CI systems, check our guides on [GitHub Actions](https://oneuptime.com/blog/post/2026-02-26-argocd-github-actions-integration/view) and [GitLab CI](https://oneuptime.com/blog/post/2026-02-26-argocd-gitlab-cicd-integration/view).
