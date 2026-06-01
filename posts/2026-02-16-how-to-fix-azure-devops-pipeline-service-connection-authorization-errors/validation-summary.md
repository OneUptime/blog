# Validation Summary: How to Fix Azure DevOps Pipeline Service Connection Authorization Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure DevOps Pipelines
- Azure DevOps service connections
- Azure Resource Manager service connections
- Microsoft Entra ID service principals
- Azure RBAC
- Azure CLI
- Workload identity federation
- Azure Pipelines YAML deployment jobs
- AzureCLI@2 and AzureWebApp@1 pipeline tasks

## Sources Consulted
- Microsoft Learn: Service connections in Azure Pipelines - https://learn.microsoft.com/en-gb/azure/devops/pipelines/library/service-endpoints?view=azure-devops
- Microsoft Learn: Connect to Azure with an Azure Resource Manager service connection - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure?view=azure-devops
- Microsoft Learn: Manually set an Azure Resource Manager workload identity service connection - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops
- Microsoft Learn: Troubleshoot an Azure Resource Manager workload identity service connection - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/troubleshoot-workload-identity?view=azure-devops
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Microsoft Learn: AzureWebApp@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1
- Microsoft Learn: Deployment job YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment?view=azure-pipelines
- Microsoft Learn: Define approvals and checks - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Microsoft Learn: Azure CLI az ad sp credential reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp/credential?view=azure-cli-latest
- Microsoft Learn: Reset service principal credentials using Azure CLI - https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-7?view=azure-cli-latest
- Microsoft Learn: Azure CLI az role assignment reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: Microsoft Entra authentication and authorization error codes - https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes
- Microsoft Learn: Troubleshoot Azure Resource Manager service connections - https://learn.microsoft.com/vsts/release/getting-started/azure-rm-endpoint

## Issues Found
- The post said YAML pipelines can authorize a service connection at the resource level in the pipeline definition and included a `resources: pipelines: []` example. Azure DevOps documentation states that YAML references the service connection by name, while pipeline authorization is granted from the failed run prompt or service connection security settings. I changed the wording and removed the misleading `resources` snippet.
- The expired credential command used `az ad app credential reset`. Microsoft documents `az ad sp credential reset` for resetting service principal credentials, and recommends querying the password value rather than exposing the whole JSON payload. I updated the command to use `az ad sp credential reset --query password --output tsv`.
- The Azure Resource Manager service connection description implied all ARM service connections use expiring service principal secrets or certificates. Current Azure DevOps documentation recommends workload identity federation and supports other authentication methods. I narrowed the statement to secret- or certificate-based service principal connections.
- The RBAC example claimed to list all role assignments but used `az role assignment list --assignee` without `--all`. Microsoft CLI documentation says `--all` is needed to include assignments below subscription scope. I added `--all`.
- The RBAC example already retrieved the service principal object ID but passed it with `--assignee`. Microsoft recommends `--assignee-object-id` with `--assignee-principal-type ServicePrincipal` when assigning roles by object ID. I updated the list and create commands accordingly.
- The multi-stage pipeline section implied service connections are authorized for environments. Azure Pipelines treats environments and service connections as separate protected resources with separate approvals, checks, and permissions. I corrected the explanation and YAML comments.

## Review Notes
The remaining task names and YAML input names (`AzureCLI@2`, `azureSubscription`, `scriptType`, `scriptLocation`, `inlineScript`, `AzureWebApp@1`, and `appName`) match current Microsoft task references. Workload identity federation is the current recommended authentication approach for new Azure Resource Manager service connections, but some Marketplace or custom tasks may still need compatibility checks.
