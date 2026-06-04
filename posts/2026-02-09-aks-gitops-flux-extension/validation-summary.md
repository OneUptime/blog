# Validation Summary: How to Set Up AKS GitOps Extension with Flux for Cluster Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Arc-enabled Kubernetes
- Azure CLI k8s-extension and k8s-configuration extensions
- Flux v2 GitOps extension
- Kubernetes Kustomize
- Flux HelmRepository and HelmRelease resources
- External Secrets Operator with Azure Key Vault
- Flux notification-controller
- Flagger progressive delivery

## Sources Consulted
- Microsoft Learn: Azure CLI `az k8s-configuration flux` reference, https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux?view=azure-cli-latest
- Microsoft Learn: Deploy applications using GitOps with Flux v2, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2
- Microsoft Learn: Deploy and manage cluster extensions by using the Azure CLI, https://learn.microsoft.com/en-us/azure/aks/deploy-extensions-az-cli
- Microsoft Learn: Available extensions for Azure Arc-enabled Kubernetes clusters, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/extensions-release
- Flux documentation: HelmRelease resources, https://fluxcd.io/flux/components/helm/helmreleases/
- Flux documentation: Notification providers and alerts, https://fluxcd.io/flux/components/notification/providers/
- Flux documentation: Kustomize API reference, https://fluxcd.io/flux/components/kustomize/api/v1/
- External Secrets Operator documentation: Azure Key Vault provider, https://external-secrets.io/v2.4.1/provider/azure-key-vault/
- Kubernetes documentation: Declarative management of Kubernetes objects using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Helm chart section used `az k8s-configuration flux create --kind HelmRepository`, but Azure CLI only accepts source kinds such as `git`, `oci`, `bucket`, and `azblob`. Changed the command to create a Git-based Flux configuration that applies Git-tracked HelmRepository and HelmRelease manifests.
- The HelmRelease referenced a HelmRepository in `flux-system`, while the example created the configuration under `ingress-system`. Added an explicit HelmRepository manifest in `ingress-system` and updated the HelmRelease `sourceRef.namespace` to match.
- The Kustomize overlay used deprecated `bases` and `patchesStrategicMerge` fields. Updated it to current `resources` and `patches` syntax.
- The External Secrets examples used `external-secrets.io/v1beta1`. Updated SecretStore and ExternalSecret to the current `external-secrets.io/v1` API.
- The Flux notification example used `notification.toolkit.fluxcd.io/v1` for Provider and Alert and placed the Microsoft Teams webhook URL directly in the Provider. Updated the example to `v1beta3` and moved the webhook address into a Secret referenced by the Provider.
- The troubleshooting section suggested deleting a hard-coded `flux-system` Secret to refresh Git credentials. Replaced it with `az k8s-configuration flux update` using the SSH key and known-hosts files.
- The post said the `flux-system` namespace contains Flux controllers and CRDs. Clarified that controllers are namespaced there, while CRDs are cluster-scoped.
- Quoted Azure CLI `--kustomization` arguments that contain spaces or dependency lists so the shell passes them as intended.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI validation was performed against the official Microsoft Learn Azure CLI reference rather than local `az --help` output. The post remains a practical tutorial, but production use should pin tested extension and controller versions and include the required identity/RBAC setup for External Secrets Operator and Flagger.
