# Validation Summary: How to Build a Complete CI/CD Pipeline with Azure Pipelines and Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps
- Azure Container Registry
- Azure Kubernetes Service
- Flux CD
- Flux GitRepository and Kustomization APIs
- Flux image reflector APIs
- Kubernetes
- GitOps

## Sources Consulted
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux bootstrap for generic Git servers: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Azure AKS and ACR integration documentation: https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Azure Pipelines trigger schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/trigger?view=azure-pipelines
- Azure Pipelines Docker@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines
- Azure Pipelines secret variables documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables?view=azure-devops
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

## Issues Found
- The introduction and best practices implied that Flux itself pulls workload images from ACR. Updated the wording to distinguish AKS kubelet image pulls from Flux image tag scanning.
- The prerequisites mentioned ACR admin credentials as an integration path. Updated this to managed identity or appropriate role assignment, matching AKS/ACR guidance.
- The Flux bootstrap commands used Flux image resources later in the article but did not install the image reflector controller. Added `--components-extra=image-reflector-controller`.
- The generic `flux bootstrap git` example used HTTPS token credentials without `--token-auth=true`. Added the flag to match Flux's HTTPS token-auth bootstrap guidance.
- The Azure Pipelines example embedded the fleet repository token in a YAML variable and clone URL. Updated it to map the secret into environment variables for the script.
- The Flux `ImageRepository` example claimed no `secretRef` was needed for ACR but omitted `provider: azure`. Added `provider: azure`, which is required for Flux's Azure Workload Identity or kubelet identity authentication mode.
- The image policy step could be read as part of the direct Azure Pipelines tag-update flow, but an `ImagePolicy` alone does not update manifests. Clarified that the step is optional and requires Flux image automation for automatic manifest updates.

## Review Notes
The remaining examples are illustrative and still require user-specific service connections, repository credentials, namespaces, and deployment manifests. The Azure Pipelines trigger, Docker@2 task inputs, Flux Kustomization fields, Flux event command, and AKS `az aks update --attach-acr` flow were consistent with current official documentation.
