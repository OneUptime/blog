# How to Use HCP Terraform with Azure DevOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Azure DevOps, CI/CD, Automation, DevOps

Description: Learn how to integrate HCP Terraform with Azure DevOps pipelines for automated Terraform planning and deployment of infrastructure.

---

Azure DevOps is the go-to CI/CD platform for many enterprise teams, especially those heavily invested in the Microsoft ecosystem. Integrating HCP Terraform with Azure DevOps pipelines gives you a solid infrastructure deployment workflow - Azure DevOps handles the pipeline orchestration and approvals, while HCP Terraform manages state, remote execution, and policy enforcement.

This guide covers setting up the integration, building multi-stage pipelines, and implementing proper approvals and security controls.

## Integration Approaches

You have two main options:

1. **VCS-driven**: Connect your Azure DevOps repository directly to HCP Terraform
2. **Pipeline-driven**: Use Azure Pipelines to trigger HCP Terraform operations via CLI or API

The pipeline-driven approach is more common with Azure DevOps because it gives you full control over the workflow and integrates with Azure DevOps's rich approval system.

## Setting Up the Token

Store your HCP Terraform API token as a secret variable:

### Pipeline Variable Group

1. In Azure DevOps, go to **Pipelines** > **Library**
2. Click **+ Variable group**
3. Name it "Terraform Credentials"
4. Add variable: `TF_API_TOKEN` with your HCP Terraform token
5. Click the lock icon to make it a secret
6. Save

### Service Connection (Alternative)

For a more controlled approach, create a service connection:

1. Go to **Project Settings** > **Service connections**
2. Click **New service connection**
3. Select **Generic** (there is no native HCP Terraform connector)
4. Set:
   - Server URL: `https://app.terraform.io`
   - Username: (leave empty)
   - Password/Token Key: Your HCP Terraform API token
5. Name it "HCP Terraform"

## Basic Pipeline Configuration

### Terraform Configuration

```hcl
# infrastructure/main.tf
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "app-production"
    }
  }

  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

### Azure Pipeline YAML

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/*

pr:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: 'Terraform Credentials'
  - name: TF_IN_AUTOMATION
    value: 'true'
  - name: terraformVersion
    value: '1.7.0'
  - name: workingDirectory
    value: 'infrastructure'

stages:
  - stage: Validate
    displayName: 'Validate Terraform'
    jobs:
      - job: Validate
        displayName: 'Validate'
        steps:
          - task: TerraformInstaller@1
            displayName: 'Install Terraform'
            inputs:
              terraformVersion: $(terraformVersion)

          - script: |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$(TF_API_TOKEN)"
              }
              EOF
            displayName: 'Configure Terraform Credentials'

          - script: |
              terraform init -input=false
              terraform fmt -check -recursive
              terraform validate -no-color
            workingDirectory: $(workingDirectory)
            displayName: 'Terraform Init and Validate'

  - stage: Plan
    displayName: 'Terraform Plan'
    dependsOn: Validate
    jobs:
      - job: Plan
        displayName: 'Plan'
        steps:
          - task: TerraformInstaller@1
            displayName: 'Install Terraform'
            inputs:
              terraformVersion: $(terraformVersion)

          - script: |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$(TF_API_TOKEN)"
              }
              EOF
            displayName: 'Configure Terraform Credentials'

          - script: |
              terraform init -input=false
              terraform plan -no-color -input=false 2>&1 | tee $(Build.ArtifactStagingDirectory)/plan_output.txt
            workingDirectory: $(workingDirectory)
            displayName: 'Terraform Plan'

          - task: PublishBuildArtifacts@1
            displayName: 'Publish Plan Output'
            inputs:
              pathToPublish: $(Build.ArtifactStagingDirectory)/plan_output.txt
              artifactName: 'terraform-plan'

  - stage: Apply
    displayName: 'Terraform Apply'
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Apply
        displayName: 'Apply'
        environment: 'production'  # Uses Azure DevOps environment approval
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self

                - task: TerraformInstaller@1
                  displayName: 'Install Terraform'
                  inputs:
                    terraformVersion: $(terraformVersion)

                - script: |
                    cat > ~/.terraformrc << EOF
                    credentials "app.terraform.io" {
                      token = "$(TF_API_TOKEN)"
                    }
                    EOF
                  displayName: 'Configure Terraform Credentials'

                - script: |
                    terraform init -input=false
                    terraform apply -auto-approve -input=false -no-color
                  workingDirectory: $(workingDirectory)
                  displayName: 'Terraform Apply'
```

