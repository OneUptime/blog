# Validation Summary: How to Configure Deployment Strategies Like Canary and Blue-Green

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines deployment jobs
- Azure Pipelines KubernetesManifest@1 task
- Azure Pipelines Kubernetes@1 task
- Azure App Service deployment slots
- AzureWebApp@1 task
- AzureAppServiceManage@0 task
- Kubernetes Deployments and Services
- kubectl service selectors

## Sources Consulted
- Microsoft Learn: jobs.deployment.strategy and canary deployment strategy schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-deployment-strategy
- Microsoft Learn: KubernetesManifest@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-manifest-v1
- Microsoft Learn: AzureWebApp@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1
- Microsoft Learn: AzureAppServiceManage@0 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-service-manage-v0
- Microsoft Learn: Kubernetes@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-v1
- Kubernetes documentation: kubectl set selector - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_selector/

## Issues Found
- The canary section described default KubernetesManifest canary increments as exact pod or traffic percentages. Updated the explanation to clarify that the default `pod` traffic split computes baseline and canary replica counts, while exact request-level percentages require `trafficSplitMethod: 'smi'` and a supporting service mesh.
- The AzureWebApp@1 slot deployment example omitted required slot deployment inputs. Added `appType: 'webApp'` and `resourceGroupName: 'my-rg'`.
- The AzureAppServiceManage@0 slot swap example omitted the required resource group and used non-canonical input names. Added `ResourceGroupName`, used the documented task input names, and explicitly set `SwapWithProduction: true`.
- The Kubernetes blue-green switch used `Kubernetes@1` with `command: 'patch'`, but the task's documented command list does not include `patch`. Replaced it with the supported `set` command and `kubectl set selector` arguments, including all service selector labels because the selector is overwritten.

## Review Notes
The examples remain illustrative and still require real service connection names, resource group names, manifests, namespaces, App Service names, registry configuration, and health endpoints for a working deployment.
