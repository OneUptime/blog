# Validation Summary: How to Use AKS KEDA Add-On for Built-In Event-Driven Autoscaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Azure Kubernetes Service (AKS)
- KEDA
- Horizontal Pod Autoscaler (HPA)
- Azure Service Bus
- Azure Storage Queues
- Azure Cosmos DB
- Azure Monitor
- Microsoft Entra Workload ID
- KEDA HTTP add-on
- Azure CLI
- Helm

## Sources Consulted
- Microsoft Learn: Install the Kubernetes Event-driven Autoscaling (KEDA) add-on using the Azure CLI: https://learn.microsoft.com/en-us/azure/aks/keda-deploy-add-on-cli
- Microsoft Learn: Securely scale your applications using the KEDA add-on and workload identity on AKS: https://learn.microsoft.com/en-us/azure/aks/keda-workload-identity
- Microsoft Learn: Azure Service Bus message counters: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-counters
- KEDA documentation: Azure Service Bus scaler: https://keda.sh/docs/2.19/scalers/azure-service-bus/
- KEDA documentation: Azure Storage Queue scaler: https://keda.sh/docs/latest/scalers/azure-storage-queue/
- KEDA documentation: Azure Monitor scaler: https://keda.sh/docs/2.19/scalers/azure-monitor/
- KEDA HTTP add-on documentation: https://keda.sh/http-add-on/latest/
- KEDA HTTP add-on getting started: https://keda.sh/http-add-on/0.14/getting-started/
- KEDA HTTP add-on HTTPScaledObject reference: https://keda.sh/http-add-on/0.15/reference/httpscaledobject/
- KEDA Azure Cosmos DB external scaler: https://github.com/kedacore/external-scaler-azure-cosmos-db

## Issues Found
- The KEDA verification commands used the `app=keda-operator` selector in several places. Updated them to use the `app.kubernetes.io/name=keda-operator` label used by KEDA-managed resources, and added the official `az aks show --query "workloadAutoScalerProfile.keda.enabled"` add-on verification command.
- The AKS KEDA component description omitted the admission webhook. Updated the text to include the operator, metrics API server, and admission webhook components.
- The Service Bus external metrics command used a hard-coded metric path that is not stable across generated metric names. Replaced it with the namespace-level external metrics API listing.
- The workload identity example federated the managed identity to the application service account only, but KEDA evaluates scaler metrics from the `keda-operator` pod. Updated the example to federate and annotate `kube-system:keda-operator`, include `identityId` in `TriggerAuthentication`, and restart the operator.
- The managed identity role assignment examples used `--assignee <identity-client-id>`. Updated them to use object/principal IDs with `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, matching Microsoft guidance for managed identities.
- The Cosmos DB section used a non-existent built-in `azure-cosmosdb` KEDA trigger with query-based metadata. Replaced it with the documented Azure Cosmos DB external scaler, including its Helm install command, `external` trigger metadata, connection environment variable, and change feed lag behavior.
- The Azure Monitor scaler used a full Azure resource ID in `resourceURI` and omitted required metadata. Updated it to use the shortened resource URI plus `tenantId`, `subscriptionId`, and `resourceGroupName`.
- The HTTP add-on example used deprecated `HTTPScaledObject` and `targetPendingRequests`. Replaced it with the current `InterceptorRoute` plus `ScaledObject` and `external-push` trigger pattern.
- The Service Bus troubleshooting command omitted `--resource-group` and queried a non-existent top-level `messageCount` field. Updated it to query `countDetails.activeMessageCount`.

## Review Notes
The examples remain illustrative and still require real Azure resource IDs, tenant IDs, managed identity principal/client IDs, and namespace-specific service names before use. The AKS managed KEDA add-on version is tied to the AKS Kubernetes version, so users should check the AKS component version table before relying on a specific KEDA feature.
