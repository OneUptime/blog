# Validation Summary: How to Use Variable Groups and Secret Variables in Azure Pipelines YAML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines
- Azure DevOps variable groups
- Azure Pipelines YAML
- Azure Pipelines secret variables
- Azure Key Vault integration
- Azure Pipelines output variables
- .NET SDK setup with UseDotNet@2

## Sources Consulted
- Microsoft Learn: Define variables - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/variables?tabs=yaml%2Cbatch&view=azure-devops
- Microsoft Learn: Manage variable groups - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?tabs=yaml&view=azure-devops-2022
- Microsoft Learn: variables.group definition: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/variables-group?view=azure-pipelines
- Microsoft Learn: Link a variable group to secrets in Azure Key Vault: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/link-variable-groups-to-key-vaults?view=azure-devops
- Microsoft Learn: Set secret variables - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables?tabs=classic%2Cbash&view=azure-devops
- Microsoft Learn: Use Azure Key Vault secrets in Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/azure-key-vault?view=azure-devops
- Microsoft Learn: AzureKeyVault@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-key-vault-v2?view=azure-pipelines
- Microsoft Learn: Expressions - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/expressions?view=azure-devops-2022
- Microsoft Learn: Template expressions - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/template-expressions?view=azure-devops
- Microsoft Learn: Set variables in scripts - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-variables-scripts?view=azure-devops
- Microsoft Learn: Pipeline deployment approvals and checks: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Microsoft Learn: UseDotNet@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/use-dotnet-v2?view=azure-pipelines

## Issues Found
- The `UseDotNet@2` example used `8.0`, but the task version input expects formats such as `major.x`, `major.minor.x`, or a full patch version. Changed it to `8.0.x`.
- The Azure Key Vault linked variable group example also included an `AzureKeyVault@2` task, which describes a separate direct-fetch pattern rather than using the linked variable group. Removed the task from that example so the snippet matches the surrounding explanation.
- The Key Vault note implied Azure Pipelines automatically converts hyphenated secret names to underscore environment variable names. Clarified that `$(db-password)` is the pipeline variable reference and the `env` block maps it to a shell-friendly name such as `DB_PASSWORD`.
- The variable precedence order was incorrect for YAML variables. Updated it to Microsoft Learn's documented order: job-level YAML, stage-level YAML, pipeline-level YAML, queue-time variables, then pipeline settings UI variables.
- The post described `$()` as a runtime expression. Microsoft documents `$()` as macro syntax, while `$[ ]` is runtime expression syntax. Updated the relevant explanation and secret-variable wording.
- The security best-practice section said not to use secret variables in conditions or template expressions. The supported documentation issue is template expressions, so the statement was narrowed to template expressions.

## Review Notes
The post is technically relevant and accurate after the corrections. Azure Pipelines also supports using `AzureKeyVault@2` directly without a linked variable group, but that is a separate pattern from the variable-group integration covered in the Key Vault section.
