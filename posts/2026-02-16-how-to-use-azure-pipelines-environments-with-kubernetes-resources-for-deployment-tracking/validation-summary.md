# Validation Summary: How to Use Azure Pipelines Environments with Kubernetes Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines environments
- Azure DevOps approvals and checks
- Azure Kubernetes Service (AKS)
- Kubernetes service accounts, RBAC, and Secrets
- Azure Pipelines deployment jobs
- KubernetesManifest@1 task
- Docker@2 task

## Sources Consulted
- Microsoft Learn: Create and target Azure DevOps environments for pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops
- Microsoft Learn: Kubernetes resources in environments: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments-kubernetes?view=azure-devops
- Microsoft Learn: KubernetesManifest@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-manifest-v1?view=azure-pipelines
- Microsoft Learn: Deployment jobs schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment?view=azure-pipelines
- Microsoft Learn: Canary deployment strategy schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment-strategy-canary?view=azure-pipelines
- Microsoft Learn: Rolling deployment strategy schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment-strategy-rolling?view=azure-pipelines
- Microsoft Learn: Define approvals and checks: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Kubernetes documentation: ServiceAccount token Secrets: https://kubernetes.io/docs/concepts/configuration/secret/#serviceaccount-token-secrets

## Issues Found
- The post stated that simply referencing an environment in YAML creates it automatically. Microsoft documentation notes automatic creation depends on Azure Pipelines being able to identify the user and that user having environment creation permissions. Updated the wording and YAML comment to include that condition.
- The non-AKS Kubernetes resource instructions said a kubeconfig or service account token could be provided for the Generic provider. Azure Pipelines environment Kubernetes resources use an existing service account secret for the Generic provider. Updated the text to refer to an existing service account and service account secret.
- The Kubernetes service account example did not create a token Secret. Current Kubernetes versions no longer automatically create long-lived service account token Secrets in the same way older clusters did. Added a `kubernetes.io/service-account-token` Secret example and changed the follow-up text to use the service account secret JSON.
- The "complete" multi-stage pipeline deployed from `$(Pipeline.Workspace)/manifests/*.yaml` without publishing the manifests artifact in the build stage. Added a `publish: manifests` step so deployment jobs can consume that path.
- The canary deployment example used `$(strategy.increment)` in the `on: success` hook, where that variable is not available, and did not promote the canary. Replaced the success hook with a `KubernetesManifest@1` `promote` action and kept the failure hook as `reject`.
- The rolling deployment example used Azure Pipelines `strategy: rolling` for a Kubernetes environment. Microsoft documentation says the rolling deployment job strategy is currently supported only for VM resources. Reworded the section to use `runOnce` and note that Kubernetes rolling behavior is handled by the Deployment manifest.

## Review Notes
The post is technically relevant and current after the corrections. The examples remain illustrative and assume the reader has matching service connections, manifest paths, namespaces, and Kubernetes resources already configured in Azure DevOps.
