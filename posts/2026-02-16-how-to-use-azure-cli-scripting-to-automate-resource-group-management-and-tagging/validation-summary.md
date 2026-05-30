# Validation Summary: How to Use Azure CLI Scripting to Automate Resource Group Management and Tagging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure CLI
- Azure Resource Manager resource groups
- Azure resource tags
- Azure management locks
- Azure Pipelines AzureCLI@2 task
- Bash scripting
- JMESPath queries
- jq

## Sources Consulted
- Microsoft Learn: Azure CLI `az group` command reference: https://learn.microsoft.com/en-us/cli/azure/group
- Microsoft Learn: Azure CLI `az resource` command reference: https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: Azure CLI `az lock` command reference: https://learn.microsoft.com/en-us/cli/azure/lock
- Microsoft Learn: Use tags to organize Azure resources and management hierarchy: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources
- Microsoft Learn: Lock your Azure resources to protect your infrastructure: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- Microsoft Learn: AzureCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Microsoft Learn: Install Azure CLI on macOS: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos
- Microsoft Learn: Install Azure CLI on Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux

## Issues Found
- The macOS install command omitted the `brew update` step shown in the current Microsoft Learn Homebrew install example. Updated it to `brew update && brew install azure-cli`.
- The Linux install label implied the `InstallAzureCLIDeb` script was generic for all Linux distributions. Updated the label to Debian/Ubuntu Linux.
- The post claimed Azure CLI covers the full Azure API surface. That was too absolute, so it now says Azure CLI covers a broad Azure management surface.
- The tag propagation script stored resource IDs in a scalar string and counted with `wc -l`, which could miscount an empty result and was less robust. Updated it to use a Bash array with `mapfile` and `${#RESOURCE_IDS[@]}`.
- The tag propagation script expanded generated tag arguments unquoted, which could break tag values containing spaces. Updated it to build a `TAG_ARGS` array and pass tags as `"${TAG_ARGS[@]}"`.
- The cleanup query treated resource groups missing an `environment` tag as non-production. Updated the JMESPath query to require `tags.environment != null` before deleting.

## Review Notes
The core Azure CLI commands, AzureCLI@2 task inputs, resource group tag inheritance explanation, and lock examples match current Microsoft documentation. Azure CLI was not installed in the local environment, so command behavior was verified against official Microsoft Learn command references, and the Bash snippets were checked locally with `bash -n`.
