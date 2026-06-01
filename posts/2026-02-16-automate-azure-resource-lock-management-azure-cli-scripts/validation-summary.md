# Validation Summary: How to Automate Azure Resource Lock Management with Azure CLI Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Resource Manager resource locks
- Azure CLI
- Bash scripting
- Python JSON and CSV handling
- Azure DevOps YAML pipelines

## Sources Consulted
- Microsoft Learn: Lock your Azure resources to protect your infrastructure - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- Microsoft Learn: Azure CLI `az lock` reference - https://learn.microsoft.com/en-us/cli/azure/lock?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az resource list` reference - https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az sql server` reference - https://learn.microsoft.com/en-us/cli/azure/sql/server?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az sql db` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az keyvault` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage account` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: PublishBuildArtifacts@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-build-artifacts-v1?view=azure-pipelines

## Issues Found
- The audit script claimed to generate a report of all resource locks across the subscription, but it only wrote resource group-level locks and left the subscription-wide `az lock list` result unused. Updated the script to write the `az lock list` results to CSV and parse each lock scope from the lock resource ID.
- The audit CSV used plain `echo` output, which could produce invalid CSV when lock notes contain commas. Updated the report writer to use Python's `csv.writer`.
- The maintenance script used `set -e`, so a failing maintenance command could terminate the script before lock restoration. Wrapped the maintenance command with `set +e` and restored `set -e` after capturing the exit code.
- The maintenance script's restore loop did not fail if `az lock create` failed. Added `check=True` to the Python `subprocess.run` call.
- The maintenance section implied all locks inside a resource group were removed, while the script operates on resource group-level locks. Clarified the prose and comments.
- The Azure DevOps artifact publishing snippet used a wildcard path, but `PublishBuildArtifacts@1` does not support wildcards for `PathtoPublish`. Updated the audit script to write to a directory and changed the pipeline to publish that directory.
- The Azure DevOps snippet omitted the documented `scriptLocation` input for `AzureCLI@2` when using `scriptPath`. Added `scriptLocation: "scriptPath"`.

## Review Notes
The local environment did not have Azure CLI installed, so command verification was performed against Microsoft Learn CLI references rather than local `az --help` output.
