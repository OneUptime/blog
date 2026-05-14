# Validation Summary: How to Integrate Flux CD with Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image reflector, image automation, and notification receivers
- Azure DevOps Pipelines YAML and Docker@2 task
- Azure Container Registry
- Azure Kubernetes Service
- Kubernetes Deployments and registry secrets
- Azure CLI, kubectl, and Flux CLI

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Receiver documentation: https://v2-6.docs.fluxcd.io/flux/components/notification/receivers/
- Microsoft Azure DevOps Docker@2 task reference: https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/docker-v2
- Microsoft Azure Pipelines predefined variables: https://learn.microsoft.com/azure/devops/pipelines/build/variables
- Microsoft Azure Pipelines trigger documentation and YAML schema: https://learn.microsoft.com/azure/devops/pipelines/build/triggers and https://learn.microsoft.com/azure/devops/pipelines/yaml-schema/trigger
- Microsoft Azure CLI ACR documentation: https://learn.microsoft.com/cli/azure/acr
- Microsoft Azure CLI ACR webhook documentation: https://learn.microsoft.com/cli/azure/acr/webhook
- Microsoft AKS and ACR integration documentation: https://learn.microsoft.com/azure/aks/cluster-container-registry-integration
- Kubernetes kubectl docker-registry secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The Azure DevOps test step used `dotnet test || echo "Tests passed"`, which would turn a failed test command into a successful step. Changed it to `dotnet test` so failures correctly fail the job.
- The pipeline comment said `Build.SourceVersion` was a short commit SHA. Azure DevOps exposes the full source version in that variable, so the comment now says commit SHA.
- The AKS `--attach-acr` note implied no secret was needed for the Flux integration. Microsoft documents that this grants the kubelet identity `AcrPull` for workload image pulls; Flux ImageRepository scanning still needs registry authentication unless configured with Azure workload identity. Clarified the text.
- The webhook receiver used `type: generic` for an ACR webhook. Flux has a dedicated `acr` receiver type for Azure Container Registry payloads, so the example now uses `type: acr`.

## Review Notes
The examples are generally valid for current Flux v2 APIs using `image.toolkit.fluxcd.io/v1` and `notification.toolkit.fluxcd.io/v1`. In a real installation, Flux image automation also requires that the referenced `GitRepository` credentials can push to the configured branch.
