# How to Set Up OpenTofu with Azure DevOps Pipelines - Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure DevOps, CI/CD, Infrastructure as Code, Automation

Description: Learn how to integrate OpenTofu into Azure DevOps pipelines with plan/apply stages, environment gates, and service connection authentication.

## Introduction

Azure DevOps Pipelines integrates natively with OpenTofu using YAML pipeline definitions. This guide covers a multi-stage pipeline with plan, approval gate, and apply-using Azure Service Connection for authentication.

## azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - environments/production/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  tofu_version: '1.7.0'
  working_directory: 'environments/production'

stages:
  - stage: Plan
    jobs:
      - job: TofuPlan
        steps:
          - task: DownloadGitHubRelease@0
            inputs:
              connection: 'github-connection'
              userRepository: 'opentofu/opentofu'
              defaultVersionType: 'specificVersion'
              version: 'v$(tofu_version)'
              itemPattern: 'tofu_$(tofu_version)_linux_amd64.zip'
              downloadPath: '$(System.TempDirectory)'

          - script: |
              unzip $(System.TempDirectory)/tofu_$(tofu_version)_linux_amd64.zip -d /usr/local/bin
              chmod +x /usr/local/bin/tofu
            displayName: 'Install OpenTofu'

          - task: AzureCLI@2
            displayName: 'OpenTofu Init & Plan'
            inputs:
              azureSubscription: 'production-service-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              addSpnToEnvironment: true
              inlineScript: |
                export ARM_USE_OIDC=true
                export ARM_CLIENT_ID=$servicePrincipalId
                export ARM_TENANT_ID=$tenantId
                export ARM_OIDC_TOKEN=$idToken
                export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
                cd $(working_directory)
                tofu init -input=false
                tofu plan -out=tfplan -input=false -no-color 2>&1 | tee $(Build.ArtifactStagingDirectory)/plan.txt

          - publish: $(Build.ArtifactStagingDirectory)
            artifact: 'tfplan'
            displayName: 'Publish Plan Artefact'

  - stage: Apply
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: TofuApply
        environment: 'production'  # Environment with approval gate configured
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: 'tfplan'

                - task: AzureCLI@2
                  displayName: 'OpenTofu Apply'
                  inputs:
                    azureSubscription: 'production-service-connection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    addSpnToEnvironment: true
                    inlineScript: |
                      export ARM_USE_OIDC=true
                      export ARM_CLIENT_ID=$servicePrincipalId
                      export ARM_TENANT_ID=$tenantId
                      export ARM_OIDC_TOKEN=$idToken
                      export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
                      cd $(working_directory)
                      tofu init -input=false
                      tofu apply -input=false -auto-approve $(Pipeline.Workspace)/tfplan/tfplan
```

## Setting Up the Approval Gate

In Azure DevOps, navigate to **Pipelines > Environments > production** and add an approval. Designated approvers must approve the deployment before the Apply stage runs.

## Conclusion

Azure DevOps pipelines with environment-based approval gates provide a robust OpenTofu workflow. Use the AzureCLI task with OIDC authentication for zero-credential-storage deployments, and always archive the plan file as an artefact for auditability.
