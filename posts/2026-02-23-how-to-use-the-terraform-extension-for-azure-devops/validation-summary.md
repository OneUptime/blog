# Validation Summary: How to Use the Terraform Extension for Azure DevOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Azure DevOps Pipelines
- Azure DevOps Marketplace extensions
- Microsoft DevLabs Terraform extension
- Azure Resource Manager service connections
- AWS for Terraform service connections
- Pipeline artifacts

## Sources Consulted
- Microsoft DevLabs Terraform extension on Visual Studio Marketplace: https://marketplace.visualstudio.com/items?itemName=ms-devlabs.custom-terraform-tasks
- Microsoft azure-pipelines-terraform task definition for TerraformTask@5: https://raw.githubusercontent.com/microsoft/azure-pipelines-terraform/main/Tasks/TerraformTask/TerraformTaskV5/task.json
- Microsoft azure-pipelines-terraform task definition for TerraformTaskV4@4: https://raw.githubusercontent.com/microsoft/azure-pipelines-terraform/main/Tasks/TerraformTask/TerraformTaskV4/task.json
- Azure CLI `az devops extension` reference: https://learn.microsoft.com/en-us/cli/azure/devops/extension?view=azure-cli-latest
- Azure DevOps Blog: Introduction to Azure DevOps Workload identity federation with Terraform: https://devblogs.microsoft.com/devops/introduction-to-azure-devops-workload-identity-federation-oidc-with-terraform/
- Microsoft Learn: Set a Resource Manager workload identity service connection: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops

## Issues Found
- Updated the Terraform task examples from `TerraformTaskV4@4` to the current Marketplace-documented `TerraformTask@5`. The extension now documents version 5 examples while retaining the same core input names used by the post.
- Corrected the provider support description to include OCI, which is listed by the current Microsoft DevLabs Marketplace page and task definition.
- Reworded the plan-file claim so it does not imply the extension automatically transfers binary plan files between stages. The examples correctly use Azure Pipeline artifacts for that.
- Updated Azure service connection guidance from client-secret service principal setup to workload identity federation, matching current Azure DevOps guidance and Terraform task examples.
- Corrected the AWS service connection instructions. The DevLabs Terraform extension provides an `AWS for Terraform` service connection and asks for access key, secret key, and region; it does not require the AWS Tools extension for that connection type.
- Corrected the Azure authentication explanation to account for workload identity federation. Depending on the service connection, the task may use OIDC token-based authentication rather than `ARM_CLIENT_SECRET`.
- Corrected the Terraform output example. The task exposes `jsonOutputVariablesPath` for `terraform output`; it does not directly create variables in the form `$(terraformOutput.vpc_id)`.
- Updated troubleshooting text from `TerraformTaskV4` to `TerraformTask`.
- Reworded the service connection permissions note from "service principal" to "identity" to cover workload identity federation and managed identity setups.

## Review Notes
The examples still pin Terraform CLI `1.7.5`, which is syntactically valid for the task but no longer a current Terraform release as of this review date. Future updates could choose a newer pinned version after testing the repository's Terraform configuration and provider constraints.
