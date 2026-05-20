# Validation Summary: How to Create a Complete Azure Pipelines + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps Environments and approvals
- Azure Container Registry
- Argo CD
- Argo CD Image Updater
- Argo CD Notifications
- Kubernetes and AKS
- Kustomize
- Azure Monitor Application Insights

## Sources Consulted
- Microsoft Learn: Docker@2 task reference - https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/docker-v2
- Microsoft Learn: Azure Pipelines predefined variables - https://learn.microsoft.com/azure/devops/pipelines/build/variables
- Microsoft Learn: Azure Pipelines approvals and checks - https://learn.microsoft.com/azure/devops/pipelines/process/approvals
- Microsoft Learn: Azure Pipelines environments - https://learn.microsoft.com/azure/devops/pipelines/process/environments
- Microsoft Learn: PublishTestResults@2 task reference - https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/publish-test-results-v2
- Argo CD documentation: Automated sync policy - https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD documentation: Sync options - https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD documentation: Declarative repository setup - https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD documentation: Notifications webhook service - https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Image Updater documentation: Application configuration - https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater documentation: Image configuration - https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Kubernetes documentation: Secrets and dockerconfigjson - https://kubernetes.io/docs/concepts/configuration/secret/
- Azure Monitor documentation: Application Insights connection strings - https://learn.microsoft.com/azure/azure-monitor/app/connection-strings
- Azure Monitor documentation: Application Insights telemetry data model - https://learn.microsoft.com/azure/azure-monitor/app/data-model

## Issues Found
- The pipeline built and pushed images tagged with the full `$(Build.SourceVersion)` value, but the deployment update and multi-stage examples wrote a 7-character short SHA tag into manifests. Changed the deployment and Kustomize examples to use the same full image tag that the Docker tasks push.
- The sample Kubernetes Deployment used a short image tag while the pipeline pushed full commit SHA tags. Updated the example image tag to a 40-character SHA-shaped value.
- The Argo CD Image Updater example used legacy Application annotations and the old `latest` strategy name. Updated it to the current `ImageUpdater` CRD style, changed the strategy to `newest-build`, aligned the tag filter with full SHA tags, and referenced the ACR pull secret with `pullsecret:argocd/acr-credentials`.
- The Argo CD Notifications example defined a webhook service and template but no trigger or subscription, so it would not send deployment events as shown. Added a deployment-success trigger and an Application subscription annotation.
- The Docker@2 build task used `dockerfile` instead of the documented `Dockerfile` input casing. Updated it to match the official task reference.

## Review Notes
The Azure Monitor webhook example still uses instrumentation-key based ingestion, which remains recognizable in the Application Insights telemetry model, but current Microsoft guidance prefers connection strings and regional ingestion endpoints for new instrumentation. A future article update could expand that section with a production-ready Azure Monitor ingestion pattern.
