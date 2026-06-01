# Validation Summary: How to Build Azure DevOps Pipelines for Terraform Plan and Apply

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DevOps Pipelines
- Azure DevOps environments, approvals, and checks
- Azure Pipeline artifacts
- Microsoft DevLabs Terraform Azure Pipelines tasks
- Terraform CLI
- AzureRM Terraform backend

## Sources Consulted
- Azure Pipelines publish and download pipeline artifacts documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/publish-pipeline-artifact
- Azure Pipelines approvals and checks documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals
- Azure Pipelines environments documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments
- Microsoft DevLabs TerraformTaskV4 README: https://github.com/microsoft/azure-pipelines-terraform/blob/main/Tasks/TerraformTask/TerraformTaskV4/README.md
- Microsoft DevLabs TerraformTaskV4 task definition: https://github.com/microsoft/azure-pipelines-terraform/blob/main/Tasks/TerraformTask/TerraformTaskV4/task.json
- Microsoft DevLabs TerraformInstallerV1 task definition: https://github.com/microsoft/azure-pipelines-terraform/blob/main/Tasks/TerraformInstaller/TerraformInstallerV1/task.json
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform saved plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform install documentation: https://developer.hashicorp.com/terraform/install

## Issues Found
- The pipeline pinned Terraform `1.7.0`, which is outdated as of the 2026-06-01 review. Updated the example to `1.15.5`, the current version shown in HashiCorp's install documentation during validation.
- The saved-plan explanation implied Terraform will refuse a saved plan whenever real-world infrastructure has drifted. Terraform stale-plan rejection is tied to the saved plan's state snapshot changing, usually because another Terraform run updated state. Updated the wording to distinguish Terraform state changes from out-of-band portal changes, which may require a fresh plan or fail during apply.

## Review Notes
The Azure DevOps YAML structure, `TerraformInstaller@1` input, `TerraformTaskV4@4` task inputs, `publish`/`download` artifact usage, deployment job environment approval pattern, and Terraform `plan -out` / `apply <plan file>` workflow are consistent with the consulted documentation. Future revisions could warn that binary Terraform plan files can contain sensitive values and should be protected as pipeline artifacts.
