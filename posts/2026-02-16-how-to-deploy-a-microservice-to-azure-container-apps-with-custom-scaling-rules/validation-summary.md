# Validation Summary: How to Deploy a Microservice to Azure Container Apps with Custom Scaling Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure Container Apps Environment
- Azure CLI
- KEDA scaling rules
- HTTP scaling
- Azure Storage Queue scaling
- Azure Container Registry
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Set scaling rules in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Microsoft Learn: Tutorial: Scale an Azure Container Apps application - https://learn.microsoft.com/en-us/azure/container-apps/tutorial-scaling
- Microsoft Learn: Azure CLI `az containerapp` reference - https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az containerapp replica` reference - https://learn.microsoft.com/en-us/cli/azure/containerapp/replica?view=azure-cli-latest
- Microsoft Learn: Managed identities in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- Microsoft Learn: Manage secrets in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- KEDA documentation: Azure Storage Queue scaler - https://keda.sh/docs/latest/scalers/azure-storage-queue/

## Issues Found
- The description said the article covered CPU-based scaling, but the post only demonstrates HTTP and Azure Queue scaling. Updated the description to match the actual technical content.
- The prerequisites specified Azure CLI version 2.45 or later without a current source for that exact minimum. Changed it to require Azure CLI generally.
- The Azure Queue scaler examples referenced a secret but did not define it, and they omitted `activeRevisionsMode: single`, which Microsoft recommends for non-HTTP event scale rules. Added the secret placeholder and single revision mode to both JSON snippets.
- The Azure Queue explanation implied scaling only when queue length exceeds 5 messages per replica. KEDA treats `queueLength` as the target value, so the wording was corrected.
- The replica listing command used a literal placeholder revision name that would fail if copied. Removed `--revision` so the command lists replicas for the latest revision by default.
- The batch processing guidance claimed `queueLength: 1` gives each message its own replica. Corrected this to say it targets roughly one replica per queued message, subject to `maxReplicas`.
- The stateful services guidance said higher thresholds increase the stabilization window. Thresholds do not change the stabilization window, so the wording was corrected.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI behavior was verified against Microsoft Learn CLI reference pages instead of local `az --help` output. The JSON snippets were parsed locally with `python3` after editing.
