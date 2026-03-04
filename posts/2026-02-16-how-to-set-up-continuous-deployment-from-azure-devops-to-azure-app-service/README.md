# How to Set Up Continuous Deployment from Azure DevOps to Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Azure DevOps, CI/CD, Continuous Deployment, DevOps, Pipelines

Description: A complete guide to setting up automated continuous deployment pipelines from Azure DevOps to Azure App Service with build and release stages.

---

Deploying your application manually every time you merge a pull request gets old fast. Setting up continuous deployment from Azure DevOps to Azure App Service means that every code change goes through an automated build and release pipeline, landing in your staging or production environment without anyone clicking buttons.

This guide walks through setting up a complete CI/CD pipeline using Azure DevOps Pipelines and deploying to Azure App Service.

## Prerequisites

Before getting started, you need:

- An Azure subscription with an App Service already created
- An Azure DevOps organization and project
- Your application code in an Azure DevOps Git repository
- A service connection from Azure DevOps to your Azure subscription

## Setting Up the Service Connection

The service connection allows Azure DevOps to deploy to your Azure subscription. If you do not have one yet:

1. In Azure DevOps, go to Project Settings > Service connections
2. Click "New service connection"
3. Select "Azure Resource Manager"
4. Choose "Service principal (automatic)"
5. Select your subscription and resource group
6. Give it a name like "AzureSubscription" and save

This creates a service principal in Azure AD with contributor access to your resource group.

## Creating a Build Pipeline (CI)

Let us start with the continuous integration pipeline. This compiles your code, runs tests, and produces a deployable artifact.

Create a file called `azure-pipelines.yml` in the root of your repository. Here is a pipeline for a .NET application:

```yaml
# azure-pipelines.yml - CI pipeline for building and testing the app
trigger:
  branches:
    include:
      - main          # Trigger on pushes to main branch
  paths:
    exclude:
      - '*.md'        # Skip builds for markdown-only changes
      - 'docs/**'

pool:
  vmImage: 'ubuntu-latest'   # Use a Microsoft-hosted Ubuntu agent

variables:
  buildConfiguration: 'Release'
  dotnetVersion: '8.0.x'

stages:
  - stage: Build
    displayName: 'Build and Test'
    jobs:
      - job: BuildJob
        displayName: 'Build Application'
        steps:
          # Install the correct .NET SDK version
          - task: UseDotNet@2
            displayName: 'Install .NET SDK'
            inputs:
              packageType: 'sdk'
              version: '$(dotnetVersion)'

          # Restore NuGet packages
          - task: DotNetCoreCLI@2
            displayName: 'Restore packages'
            inputs:
              command: 'restore'
              projects: '**/*.csproj'

          # Build the application
          - task: DotNetCoreCLI@2
            displayName: 'Build application'
            inputs:
              command: 'build'
              projects: '**/*.csproj'
              arguments: '--configuration $(buildConfiguration) --no-restore'

          # Run unit tests
          - task: DotNetCoreCLI@2
            displayName: 'Run tests'
            inputs:
              command: 'test'
              projects: '**/*Tests.csproj'
              arguments: '--configuration $(buildConfiguration) --no-build'

          # Publish the application to a folder
          - task: DotNetCoreCLI@2
            displayName: 'Publish application'
            inputs:
              command: 'publish'
              projects: '**/MyApp.csproj'
              arguments: '--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)'
              zipAfterPublish: true

          # Upload the artifact for the release pipeline
          - task: PublishBuildArtifacts@1
            displayName: 'Publish artifact'
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)'
              ArtifactName: 'drop'
              publishLocation: 'Container'
```

For a Node.js application, the build steps would look different:

```yaml
# Build steps for a Node.js application
steps:
  - task: NodeTool@0
    displayName: 'Install Node.js'
    inputs:
      versionSpec: '20.x'

  # Install dependencies
  - script: npm ci
    displayName: 'Install dependencies'

  # Run tests
  - script: npm test
    displayName: 'Run tests'

  # Build the production bundle
  - script: npm run build
    displayName: 'Build application'

  # Archive the output into a ZIP file
  - task: ArchiveFiles@2
    displayName: 'Archive build output'
    inputs:
      rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
      includeRootFolder: false
      archiveType: 'zip'
      archiveFile: '$(Build.ArtifactStagingDirectory)/app.zip'

  - task: PublishBuildArtifacts@1
    displayName: 'Publish artifact'
    inputs:
      PathtoPublish: '$(Build.ArtifactStagingDirectory)'
      ArtifactName: 'drop'
```

## Adding the Deployment Stage (CD)

