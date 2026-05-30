# Validation Summary: How to Use Azure CLI Extensions to Manage Preview Features

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure CLI
- Azure CLI extensions
- Azure DevOps CLI extension
- AKS preview extension
- Azure SSH extension
- Azure Pipelines YAML
- Azure CLI dynamic extension installation

## Sources Consulted
- Microsoft Learn: Manage Azure CLI Extensions: Install, Update, and Remove - https://learn.microsoft.com/en-us/cli/azure/azure-cli-extensions-overview
- Microsoft Learn: az extension command reference - https://learn.microsoft.com/en-us/cli/azure/extension
- Microsoft Learn: Available Azure CLI extensions - https://learn.microsoft.com/en-us/cli/azure/azure-cli-extensions-list
- Microsoft Learn: Get started with Azure DevOps CLI - https://learn.microsoft.com/en-us/azure/devops/cli/
- Microsoft Learn: az pipelines command reference - https://learn.microsoft.com/en-us/cli/azure/pipelines
- Microsoft Learn: az pipelines runs command reference - https://learn.microsoft.com/en-us/cli/azure/pipelines/runs
- Microsoft Learn: View and add work items in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/work-items/view-add-work-items
- Microsoft Learn: az ssh command reference - https://learn.microsoft.com/en-us/cli/azure/ssh
- Microsoft Learn: Set up identity bindings on Azure Kubernetes Service (AKS) (preview) - https://learn.microsoft.com/en-us/azure/aks/identity-bindings
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- The AKS preview example used the outdated `EnableWorkloadIdentityPreview` feature flag. Microsoft Entra Workload ID is now documented with the core `az aks create` flags, while current AKS preview identity binding documentation uses `IdentityBindingPreview`. Updated the example to register `IdentityBindingPreview`, verify registration, refresh the provider, and show `az aks identity-binding create`.
- The installed extension listing description said `az extension list --output table` shows whether an update is available. The official command reference documents it as listing installed extensions; update availability is not a documented output field. Revised the sentence to describe name, version, and preview or experimental metadata.
- The compatibility query used `minCliCoreVersion` and `maxCliCoreVersion` as top-level fields. Extension metadata uses `azext.minCliCoreVersion` under `metadata`. Updated the query to `metadata.\"azext.minCliCoreVersion\"`.

## Review Notes
Most extension management commands, dynamic install settings, Azure DevOps examples, SSH examples, and Azure Pipelines extension installation snippets matched current Microsoft documentation. The Azure CLI was not installed in the local workspace, so command validation was performed against official Microsoft Learn references and the public Azure CLI extension index.
