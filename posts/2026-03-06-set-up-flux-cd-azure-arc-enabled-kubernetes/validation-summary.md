# Validation Summary: How to Set Up Flux CD on Azure Arc-Enabled Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Arc-enabled Kubernetes
- Flux CD / Flux v2
- Azure CLI
- Azure Kubernetes Configuration and Kubernetes Extension resources
- Azure Policy
- Azure Monitor Container Insights
- Kubernetes and kubectl
- GitOps with public, SSH, and HTTPS Git repositories

## Sources Consulted
- Azure Arc-enabled Kubernetes system requirements: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/system-requirements
- Azure Arc-enabled Kubernetes network requirements: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/network-requirements
- Azure CLI `az connectedk8s` reference: https://learn.microsoft.com/en-us/cli/azure/connectedk8s
- Azure CLI `az k8s-extension` reference: https://learn.microsoft.com/en-us/cli/azure/k8s-extension
- Azure CLI `az k8s-configuration flux` reference: https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux
- Azure CLI `az k8s-configuration flux kustomization` reference: https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux/kustomization
- Azure Arc GitOps with Flux v2 concepts: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/conceptual-gitops-flux2
- Azure Arc GitOps with Flux v2 tutorial: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2
- Azure Policy for Flux v2 configurations: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/use-azure-policy-flux-2
- Azure Arc-enabled Kubernetes policy reference: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/policy-reference
- Azure Policy built-in definition source for public Git repository Flux v2 configuration: https://raw.githubusercontent.com/Azure/azure-policy/master/built-in-policies/policyDefinitions/Kubernetes/Deploy-GitOps-Flux2-to-Kubernetes-cluster-no-secrets_DINE.json
- Azure Monitor for Arc-enabled Kubernetes clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable-arc
- Azure Arc extension troubleshooting: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/extensions-troubleshooting

## Issues Found
- The Azure CLI prerequisite listed v2.50 or later, but the current `connectedk8s` Azure CLI extension reference requires Azure CLI 2.70.0 or higher. Updated the prerequisite to require the latest Azure CLI and note v2.70 or later for `connectedk8s`.
- The post used `dependsOn` inside `az k8s-configuration flux create --kustomization` values. The Azure CLI reference documents the kustomization dependency field as `depends_on`. Updated all examples to use `depends_on`.
- The Azure Policy assignment used an incorrect built-in policy definition ID. Replaced it with the official built-in ID for "Configure Kubernetes clusters with Flux v2 configuration using public Git repository": `83ea2fd1-9eaf-2f6d-f672-cd7b2ac798f6`.
- The Azure Policy assignment used unsupported parameter names such as `url`, `branch`, and `sourceKind`, and passed raw values instead of Azure Policy parameter objects. Updated the example to use documented policy parameters such as `repositoryUrl`, `repositoryRefBranch`, and `{ "value": ... }` wrappers.
- The Azure Policy assignment omitted the managed identity and Contributor role assignment needed for DeployIfNotExists remediation. Added `--mi-system-assigned`, `--identity-scope`, `--role Contributor`, and `--location`.
- The post used `flux get all` without listing Flux CLI as a prerequisite. Added a prerequisite note for users who want to run that command.
- The Flux extension troubleshooting section suggested `kubectl get helmreleases -n flux-system` for extension installation issues, but HelmRelease resources are Flux workload resources, not the Azure extension installation status. Replaced it with checking namespace events in `flux-system`.

## Review Notes
- The Flux extension can be installed manually as shown, but Microsoft documentation also notes that it is installed automatically when the first Flux configuration is created.
- Built-in Azure Policy definitions for Flux create only a single kustomization due to Azure Policy parameter limits; more complex policy scenarios require a custom policy definition.
- Azure CLI was not installed in the local workspace, so command validation was performed against official Microsoft CLI references rather than local `az --help` output.