## Multi-Environment Pipeline

Deploy through environments with proper gates:

```yaml
# azure-pipelines.yml - Multi-environment
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: 'Terraform Credentials'
  - name: TF_IN_AUTOMATION
    value: 'true'
  - name: terraformVersion
    value: '1.7.0'

stages:
  # Staging
  - stage: PlanStaging
    displayName: 'Plan Staging'
    jobs:
      - job: Plan
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: $(terraformVersion)
          - script: |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$(TF_API_TOKEN)"
              }
              EOF
              cd infrastructure
              export TF_WORKSPACE="app-staging"
              terraform init -input=false
              terraform plan -no-color -input=false
            displayName: 'Plan Staging'

  - stage: ApplyStaging
    displayName: 'Apply Staging'
    dependsOn: PlanStaging
    jobs:
      - deployment: ApplyStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: TerraformInstaller@1
                  inputs:
                    terraformVersion: $(terraformVersion)
                - script: |
                    cat > ~/.terraformrc << EOF
                    credentials "app.terraform.io" {
                      token = "$(TF_API_TOKEN)"
                    }
                    EOF
                    cd infrastructure
                    export TF_WORKSPACE="app-staging"
                    terraform init -input=false
                    terraform apply -auto-approve -input=false
                  displayName: 'Apply Staging'

  # Production
  - stage: PlanProduction
    displayName: 'Plan Production'
    dependsOn: ApplyStaging
    jobs:
      - job: Plan
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: $(terraformVersion)
          - script: |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$(TF_API_TOKEN)"
              }
              EOF
              cd infrastructure
              export TF_WORKSPACE="app-production"
              terraform init -input=false
              terraform plan -no-color -input=false
            displayName: 'Plan Production'

  - stage: ApplyProduction
    displayName: 'Apply Production'
    dependsOn: PlanProduction
    jobs:
      - deployment: ApplyProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: TerraformInstaller@1
                  inputs:
                    terraformVersion: $(terraformVersion)
                - script: |
                    cat > ~/.terraformrc << EOF
                    credentials "app.terraform.io" {
                      token = "$(TF_API_TOKEN)"
                    }
                    EOF
                    cd infrastructure
                    export TF_WORKSPACE="app-production"
                    terraform init -input=false
                    terraform apply -auto-approve -input=false
                  displayName: 'Apply Production'
```

## Setting Up Environment Approvals

Azure DevOps environments provide approval gates:

1. Go to **Pipelines** > **Environments**
2. Create environments: `staging`, `production`
3. For `production`, click the three dots > **Approvals and checks**
4. Add **Approvals**:
   - Select the approvers
   - Set timeout (e.g., 72 hours)
   - Enable "Allow approvers to approve their own runs" (or not)

When the pipeline reaches the production stage, it will pause and wait for the designated approvers to approve.

## Using Azure Pipeline Templates

Create reusable templates for Terraform operations:

```yaml
# templates/terraform-plan.yml
parameters:
  - name: workspace
    type: string
  - name: workingDirectory
    type: string
    default: 'infrastructure'

steps:
  - task: TerraformInstaller@1
    displayName: 'Install Terraform'
    inputs:
      terraformVersion: '1.7.0'

  - script: |
      cat > ~/.terraformrc << EOF
      credentials "app.terraform.io" {
        token = "$(TF_API_TOKEN)"
      }
      EOF
    displayName: 'Configure Credentials'

  - script: |
      export TF_WORKSPACE="${{ parameters.workspace }}"
      terraform init -input=false
      terraform plan -no-color -input=false
    workingDirectory: ${{ parameters.workingDirectory }}
    displayName: 'Terraform Plan - ${{ parameters.workspace }}'
```

