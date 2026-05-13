# Validation Summary: How to Set Up Flux Multi-Subscription Deployment on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- HelmRelease and HelmRepository Flux APIs
- Flux GitRepository and Kustomization APIs
- Flux notification-controller Alert and Provider APIs
- Azure Kubernetes Service (AKS)
- Azure CLI
- Microsoft Entra Workload ID
- Azure managed identities and Azure RBAC
- GitHub bootstrap for Flux

## Sources Consulted
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Azure AKS Workload Identity documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Azure CLI role assignment documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The repository structure omitted cluster-level `kustomization.yaml` files and `cluster-config.yaml` files. Added them to the layout and added a cluster-level `kustomization.yaml` example so Flux bootstrap output, `infrastructure.yaml`, `apps.yaml`, and the cluster ConfigMap are all applied.
- The AKS creation commands assumed resource groups already existed. Added `az group create` commands before each `az aks create` example.
- The GitHub bootstrap examples used `--personal` with an organization-style owner (`my-org`). Removed `--personal` so the examples match Flux's organization bootstrap mode.
- The cross-subscription identity example assigned RBAC to the AKS kubelet identity, which is not the correct identity for pods using Microsoft Entra Workload ID. Replaced it with a user-assigned managed identity, federated credential, service account annotation guidance, and RBAC assignment using `--assignee-principal-type ServicePrincipal`.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider, but current Alert and Provider resources are in `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The Slack Provider example omitted the Slack API address for bot-token configuration and referenced a webhook-style secret name. Added `address: https://slack.com/api/chat.postMessage` and changed the secret reference to `slack-bot-token`.
- The Alert example used deprecated `.spec.summary`. Replaced it with `.spec.eventMetadata.summary` and moved cluster and subscription values into event metadata.
- The progressive delivery section said Flux dependencies were used, but the examples showed promotion by Git refs. Updated the wording to describe separate Git refs.

## Review Notes
- The production GitRepository tag example is valid Flux syntax, but in a real bootstrap layout it should be applied by updating or patching the generated `flux-system` GitRepository for that production cluster, not by adding a second resource with the same name and namespace.
- The examples use placeholder subscription IDs, organization names, cluster names, and Slack credentials; these must be replaced before use.
