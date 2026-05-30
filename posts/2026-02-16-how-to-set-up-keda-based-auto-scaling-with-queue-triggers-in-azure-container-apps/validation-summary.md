# Validation Summary: How to Set Up KEDA-Based Auto-Scaling with Queue Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Apps
- KEDA
- Azure Service Bus queues
- Azure Storage Queues
- Azure CLI
- ARM templates
- Kusto Query Language (KQL)
- Node.js signal handling

## Sources Consulted
- Microsoft Learn: Set scaling rules in Azure Container Apps - https://learn.microsoft.com/azure/container-apps/scale-app
- Microsoft Learn: Azure Container Apps ARM and YAML template specifications - https://learn.microsoft.com/azure/container-apps/azure-resource-manager-api-spec
- Microsoft Learn: Monitor logs in Azure Container Apps with Log Analytics - https://learn.microsoft.com/azure/container-apps/log-monitoring
- Microsoft Learn: Azure Monitor Logs reference for ContainerAppSystemLogs - https://learn.microsoft.com/azure/azure-monitor/reference/tables/containerappsystemlogs
- Microsoft Learn: Application lifecycle management in Azure Container Apps - https://learn.microsoft.com/azure/container-apps/application-lifecycle-management
- Microsoft Learn: Azure CLI servicebus namespace and queue command references - https://learn.microsoft.com/cli/azure/servicebus/namespace and https://learn.microsoft.com/cli/azure/servicebus/queue
- KEDA documentation: Azure Service Bus scaler - https://keda.sh/docs/latest/scalers/azure-service-bus/
- KEDA documentation: Azure Storage Queue scaler - https://keda.sh/docs/latest/scalers/azure-storage-queue/
- KEDA documentation: ScaledObject specification - https://keda.sh/docs/latest/reference/scaledobject-spec/

## Issues Found
- The second Log Analytics query claimed to compare queue depth against replica count using `ContainerAppSystemLogs_CL`, but Container Apps system logs do not contain queue depth and the sample extracted a replica count from an unsupported log-message pattern. I changed it to a replica-related system event query using the documented system log fields.

## Review Notes
- The Azure Container Apps CLI scale rule examples match the documented custom KEDA scaler shape for `azure-servicebus` and `azure-queue` with secret-based `connection` authentication.
- The ARM scale rule shape, including `custom.type`, `metadata`, and `auth`, matches the current Container Apps template documentation.
- KEDA's default polling interval and cooldown behavior are accurately described at a high level. In raw KEDA terminology, the 5-minute cooldown applies specifically to scaling back to zero; scale-in above zero is handled through HPA behavior.
