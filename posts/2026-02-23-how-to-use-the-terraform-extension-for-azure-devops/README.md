# How to Use the Terraform Extension for Azure DevOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure DevOps, CI/CD, Infrastructure as Code, DevOps, Azure, Extensions

Description: Install and configure the Terraform extension for Azure DevOps to use native Terraform tasks in your pipelines with built-in state management and provider authentication.

---

Azure DevOps has a Terraform extension published by Microsoft DevLabs that adds native Terraform tasks to your pipelines. Instead of running raw CLI commands in script tasks, you get purpose-built tasks for init, plan, validate, and apply with built-in authentication for Azure, AWS, and GCP providers. The extension also handles common pain points like passing plan files between stages and configuring backend authentication.

This post walks through installing the extension, configuring it, and building pipelines that take advantage of its features.

## Installing the Extension

The extension is available from the Azure DevOps Marketplace. An organization administrator needs to install it:

1. Go to the Azure DevOps Marketplace
2. Search for "Terraform" by Microsoft DevLabs
3. Click "Get it free"
4. Select your organization and click "Install"

Alternatively, install it via the CLI:

```bash
# Install the extension using Azure CLI
az devops extension install \
    --publisher-id "ms-devlabs" \
    --extension-id "custom-terraform-tasks" \
    --organization "https://dev.azure.com/myorg"
```

Once installed, the Terraform tasks appear in the pipeline task catalog for all projects in the organization.

## Setting Up Service Connections

The Terraform extension uses Azure DevOps service connections for provider authentication. Create a service connection for each cloud provider you use.

For Azure (most common):

1. Go to Project Settings, then Service connections
2. Click "New service connection"
3. Select "Azure Resource Manager"
4. Choose "Service principal (automatic)" for the simplest setup
5. Select your subscription and give it a name like "azure-terraform-prod"

For AWS:

1. Create a new service connection
2. Select "AWS" (requires the AWS Tools extension)
3. Enter your access key and secret key
4. Name it "aws-terraform-prod"

## Basic Pipeline with Terraform Tasks

Here is a pipeline using the extension's tasks:

```yaml
# azure-pipelines.yml
# Terraform pipeline using the DevLabs extension

trigger:
  branches:
    include:
      - main
  paths:
    include:
      - terraform/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  terraformVersion: '1.7.5'
  workingDirectory: '$(System.DefaultWorkingDirectory)/terraform'
  backendServiceArm: 'azure-terraform-prod'
  backendAzureRmResourceGroupName: 'rg-terraform-state'
  backendAzureRmStorageAccountName: 'tfstatemyorg'
  backendAzureRmContainerName: 'tfstate'
  backendAzureRmKey: 'production.terraform.tfstate'

stages:
  - stage: Validate
    displayName: 'Validate Terraform'
    jobs:
      - job: Validate
        steps:
          # Install a specific Terraform version
          - task: TerraformInstaller@1
            displayName: 'Install Terraform'
            inputs:
              terraformVersion: $(terraformVersion)

          # Initialize Terraform
          - task: TerraformTaskV4@4
            displayName: 'Terraform Init'
            inputs:
              provider: 'azurerm'
              command: 'init'
              workingDirectory: $(workingDirectory)
              backendServiceArm: $(backendServiceArm)
              backendAzureRmResourceGroupName: $(backendAzureRmResourceGroupName)
              backendAzureRmStorageAccountName: $(backendAzureRmStorageAccountName)
              backendAzureRmContainerName: $(backendAzureRmContainerName)
              backendAzureRmKey: $(backendAzureRmKey)

          # Validate the configuration
          - task: TerraformTaskV4@4
            displayName: 'Terraform Validate'
            inputs:
              provider: 'azurerm'
              command: 'validate'
              workingDirectory: $(workingDirectory)

  - stage: Plan
    displayName: 'Terraform Plan'
    dependsOn: Validate
    jobs:
      - job: Plan
        steps:
          - task: TerraformInstaller@1
            displayName: 'Install Terraform'
            inputs:
              terraformVersion: $(terraformVersion)

          - task: TerraformTaskV4@4
            displayName: 'Terraform Init'
            inputs:
              provider: 'azurerm'
              command: 'init'
              workingDirectory: $(workingDirectory)
              backendServiceArm: $(backendServiceArm)
              backendAzureRmResourceGroupName: $(backendAzureRmResourceGroupName)
              backendAzureRmStorageAccountName: $(backendAzureRmStorageAccountName)
              backendAzureRmContainerName: $(backendAzureRmContainerName)
              backendAzureRmKey: $(backendAzureRmKey)

          # Plan with the service connection handling authentication
          - task: TerraformTaskV4@4
            displayName: 'Terraform Plan'
            inputs:
              provider: 'azurerm'
              command: 'plan'
              workingDirectory: $(workingDirectory)
              environmentServiceNameAzureRM: $(backendServiceArm)
              commandOptions: '-out=tfplan -var-file=production.tfvars'

          # Publish the plan file as a pipeline artifact
          - task: PublishPipelineArtifact@1
            displayName: 'Publish Plan'
            inputs:
              targetPath: '$(workingDirectory)/tfplan'
              artifactName: 'terraform-plan'

  - stage: Apply
    displayName: 'Terraform Apply'
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Apply
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self

                - task: TerraformInstaller@1
                  displayName: 'Install Terraform'
                  inputs:
                    terraformVersion: $(terraformVersion)

                # Download the plan artifact
                - task: DownloadPipelineArtifact@2
                  displayName: 'Download Plan'
                  inputs:
                    artifactName: 'terraform-plan'
                    targetPath: $(workingDirectory)

                - task: TerraformTaskV4@4
                  displayName: 'Terraform Init'
                  inputs:
                    provider: 'azurerm'
                    command: 'init'
                    workingDirectory: $(workingDirectory)
                    backendServiceArm: $(backendServiceArm)
                    backendAzureRmResourceGroupName: $(backendAzureRmResourceGroupName)
                    backendAzureRmStorageAccountName: $(backendAzureRmStorageAccountName)
                    backendAzureRmContainerName: $(backendAzureRmContainerName)
                    backendAzureRmKey: $(backendAzureRmKey)

                # Apply the exact plan that was reviewed
                - task: TerraformTaskV4@4
                  displayName: 'Terraform Apply'
                  inputs:
                    provider: 'azurerm'
                    command: 'apply'
                    workingDirectory: $(workingDirectory)
                    environmentServiceNameAzureRM: $(backendServiceArm)
                    commandOptions: 'tfplan'
```

## Key Extension Features

### Automatic Provider Authentication

The biggest advantage of the extension over raw script tasks is automatic authentication. When you specify a service connection, the extension sets the appropriate environment variables for the provider:

For Azure, it sets `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, and `ARM_TENANT_ID`.

For AWS, it sets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

This means you do not need to manually extract credentials from the service connection and pass them as environment variables.

### Terraform Installer Task

The `TerraformInstaller` task downloads and installs a specific version of Terraform on the agent:

```yaml
- task: TerraformInstaller@1
  inputs:
    terraformVersion: '1.7.5'
```

This ensures consistent versions across all pipeline runs regardless of what the agent has pre-installed.

### Output Variables

The extension can capture Terraform outputs as pipeline variables:

```yaml
- task: TerraformTaskV4@4
  name: terraformOutput
  displayName: 'Terraform Output'
  inputs:
    provider: 'azurerm'
    command: 'output'
    workingDirectory: $(workingDirectory)
    environmentServiceNameAzureRM: $(backendServiceArm)

# Use the output in a subsequent step
- script: |
    echo "VPC ID: $(terraformOutput.vpc_id)"
