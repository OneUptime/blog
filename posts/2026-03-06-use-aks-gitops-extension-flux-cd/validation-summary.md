# Validation Summary: How to Use AKS GitOps Extension with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Arc-enabled Kubernetes GitOps extension
- Flux CD / Flux v2
- Azure CLI
- Kubernetes
- Azure Resource Manager (ARM) templates

## Sources Consulted
- Microsoft Learn: Tutorial - Deploy applications by using GitOps with Flux v2, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2
- Microsoft Learn: Application deployments with GitOps (Flux v2), https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/conceptual-gitops-flux2
- Microsoft Learn: az k8s-configuration flux CLI reference, https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux?view=azure-cli-latest
- Microsoft Learn: az k8s-configuration flux kustomization CLI reference, https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux/kustomization?view=azure-cli-latest
- Microsoft Learn: az k8s-extension CLI reference, https://learn.microsoft.com/en-us/cli/azure/k8s-extension?view=azure-cli-lts
- Microsoft Learn: Microsoft.KubernetesConfiguration/fluxConfigurations ARM template reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.kubernetesconfiguration/fluxconfigurations
- Microsoft Learn: How to set scope for extension resources in ARM templates, https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/scope-extension-resources

## Issues Found
- The prerequisites listed a generic AKS cluster with Kubernetes 1.22 or later and Azure CLI v2.50 or later. Current Microsoft guidance calls out an MSI-based AKS cluster for the Flux extension, and the current `k8s-extension` CLI reference requires Azure CLI v2.51 or later. Updated the prerequisite bullets accordingly.
- The prerequisites did not mention required Azure resource permissions. Added the documented read/write permissions for `Microsoft.ContainerService/managedClusters`, `Microsoft.KubernetesConfiguration/extensions`, and `Microsoft.KubernetesConfiguration/fluxConfigurations`.
- The resource provider registration step only registered `Microsoft.KubernetesConfiguration`. Microsoft guidance lists `Microsoft.ContainerService`, `Microsoft.Kubernetes`, and `Microsoft.KubernetesConfiguration`, so the command block now registers all three and checks each registration state.
- The post stated that `microsoft.flux` installs all Flux CD controllers. By default it installs Source, Kustomize, Helm, and Notification controllers; image automation controllers must be enabled explicitly. Updated the wording to match the documented default behavior and the example command.
- The specific-version extension update example omitted disabling automatic minor upgrades. The Azure CLI reference says `--version` specifies the version to install when automatic minor upgrade is not enabled, so the example now includes `--auto-upgrade-minor-version false`.

## Review Notes
The Azure CLI command shapes, Flux kustomization parameters, private Git authentication flags, Kubernetes resource checks, and ARM `fluxConfigurations` property names were reviewed against Microsoft documentation and are technically consistent. The local environment did not have `az` installed, so CLI validation was performed against official Microsoft CLI reference pages rather than local `--help` output.