```yaml
# templates/terraform-apply.yml
parameters:
  - name: workspace
    type: string
  - name: workingDirectory
    type: string
    default: 'infrastructure'

steps:
  - checkout: self

  - task: TerraformInstaller@1
    displayName: 'Install Terraform'
    inputs:
      terraformVersion: '1.7.0'

  - script: |
      cat > ~/.terraformrc << EOF
      credentials "app.terraform.io" {
        token = "$(TF_API_TOKEN)"
      }
      EOF
    displayName: 'Configure Credentials'

  - script: |
      export TF_WORKSPACE="${{ parameters.workspace }}"
      terraform init -input=false
      terraform apply -auto-approve -input=false -no-color
    workingDirectory: ${{ parameters.workingDirectory }}
    displayName: 'Terraform Apply - ${{ parameters.workspace }}'
```

Use the templates in your pipeline:

```yaml
# azure-pipelines.yml - Using templates
stages:
  - stage: PlanStaging
    jobs:
      - job: Plan
        steps:
          - template: templates/terraform-plan.yml
            parameters:
              workspace: 'app-staging'

  - stage: ApplyStaging
    dependsOn: PlanStaging
    jobs:
      - deployment: Apply
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/terraform-apply.yml
                  parameters:
                    workspace: 'app-staging'
```

## Posting Plan Output to Pull Requests

Add plan output as a PR comment:

```yaml
- script: |
    cd infrastructure
    terraform plan -no-color -input=false 2>&1 | tee /tmp/plan.txt
  displayName: 'Terraform Plan'

- script: |
    PLAN_OUTPUT=$(cat /tmp/plan.txt | head -c 50000)

    # Use Azure DevOps REST API to post PR comment
    COMMENT_JSON=$(cat <<EOF
    {
      "comments": [
        {
          "parentCommentId": 0,
          "content": "## Terraform Plan\n\n\`\`\`\n${PLAN_OUTPUT}\n\`\`\`",
          "commentType": 1
        }
      ],
      "status": 1
    }
    EOF
    )

    curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $(System.AccessToken)" \
      -d "$COMMENT_JSON" \
      "$(System.CollectionUri)$(System.TeamProject)/_apis/git/repositories/$(Build.Repository.ID)/pullRequests/$(System.PullRequest.PullRequestId)/threads?api-version=7.0"
  displayName: 'Post Plan to PR'
  condition: eq(variables['Build.Reason'], 'PullRequest')
```

## Security Considerations

### Variable Groups with Azure Key Vault

Link your variable group to Azure Key Vault for better secret management:

1. Create a Key Vault secret for your TFC token
2. In **Pipelines** > **Library**, create a variable group linked to Key Vault
3. Map the secret to your pipeline variable

### Branch Policies

Configure branch policies to require successful builds:

1. Go to **Repos** > **Branches** > **main** branch policies
2. Enable **Build validation** - add your Terraform pipeline
3. This ensures every PR goes through a Terraform plan before merge

### Exclusive Lock

Prevent concurrent applies by using an exclusive lock:

```yaml
- deployment: Apply
  environment: 'production'
  strategy:
    runOnce:
      deploy:
        steps:
          # ... terraform apply
```

The `deployment` job type with an environment automatically provides an exclusive lock per environment.

## Troubleshooting

**"Error: No token found"**: Verify the variable group is linked to the pipeline and the variable name matches exactly. Check that the variable group scope includes the pipeline.

**Pipeline timeout**: Azure DevOps pipelines have a default timeout of 60 minutes. For large Terraform configurations, increase it:

```yaml
jobs:
  - job: Apply
    timeoutInMinutes: 120
```

**Terraform version mismatch**: The `TerraformInstaller` task downloads the specified version. Make sure it matches what your workspace expects.

**Permission denied on script**: Use `chmod +x` if running custom scripts, or use inline `script` tasks instead of `bash` tasks.

## Summary

Azure DevOps and HCP Terraform work well together for enterprise infrastructure pipelines. Use Azure DevOps environments with approval gates for production deploys, pipeline templates for reusable Terraform operations, and variable groups with Key Vault integration for secret management. The multi-stage pipeline pattern with staging before production is the standard approach that gives you both speed and safety.

For other CI/CD integrations, see our guides on [HCP Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-github-actions/view) and [HCP Terraform with GitLab CI](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-gitlab-ci/view).