```

## Multi-Environment Pipeline

Here is a pattern for deploying across environments with the extension:

```yaml
# Template for a single environment
parameters:
  - name: environment
    type: string
  - name: serviceConnection
    type: string
  - name: stateKey
    type: string

stages:
  - stage: Plan_${{ parameters.environment }}
    displayName: 'Plan - ${{ parameters.environment }}'
    jobs:
      - job: Plan
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: '1.7.5'

          - task: TerraformTaskV4@4
            displayName: 'Init'
            inputs:
              provider: 'azurerm'
              command: 'init'
              workingDirectory: $(workingDirectory)
              backendServiceArm: ${{ parameters.serviceConnection }}
              backendAzureRmResourceGroupName: 'rg-terraform-state'
              backendAzureRmStorageAccountName: 'tfstatemyorg'
              backendAzureRmContainerName: 'tfstate'
              backendAzureRmKey: ${{ parameters.stateKey }}

          - task: TerraformTaskV4@4
            displayName: 'Plan'
            inputs:
              provider: 'azurerm'
              command: 'plan'
              workingDirectory: $(workingDirectory)
              environmentServiceNameAzureRM: ${{ parameters.serviceConnection }}
              commandOptions: '-out=tfplan -var-file=environments/${{ parameters.environment }}.tfvars'

          - publish: $(workingDirectory)/tfplan
            artifact: plan-${{ parameters.environment }}

  - stage: Apply_${{ parameters.environment }}
    displayName: 'Apply - ${{ parameters.environment }}'
    dependsOn: Plan_${{ parameters.environment }}
    jobs:
      - deployment: Apply
        environment: ${{ parameters.environment }}
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: TerraformInstaller@1
                  inputs:
                    terraformVersion: '1.7.5'
                - download: current
                  artifact: plan-${{ parameters.environment }}
                  path: $(workingDirectory)
                - task: TerraformTaskV4@4
                  displayName: 'Init'
                  inputs:
                    provider: 'azurerm'
                    command: 'init'
                    workingDirectory: $(workingDirectory)
                    backendServiceArm: ${{ parameters.serviceConnection }}
                    backendAzureRmResourceGroupName: 'rg-terraform-state'
                    backendAzureRmStorageAccountName: 'tfstatemyorg'
                    backendAzureRmContainerName: 'tfstate'
                    backendAzureRmKey: ${{ parameters.stateKey }}
                - task: TerraformTaskV4@4
                  displayName: 'Apply'
                  inputs:
                    provider: 'azurerm'
                    command: 'apply'
                    workingDirectory: $(workingDirectory)
                    environmentServiceNameAzureRM: ${{ parameters.serviceConnection }}
                    commandOptions: 'tfplan'
```

## Troubleshooting Common Issues

**Issue: "The term 'terraform' is not recognized"**
The `TerraformInstaller` task must run before any `TerraformTaskV4` task in the same job. If you are using a deployment job, make sure the installer step is inside the deployment strategy.

**Issue: "Error acquiring the state lock"**
A previous pipeline run was cancelled or failed mid-operation. Use `terraform force-unlock` in a manual pipeline step to release the lock.

**Issue: Service connection permissions**
The service principal behind the service connection needs the right permissions. For Azure, it typically needs Contributor on the target subscription and Storage Blob Data Contributor on the state storage account.

## Conclusion

The Terraform extension for Azure DevOps simplifies pipeline configuration by handling provider authentication and providing purpose-built tasks for each Terraform command. The installer task ensures version consistency, and the automatic credential management means you do not need to manually wire up environment variables. For teams already invested in the Azure DevOps ecosystem, the extension is the most natural way to integrate Terraform into your pipelines.

For more on Azure DevOps and Terraform, see our guide on [building Azure DevOps pipelines for Terraform](https://oneuptime.com/blog/post/2026-02-16-how-to-build-azure-devops-pipelines-for-terraform-plan-and-apply-with-approval-gates/view).
