# Validation Summary: How to Set Up Flux CD with Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Azure DevOps Pipelines
- Azure Container Registry
- Azure Kubernetes Service
- OCI artifacts
- Kubernetes Kustomize
- Azure CLI
- kubectl

## Sources Consulted
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux `push artifact` command documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `tag artifact` command documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux `reconcile source oci` command documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Azure CLI ACR documentation: https://learn.microsoft.com/en-us/cli/azure/acr
- Azure CLI service principal documentation: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Azure Pipelines trigger documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/build/triggers
- Azure Pipelines AzureCLI@2 task documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Azure Pipelines Docker@2 task documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2
- AKS managed identity and ACR pull documentation: https://learn.microsoft.com/en-us/azure/aks/use-managed-identity
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The `flux push artifact --revision` examples used `branch/sha`, but Flux requires the revision format `<branch|tag>@sha1:<commit-sha>`. Updated both examples to use `@sha1:`.
- The image-update pipeline described updating Flux image policies, but the snippet edits GitOps manifests with Kustomize. Updated the description to match the implementation.
- The image-update pipeline used `kustomize edit set image` without installing Kustomize and without mapping the original image name to the replacement image. Added a Kustomize install step and changed the command to `old=new`.
- The Flux OCIRepository examples used `provider: azure` without noting the required ACR pull access for the Azure identity used by Flux. Added an `az aks update --attach-acr` example before the Flux source resource.
- The Receiver setup called the token webhook authentication for a generic receiver and used `flux get receivers azure-devops-receiver` to retrieve a URL. Updated the wording to receiver webhook path generation and used `kubectl get receiver ... -o jsonpath='{.status.webhookPath}'`.
- The deployment verification stage used invalid Flux CLI commands: `flux reconcile ocirepository` and `flux get kustomization`. Updated them to `flux reconcile source oci` and `flux get kustomizations`.
- The ACR admin-user setup implied that admin credentials were required for pipeline authentication, even though the pipeline uses Azure service connections. Clarified that admin credentials are optional only for username/password authentication.

## Review Notes
The tutorial is technically valid after the corrections. In a future revision, the security posture could be improved by avoiding ACR admin credentials entirely and by using managed identities or service connections consistently throughout the pipeline examples.
