# Validation Summary: How to Build Azure AKS KEDA Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Event-driven Autoscaling (KEDA)
- Microsoft Entra Workload ID / Azure Workload Identity
- Azure Service Bus
- Azure Storage Queues
- Azure Event Hubs
- Kubernetes Horizontal Pod Autoscaler
- Helm
- Azure CLI
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Microsoft Learn: Install the KEDA add-on using Azure CLI - https://learn.microsoft.com/en-us/azure/aks/keda-deploy-add-on-cli
- Microsoft Learn: KEDA add-on with workload identity on AKS - https://learn.microsoft.com/en-us/azure/aks/keda-workload-identity
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: az identity federated-credential CLI reference - https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn: az eventhubs namespace CLI reference - https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- KEDA docs: Azure AD Workload Identity authentication provider - https://keda.sh/docs/2.20/authentication-providers/azure-ad-workload-identity/
- KEDA docs: Authentication concepts - https://keda.sh/docs/2.20/concepts/authentication/
- KEDA docs: Azure Service Bus scaler - https://keda.sh/docs/2.20/scalers/azure-service-bus/
- KEDA docs: Azure Storage Queue scaler - https://keda.sh/docs/2.19/scalers/azure-storage-queue/
- KEDA docs: Azure Event Hubs scaler - https://github.com/kedacore/keda-docs/blob/main/content/docs/2.19/scalers/azure-event-hub.md
- KEDA docs: CPU scaler - https://keda.sh/docs/2.20/scalers/cpu/
- KEDA docs: ScaledObject specification - https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA docs: Prometheus integration metrics - https://keda.sh/docs/2.20/integrations/prometheus/

## Issues Found
- The AKS add-on verification command used a label selector that does not match the labels shown in current AKS/KEDA guidance. Changed it to list KEDA pods in `kube-system` with `grep keda`.
- The Workload Identity federated credential assumed KEDA was always installed in the `keda` namespace. Updated it to use `KEDA_NAMESPACE`, with `kube-system` for the AKS add-on and `keda` for Helm.
- The KEDA operator service account was not annotated or restarted after federation. Added the service account annotation, restart command, and Helm workload identity chart settings.
- The Azure CLI federated credential examples used `--audience`; current Azure CLI documents `--audiences`. Updated both federated credential commands.
- The Service Bus role assignment used `Azure Service Bus Data Receiver`, while Microsoft AKS KEDA workload identity guidance assigns `Azure Service Bus Data Owner` for KEDA scaling. Updated the role and comment.
- The Event Hubs example lacked required RBAC for Event Hubs and checkpoint blob reads. Added `Azure Event Hubs Data Receiver` and `Storage Blob Data Reader` role assignments.
- The deployment referenced `queue-processor-sa` but did not define it. Added a ServiceAccount manifest with the Workload Identity client ID annotation and a federated credential command for workloads that use Workload Identity.
- KEDA log commands used the Helm namespace and an outdated label selector. Updated them to use `$KEDA_NAMESPACE` and `app.kubernetes.io/name=keda-operator`.
- The ServiceMonitor namespace and selector assumed a Helm install. Adjusted the namespace comment for AKS add-on versus Helm and updated the selector to the current KEDA operator label.
- The Prometheus metric `keda_scaler_errors_total` is not in current KEDA metrics documentation. Replaced it with `keda_scaler_detail_errors_total`.

## Review Notes
The tutorial is technically relevant and generally current after the fixes. Some examples remain intentionally placeholder-based, so users still need to replace resource names, image names, namespaces, and identity values for their environment.
