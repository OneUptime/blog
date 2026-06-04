# Validation Summary: How to Use AKS Start/Stop Feature to Save Costs on Non-Production Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Azure Automation
- Azure PowerShell Az modules
- Terraform AzureRM provider
- Azure Logic Apps
- Kubernetes kubectl

## Sources Consulted
- Microsoft Learn: Stop and start an Azure Kubernetes Service (AKS) cluster: https://learn.microsoft.com/en-us/azure/aks/start-stop-cluster
- Microsoft Learn: az aks CLI reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: az automation account CLI reference: https://learn.microsoft.com/en-us/cli/azure/automation/account
- Microsoft Learn: az automation runbook CLI reference: https://learn.microsoft.com/en-us/cli/azure/automation/runbook
- Microsoft Learn: az automation schedule CLI reference: https://learn.microsoft.com/en-us/cli/azure/automation/schedule
- Microsoft Learn: az automation job CLI reference: https://learn.microsoft.com/en-us/cli/azure/automation/job
- Microsoft Learn: Manage schedules in Azure Automation: https://learn.microsoft.com/en-us/azure/automation/shared-resources/schedules
- Microsoft Learn: Enable a system-assigned managed identity for Azure Automation: https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Automation Account Update REST API: https://learn.microsoft.com/en-us/rest/api/automation/automation-account/update?view=rest-automation-2024-10-23
- Microsoft Learn: AKS Managed Clusters Stop REST API: https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/stop?view=rest-aks-2025-10-01
- HashiCorp AzureRM provider documentation source for azurerm_automation_account, azurerm_automation_runbook, and azurerm_automation_schedule: https://github.com/hashicorp/terraform-provider-azurerm/tree/main/website/docs/r
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The AKS state retention period was outdated. The post said the control plane is preserved for 90 days; Microsoft documentation now states stopped cluster state is preserved for up to 12 months. Updated the wording.
- The description of preserved objects omitted standalone pods. Microsoft documents that standalone pods are deleted when nodes drain during stop. Added that exception.
- The Azure CLI command `az automation account update --assign-identity` is not in the current Automation CLI reference. Replaced it with an `az rest` PATCH call using the Automation Account Update REST API to enable a system-assigned identity.
- The runbook import flow created and published an empty runbook. Added `az automation runbook replace-content` calls and included both stop and start runbooks before publishing.
- The Azure CLI command group `az automation job-schedule` is not present in the current official Automation CLI reference. Replaced schedule linking with the official Azure PowerShell `Register-AzAutomationScheduledRunbook` cmdlet pattern.
- The weekend schedule examples used unsupported Azure CLI flags (`--week-days`) and the Friday example used a Saturday date. Replaced those examples with `New-AzAutomationSchedule` and corrected the Friday start date to February 13, 2026.
- The Logic Apps AKS stop REST URL used an older API version. Updated it to the current documented AKS Managed Clusters Stop API version, `2025-10-01`.
- The monitoring example used an invalid `az automation job show --job-id` flag. Updated it to pass the returned resource ID through `--ids`.
- The database restore example piped stdin into `kubectl exec` without `-i`, which is required for stdin. Added `-i` and changed the comment from snapshot to backup.

## Review Notes
Azure Automation CLI command groups for accounts, runbooks, and jobs are marked experimental in the current Microsoft CLI reference, while schedules are GA. The post now avoids the missing CLI job-schedule command, but future maintenance should re-check Automation CLI coverage because this extension is still evolving.
