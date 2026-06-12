# Validation Summary: How to Implement Azure Container Apps

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Container Apps
- Azure CLI
- Azure Container Registry
- Azure Service Bus and KEDA scaling
- Azure Key Vault and managed identities
- Dapr
- YAML and Bicep infrastructure as code
- Azure Monitor, Log Analytics, and OpenTelemetry
- Docker and Python Flask container packaging

## Sources Consulted
- Azure Container Apps scaling rules: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Azure Container Apps secrets and Key Vault references: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- Azure CLI `az keyvault` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure CLI `az containerapp secret`: https://learn.microsoft.com/en-us/cli/azure/containerapp/secret
- Azure Container Apps image pull from ACR with managed identity: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull
- Azure CLI `az containerapp` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure CLI `az containerapp logs`: https://learn.microsoft.com/en-us/cli/azure/containerapp/logs
- Azure CLI `az containerapp ingress traffic`: https://learn.microsoft.com/en-us/cli/azure/containerapp/ingress/traffic
- Azure Container Apps Dapr components: https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Azure Container Apps Dapr overview and supported component types: https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview
- Dapr Azure Service Bus queues component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-queues/
- Azure Container Apps log options: https://learn.microsoft.com/en-us/azure/container-apps/log-options
- Azure Container Apps Log Analytics monitoring: https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring
- Azure ARM/Bicep reference for `Microsoft.App/containerApps`: https://learn.microsoft.com/en-us/azure/templates/microsoft.app/containerapps
- Azure ARM/Bicep reference for `Microsoft.App/managedEnvironments/daprComponents`: https://learn.microsoft.com/en-us/azure/templates/microsoft.app/managedenvironments/daprcomponents

## Issues Found
- The post said Azure Container Apps runs on "AKS internally." Official documentation describes Azure Container Apps as built on Kubernetes and powered by Kubernetes/KEDA/Dapr abstractions, but users should not rely on it being their own AKS cluster. I changed the wording to "runs on top of Kubernetes."
- The ACR creation example enabled admin credentials even though the deployment path uses managed identity. I changed `--admin-enabled true` to `--admin-enabled false` to match the managed identity approach and avoid unnecessary registry credentials.
- The scaling section said Container Apps offers three scaling triggers: HTTP, Azure Service Bus queues, and custom metrics. Current documentation describes scale rule categories as HTTP, TCP, and custom, with Azure Service Bus handled through custom KEDA scalers. I corrected the wording.
- The Key Vault example granted access with `az keyvault set-policy`, which only applies to vaults using the access policy permission model. Current Azure CLI-created Key Vaults default to RBAC authorization, so I made RBAC explicit, added a `Key Vault Secrets Officer` assignment for the signed-in user before creating the demo secret, and assigned `Key Vault Secrets User` to the container app identity.
- The Dapr Service Bus pub/sub component used `pubsub.azure.servicebus`, which is not the current supported component type for Azure Container Apps. I changed it to `pubsub.azure.servicebus.queues`.
- The OpenTelemetry section implied setting environment variables alone exports telemetry. I clarified that the application must be instrumented before those variables can direct telemetry export.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was done against Microsoft Learn CLI reference pages instead of local `az --help`. The Bicep examples use an older but still documented API version; future maintenance could update them to the current `Microsoft.App` API version after testing in Azure.
