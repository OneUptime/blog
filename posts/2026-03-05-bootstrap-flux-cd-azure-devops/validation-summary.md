# Validation Summary: How to Bootstrap Flux CD with Azure DevOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Azure DevOps Repos
- Azure Kubernetes Service (AKS)
- Azure CLI GitOps extension
- SSH and HTTPS Git authentication

## Sources Consulted
- Flux bootstrap for Azure DevOps: https://fluxcd.io/flux/installation/bootstrap/azure-devops/
- Flux bootstrap for generic Git servers: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `create secret git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Azure Repos SSH authentication documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate
- Azure CLI `az k8s-configuration flux` reference: https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux
- Azure Arc / AKS GitOps with Flux v2 conceptual documentation: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/conceptual-gitops-flux2

## Issues Found
- The repository push step referenced `gotk-sync.yaml` and `kustomization-sync.yaml` in `clusters/production/flux-system/kustomization.yaml` but did not create those files. Added commands that create the GitRepository and Flux Kustomization manifests before committing.
- The root Flux Kustomization used `path: ./clusters/production`, but the guide did not create `clusters/production/kustomization.yaml`. Added a production root Kustomize file so Flux can build the path successfully.
- The app Flux Kustomization pointed to `./apps/production`, but the guide did not include an `apps/production/kustomization.yaml`. Added the missing Kustomize file that references the nginx manifest.
- The initial production root Kustomization would have included an empty `apps` directory before the app Kustomization existed. Kept the initial root Kustomization limited to `flux-system` and added the `apps` entry in the application deployment step.

## Review Notes
The Flux API versions, Azure DevOps HTTPS URL format, SSH URL format for Flux, RSA SHA-2 SSH guidance, Flux secret formats, and Azure CLI `az k8s-configuration flux create` flags were consistent with current official documentation. The AKS GitOps extension is a valid alternative to a CLI-managed Flux installation, but readers should choose one installation approach per cluster to avoid overlapping Flux management.
