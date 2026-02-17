# How to Migrate Azure DevOps Pipelines to Google Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Build, Azure DevOps, CI/CD, Pipelines, Cloud Migration

Description: A practical guide to converting Azure DevOps pipeline YAML definitions to Google Cloud Build configurations, covering build steps, triggers, variables, and deployment stages.

---

Azure DevOps Pipelines and Google Cloud Build are both CI/CD services, but they differ in how they handle pipeline definitions, agent management, and deployment orchestration. Azure DevOps uses a multi-stage YAML pipeline with jobs, stages, and steps. Cloud Build uses a simpler step-based model where each step is a container that runs a command.

This guide walks through the conversion process with real examples.

## Concept Mapping

| Azure DevOps | Google Cloud Build |
|-------------|-------------------|
| Pipeline | Cloud Build trigger + cloudbuild.yaml |
| Stage | Step groups (using waitFor) |
| Job | Steps |
| Step/Task | Build step (container) |
| Agent pool | Cloud Build worker pool |
| Variable groups | Substitutions |
| Service connections | Service accounts |
| Artifacts | Cloud Build artifacts / GCS |
| Environments (approvals) | Cloud Deploy |
| YAML templates | Cloud Build includes (not yet available - use scripts) |

## Step 1: Export Your Azure DevOps Pipeline

Grab your existing pipeline YAML and document the tasks used.

```bash
# List all pipelines in a project
az pipelines list \
  --organization https://dev.azure.com/my-org \
  --project my-project \
  --output table

# Get pipeline definition
az pipelines show \
  --id 123 \
  --organization https://dev.azure.com/my-org \
  --project my-project
```

Here is a typical Azure DevOps pipeline that we will convert:

```yaml
# Azure DevOps pipeline - azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    exclude:
      - README.md

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: production-vars
  - name: imageName
    value: 'my-app'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run lint
            displayName: 'Run linting'

          - script: npm test
            displayName: 'Run tests'

          - script: npm run build
            displayName: 'Build application'

          - task: Docker@2
            inputs:
              command: buildAndPush
              containerRegistry: 'my-acr-connection'
              repository: $(imageName)
              tags: $(Build.SourceVersion)

  - stage: Deploy
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployToProduction
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    kubectl set image deployment/my-app \
                      my-app=myacr.azurecr.io/$(imageName):$(Build.SourceVersion)
                  displayName: 'Deploy to AKS'
```

## Step 2: Convert to Cloud Build YAML

Here is the equivalent Cloud Build configuration:

```yaml
# Google Cloud Build - cloudbuild.yaml
steps:
  # Install dependencies
  - name: 'node:20'
    id: 'install'
    entrypoint: 'npm'
    args: ['ci']

  # Run linting
  - name: 'node:20'
    id: 'lint'
    entrypoint: 'npm'
    args: ['run', 'lint']
    waitFor: ['install']

  # Run tests
  - name: 'node:20'
    id: 'test'
    entrypoint: 'npm'
    args: ['run', 'test']
    waitFor: ['install']

  # Build application
  - name: 'node:20'
    id: 'build'
    entrypoint: 'npm'
    args: ['run', 'build']
    waitFor: ['lint', 'test']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'docker-build'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/${_IMAGE_NAME}:$COMMIT_SHA'
      - '.'
    waitFor: ['build']

  # Push Docker image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'docker-push'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/${_IMAGE_NAME}:$COMMIT_SHA'
    waitFor: ['docker-build']

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/kubectl'
    id: 'deploy'
    args:
      - 'set'
      - 'image'
      - 'deployment/my-app'
      - 'my-app=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/${_IMAGE_NAME}:$COMMIT_SHA'
    env:
      - 'CLOUDSDK_COMPUTE_REGION=us-central1'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-gke-cluster'
    waitFor: ['docker-push']

# Substitution variables (equivalent to Azure DevOps variables)
substitutions:
  _IMAGE_NAME: 'my-app'

options:
  logging: CLOUD_LOGGING_ONLY
```

## Step 3: Convert Variables and Secrets

Azure DevOps variable groups become Cloud Build substitutions and Secret Manager references.

```yaml
# Substitutions for non-sensitive values
substitutions:
  _DEPLOY_ENV: 'production'
  _REGION: 'us-central1'
  _CLUSTER: 'my-gke-cluster'

steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Access substitution variables
        echo "Deploying to ${_DEPLOY_ENV} in ${_REGION}"

        # Access secrets from Secret Manager
        export DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)
        npm run migrate

# Or use the availableSecrets syntax
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: 'DB_PASSWORD'

steps:
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Secret is available as environment variable
        echo "Running migrations..."
        npm run migrate
    secretEnv: ['DB_PASSWORD']
```

