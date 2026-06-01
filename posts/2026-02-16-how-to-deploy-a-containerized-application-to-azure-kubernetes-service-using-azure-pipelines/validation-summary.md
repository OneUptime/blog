# Validation Summary: How to Deploy a Containerized Application to Azure Kubernetes Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure Pipelines
- Azure DevOps service connections
- Docker and Docker multi-stage builds
- .NET 8 container images
- Kubernetes Deployments, Services, probes, ConfigMaps, and Secrets
- Azure Key Vault Secrets Store CSI Driver

## Sources Consulted
- AKS and ACR integration docs: https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Azure Pipelines Docker@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2
- Azure Pipelines container build and push docs: https://learn.microsoft.com/en-us/azure/devops/pipelines/ecosystems/containers/push-image
- Azure Pipelines KubernetesManifest@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-manifest-v1
- Azure Pipelines Kubernetes@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-v1
- Azure Pipelines artifact publish/download docs: https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts
- .NET 8 container image docs: https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/containers
- .NET 8 ASP.NET Core container port change docs: https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update docs: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes image pull policy docs: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes ConfigMap docs: https://kubernetes.io/docs/concepts/configuration/configmap/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- AKS Azure Key Vault Secrets Store CSI Driver docs: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver

## Issues Found
- The pipeline used `registryName` as the `Docker@2` `containerRegistry` input, which is a Docker registry service connection, not the ACR registry name. Added an ACR Docker registry service connection prerequisite and renamed the variable to `registryServiceConnection` in all Docker task examples.
- The post published manifests with `PublishBuildArtifacts@1` while describing a pipeline artifact flow consumed from `$(Pipeline.Workspace)` in a deployment job. Updated the example to use `PublishPipelineArtifact@1` with `targetPath`, matching current Azure Pipelines guidance and the automatic deployment-job artifact download behavior.

## Review Notes
The remaining Dockerfile, Kubernetes manifests, AKS/ACR attachment command, KubernetesManifest deployment task, rolling update explanation, image pull policy guidance, ConfigMap usage, Key Vault CSI Driver recommendation, and rollout verification command are technically accurate for the versions and services discussed. The health probe paths assume the sample application implements `/health` and `/ready`.
