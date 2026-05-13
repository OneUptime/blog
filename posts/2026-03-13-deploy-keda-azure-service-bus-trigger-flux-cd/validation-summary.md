# Validation Summary: How to Deploy KEDA with Azure Service Bus Trigger with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD v2
- Kubernetes
- KEDA
- Azure Kubernetes Service
- Azure Workload Identity
- Azure Service Bus
- Azure CLI

## Sources Consulted
- KEDA Azure Service Bus scaler documentation: https://keda.sh/docs/2.19/scalers/azure-service-bus/
- KEDA Azure AD Workload Identity authentication provider documentation: https://keda.sh/docs/2.19/authentication-providers/azure-ad-workload-identity/
- Microsoft Learn AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn AKS Workload Identity deployment guide: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn AKS KEDA add-on with workload identity guide: https://learn.microsoft.com/en-us/azure/aks/keda-workload-identity
- Azure CLI federated identity credential reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The post assigned only `Azure Service Bus Data Receiver` to the identity. KEDA's Azure Service Bus scaler documentation notes that manage-level access is needed to query metrics, and Microsoft's AKS KEDA workload identity guide uses `Azure Service Bus Data Owner`; updated the prerequisite and command accordingly.
- The Workload Identity setup federated only the worker ServiceAccount. KEDA evaluates the scaler through the KEDA operator, so the KEDA operator ServiceAccount also needs a federated credential; added that credential and a note about matching the operator namespace.
- The KEDA Service Bus `namespace` metadata used the full hostname. KEDA documents this field as the Service Bus namespace name, so the queue and topic examples now use `my-sbus`.
- The worker Deployment used `azure.workload.identity/use` under pod annotations. Microsoft documents it as a required pod label for workload identity mutation; moved it under pod template labels.
- The worker referenced `sbus-worker-sa` but did not define it. Added the ServiceAccount with the required `azure.workload.identity/client-id` annotation.
- `terminationGracePeriodSeconds` was placed under the container spec, which is invalid Kubernetes Deployment YAML. Moved it to the pod spec.

## Review Notes
The YAML snippets were parsed after the edits. The Flux Kustomization fields match the current v1 Flux API. The connection string example remains technically valid, but any real use should encrypt the Secret with SOPS or another Flux-supported secret management workflow before committing it.