## Step 4: Convert Build Tasks

Common Azure DevOps tasks and their Cloud Build equivalents:

### DotNetCoreCLI Task

```yaml
# Azure DevOps
- task: DotNetCoreCLI@2
  inputs:
    command: 'build'
    projects: '**/*.csproj'

# Cloud Build
- name: 'mcr.microsoft.com/dotnet/sdk:8.0'
  entrypoint: 'dotnet'
  args: ['build', '--configuration', 'Release']
```

### PublishTestResults Task

```yaml
# Azure DevOps
- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '**/test-results.xml'

# Cloud Build - save test results to GCS for review
- name: 'node:20'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      npm test -- --reporter=junit --output=test-results.xml
      # Upload results to GCS
      gsutil cp test-results.xml gs://$PROJECT_ID-build-artifacts/$BUILD_ID/test-results.xml
```

### AzureWebApp Task

```yaml
# Azure DevOps - deploy to Azure App Service
- task: AzureWebApp@1
  inputs:
    azureSubscription: 'my-azure-sub'
    appName: 'my-web-app'

# Cloud Build - deploy to Cloud Run (equivalent)
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - 'run'
    - 'deploy'
    - 'my-web-app'
    - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA'
    - '--region=us-central1'
    - '--platform=managed'
```

## Step 5: Set Up Triggers

Convert Azure DevOps trigger configuration to Cloud Build triggers.

```bash
# Branch trigger (equivalent to trigger.branches.include)
gcloud builds triggers create github \
  --name=main-build \
  --repo-owner=my-org \
  --repo-name=my-app \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --substitutions=_DEPLOY_ENV=production

# PR trigger (equivalent to pr trigger)
gcloud builds triggers create github \
  --name=pr-validation \
  --repo-owner=my-org \
  --repo-name=my-app \
  --pull-request-pattern="^main$" \
  --build-config=cloudbuild-pr.yaml

# Tag trigger (equivalent to trigger.tags)
gcloud builds triggers create github \
  --name=release-build \
  --repo-owner=my-org \
  --repo-name=my-app \
  --tag-pattern="^v[0-9]+\\.[0-9]+\\.[0-9]+$" \
  --build-config=cloudbuild-release.yaml

# Path filter (equivalent to trigger.paths)
gcloud builds triggers create github \
  --name=main-build-filtered \
  --repo-owner=my-org \
  --repo-name=my-app \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --ignored-files="README.md,docs/**"
```

## Step 6: Handle Multi-Stage Deployments

Azure DevOps environments with approvals map to Cloud Deploy for managed deployment pipelines.

```bash
# Create a Cloud Deploy delivery pipeline
gcloud deploy delivery-pipelines create my-pipeline \
  --region=us-central1
```

Create a Cloud Deploy configuration:

```yaml
# clouddeploy.yaml - delivery pipeline definition
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-pipeline
serialPipeline:
  stages:
    - targetId: staging
    - targetId: production
      profiles: [production]
      strategy:
        canary:
          runtimeConfig:
            kubernetes:
              serviceNetworking:
                service: my-app
          canaryDeployment:
            percentages: [25, 50, 75]
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: staging
gke:
  cluster: projects/my-project/locations/us-central1/clusters/staging-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: production
requireApproval: true
gke:
  cluster: projects/my-project/locations/us-central1/clusters/production-cluster
```

## Step 7: Migrate Service Connections

Azure DevOps service connections become Cloud Build service accounts and IAM bindings.

```bash
# Grant the Cloud Build service account necessary permissions
PROJECT_NUM=$(gcloud projects describe my-project --format='value(projectNumber)')

# Permission to deploy to GKE
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/container.developer"

# Permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Permission to push to Artifact Registry
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

## Summary

The migration from Azure DevOps Pipelines to Cloud Build simplifies your pipeline structure - stages and jobs collapse into a flat list of steps with dependency management via waitFor. The biggest adjustment is moving from Azure DevOps' rich task marketplace to Cloud Build's container-based step model, where each step uses a Docker image. For deployment approvals and multi-environment rollouts, pair Cloud Build with Cloud Deploy. Start by converting your build pipeline first, validate it works, then tackle the deployment pipeline conversion.
