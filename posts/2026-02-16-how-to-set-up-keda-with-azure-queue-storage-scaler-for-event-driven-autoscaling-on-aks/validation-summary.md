# Validation Summary: How to Set Up KEDA with Azure Queue Storage Scaler for Event-Driven Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Horizontal Pod Autoscaler (HPA)
- KEDA ScaledObject and ScaledJob
- KEDA Azure Storage Queue scaler
- Azure Queue Storage
- Azure CLI
- Helm
- Kubernetes Secrets and Deployments
- Azure Workload Identity

## Sources Consulted
- KEDA Azure Storage Queue scaler documentation: https://keda.sh/docs/2.19/scalers/azure-storage-queue/
- KEDA deployment documentation: https://keda.sh/docs/2.19/deploy/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA ScaledJob specification: https://keda.sh/docs/2.19/reference/scaledjob-spec/
- KEDA scaling deployments documentation: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Azure CLI `az storage queue` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/queue?view=azure-cli-latest
- Azure CLI `az storage message` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/message?view=azure-cli-latest
- AKS KEDA workload identity documentation: https://learn.microsoft.com/en-us/azure/aks/keda-workload-identity

## Issues Found
- The post stated that HPA scales based on CPU and memory. Kubernetes HPA also supports custom and external metrics through the autoscaling/v2 API, so the wording was changed to say HPA is often used for CPU and memory.
- The prerequisites listed Kubernetes 1.24 or later. Current KEDA documentation for KEDA 2.19 requires Kubernetes 1.30 or later, so the prerequisite was changed to require a Kubernetes version supported by the chosen KEDA release and gives KEDA 2.19 as the concrete example.
- The Azure Queue creation and message test commands used only `--account-name`, which can work by querying account keys but is less direct after the post has already retrieved a connection string. The commands were updated to use `--connection-string "$STORAGE_CONNECTION"`.
- The ScaledObject comment said `accountName` was used to select the v2 storage SDK. KEDA documents `accountName` as the storage account name and notes it is required when pod identity is used, so the comment was corrected.
- The scaling flow diagram implied KEDA directly sets the HPA desired replica count. KEDA exposes external metrics and manages the generated HPA, while the HPA controller makes scaling decisions above zero. The diagram wording was adjusted to reflect that flow.

## Review Notes
The remaining KEDA ScaledObject, TriggerAuthentication, ScaledJob, Helm, kubectl, and Azure CLI examples are consistent with the official documentation reviewed. In a production workload identity setup, the workload service account, federated identity credential, and relevant pod labels/serviceAccountName must also be configured; the post correctly treats workload identity as a production direction but keeps those setup details abbreviated.