Now let us add a deployment stage to the same pipeline. This takes the artifact produced by the build stage and deploys it to Azure App Service.

```yaml
# Add this stage after the Build stage in your azure-pipelines.yml
  - stage: DeployStaging
    displayName: 'Deploy to Staging'
    dependsOn: Build                    # Only deploy after build succeeds
    condition: succeeded()
    jobs:
      - deployment: DeployToStaging
        displayName: 'Deploy to Staging Slot'
        environment: 'staging'          # Creates an environment for tracking
        strategy:
          runOnce:
            deploy:
              steps:
                # Download the build artifact
                - download: current
                  artifact: 'drop'

                # Deploy to the staging slot of the App Service
                - task: AzureWebApp@1
                  displayName: 'Deploy to Azure App Service'
                  inputs:
                    azureSubscription: 'AzureSubscription'
                    appType: 'webApp'
                    appName: 'my-app-service'
                    deployToSlotOrASE: true
                    resourceGroupName: 'my-resource-group'
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/drop/**/*.zip'

  - stage: DeployProduction
    displayName: 'Deploy to Production'
    dependsOn: DeployStaging
    condition: succeeded()
    jobs:
      - deployment: SwapToProduction
        displayName: 'Swap Staging to Production'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                # Swap the staging slot with production
                - task: AzureAppServiceManage@0
                  displayName: 'Swap staging to production'
                  inputs:
                    azureSubscription: 'AzureSubscription'
                    action: 'Swap Slots'
                    webAppName: 'my-app-service'
                    resourceGroupName: 'my-resource-group'
                    sourceSlot: 'staging'
```

This pipeline follows a common pattern: deploy to a staging slot first, verify it works, then swap staging to production. The swap is nearly instant and can be rolled back by swapping again.

## Adding Approval Gates

For production deployments, you probably want a manual approval step. Configure this in Azure DevOps:

1. Go to Pipelines > Environments
2. Click on your "production" environment
3. Click the three dots menu and select "Approvals and checks"
4. Add an "Approvals" check
5. Add the approvers (people or groups)

Now when the pipeline reaches the production stage, it pauses and waits for someone to approve before proceeding.

## Pipeline Flow Diagram

Here is what the complete pipeline looks like:

```mermaid
graph LR
    A[Code Push to Main] --> B[Build Stage]
    B --> C[Run Tests]
    C --> D[Publish Artifact]
    D --> E[Deploy to Staging Slot]
    E --> F[Manual Approval]
    F --> G[Swap Staging to Production]
```

## Using the Deployment Center

If you want a quicker setup without writing YAML, Azure App Service has a built-in Deployment Center:

1. Go to your App Service in the Azure Portal
2. Click "Deployment Center" in the left menu
3. Select "Azure DevOps" as the source
4. Select your organization, project, repository, and branch
5. Choose the build provider (Azure Pipelines)
6. Review and finish

This generates a pipeline YAML file and commits it to your repository. It is a decent starting point, though you will likely want to customize it.

## Environment Variables and App Settings

Your deployment pipeline often needs to set application configuration. You can do this as part of the deployment:

```yaml
# Update app settings during deployment
- task: AzureAppServiceSettings@1
  displayName: 'Configure app settings'
  inputs:
    azureSubscription: 'AzureSubscription'
    appName: 'my-app-service'
    resourceGroupName: 'my-resource-group'
    appSettings: |
      [
        {
          "name": "ASPNETCORE_ENVIRONMENT",
          "value": "Production",
          "slotSetting": false
        },
        {
          "name": "DatabaseConnection",
          "value": "$(DatabaseConnectionString)",
          "slotSetting": true
        }
      ]
```

Store sensitive values like connection strings as pipeline variables (mark them as secret) or use Azure Key Vault integration.

## Troubleshooting Common Issues

### Deployment Fails with Permission Error

Make sure your service connection has the right permissions. The service principal needs at least Contributor role on the App Service or its resource group.

### Build Succeeds but Deployment Times Out

Check your App Service logs. The deployment might be hanging on startup. Also verify that your App Service plan has enough resources for the deployment.

### Slot Swap Fails

Slot swaps can fail if the staging slot application cannot start successfully. Azure tests the staging slot before completing the swap. Check the staging slot logs for startup errors.

## Wrapping Up

Setting up CI/CD from Azure DevOps to Azure App Service is a one-time investment that pays off on every single deployment after that. Start with a simple pipeline that builds and deploys to a single environment, then add staging slots, approval gates, and automated tests as your team and application grow.

The YAML pipeline approach gives you version-controlled deployment configuration that lives alongside your code, which means your deployment process is reviewable, auditable, and reproducible.
