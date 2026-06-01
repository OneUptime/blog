# Validation Summary: How to Debug a Failed Container Instance Using Log Streaming and Events

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Azure Container Instances
- Azure CLI
- Azure Monitor metrics and alerts
- Container logs, events, and exec-based troubleshooting

## Sources Consulted
- Microsoft Learn: Azure CLI `az container` reference: https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest
- Microsoft Learn: Retrieve container logs and events in Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-get-logs
- Microsoft Learn: Execute a command in a running Azure container instance: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-exec
- Microsoft Learn: Troubleshoot common issues in Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-troubleshooting
- Microsoft Learn: Monitor Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/monitor-azure-container-instances
- Microsoft Learn: Container Instances monitoring data reference: https://learn.microsoft.com/en-us/azure/container-instances/monitor-azure-container-instances-reference
- Microsoft Learn: Azure CLI `az monitor metrics alert create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest

## Issues Found
- `az container logs --previous` is not a valid Azure Container Instances CLI option. Removed the command examples that used `--previous` and clarified that ACI users should use current logs, events, and `previousState` from `az container show`.
- Several `az container exec --exec-command` examples passed commands with arguments directly. Microsoft documents ACI exec as launching a single process and notes that command arguments and chained commands are not supported. Updated those examples to open `/bin/sh` first and run diagnostic commands inside the shell.
- The Azure Monitor alert example used `RestartCount`, which is not a supported metric for `Microsoft.ContainerInstance/containerGroups`. Replaced it with an alert on the supported `MemoryUsage` metric.
- Added the current Microsoft caveat that Azure Monitor metrics for Azure Container Instances are in preview and only available for Linux containers.

## Review Notes
Azure CLI was not installed in the local workspace, so command verification was performed against current Microsoft Learn CLI references and Azure Container Instances documentation.
