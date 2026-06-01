# Validation Summary: How to Configure Azure Pipelines to Deploy Infrastructure and Application Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines tasks: DotNetCoreCLI@2, CopyFiles@2, PublishPipelineArtifact@1, DownloadPipelineArtifact@2, AzureCLI@2, AzureWebApp@1
- Azure CLI
- Azure Bicep
- Azure App Service on Linux
- Azure SQL Database
- Azure Storage
- Bash, curl, jq, and git

## Sources Consulted
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Microsoft Learn: AzureWebApp@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1
- Microsoft Learn: DotNetCoreCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2
- Microsoft Learn: CopyFiles@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/copy-files-v2
- Microsoft Learn: Publish and download pipeline artifacts - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts
- Microsoft Learn: Set variables in scripts - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-variables-scripts
- Microsoft Learn: Azure Pipelines expressions and dependencies - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/expressions
- Microsoft Learn: az deployment group reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: az webapp config appsettings reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Microsoft Learn: Use Bicep to manage secrets - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/scenarios-secrets
- Microsoft Learn: Bicep data types and secure parameters - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/data-types
- Microsoft Learn: Bicep outputs - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/outputs
- Microsoft Learn: Microsoft.Web/sites 2023-01-01 resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/sites
- Microsoft Learn: Microsoft.Sql/servers and databases 2023-05-01-preview resource references - https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/servers and https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/2023-05-01-preview/servers/databases
- Microsoft Learn: Microsoft.Storage/storageAccounts 2023-01-01 resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts

## Issues Found
- The post described the combined pipeline as an "atomic unit." Azure Pipelines stages provide ordering and dependency control, not transactional rollback across infrastructure and application deployments. I changed this to "one ordered pipeline run."
- The infrastructure example output a value named `sqlConnectionString` while the shown string did not include a valid SQL authentication mode or credentials. Returning a complete credential-bearing connection string as a Bicep output would also conflict with Azure guidance to avoid secret outputs. I changed the Bicep outputs to non-secret SQL server/database values and constructed the application setting from those outputs plus a secret pipeline variable.
- The Bicep `sqlAdminPassword` parameter was not marked secure. I added the `@secure()` decorator.
- The Azure CLI parameter-file example omitted the required `@` prefix for a JSON parameters file. I changed it to `--parameters @".../parameters.prod.json"` and passed the environment and SQL admin values explicitly.
- The smoke-test stage referenced outputs from `DeployInfrastructure` while only depending on `DeployApplication`. I added `DeployInfrastructure` as an explicit dependency so the stage can legally reference those outputs.
- The change-detection condition used the wrong stage-level output-variable context. I changed it to `dependencies.DetectChanges.outputs['Detect.changes.infraChanged']`, matching Azure Pipelines stage condition syntax.
- The `git diff HEAD~1 HEAD` example could fail on the first commit or with shallow checkout history. I added a full checkout and a fallback that treats both areas as changed when no parent commit is available.
- The path-based skip example did not address the fact that infrastructure outputs are unavailable when the infrastructure stage is skipped. I added a note that the application stage must look up existing names or use environment-specific variables in that case.

## Review Notes
The examples are technically consistent as snippets, but a production implementation should prefer Key Vault or managed identity for database access instead of SQL admin credentials in app settings. The post now mentions Key Vault and Azure Pipelines secret variables for secrets, but a full passwordless SQL setup would require additional Azure SQL identity and permissions configuration beyond the scope of this article.
