# Validation Summary: How to Use Azure Arc to Run Azure App Services on Your Own Kubernetes Cluster

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Arc-enabled Kubernetes
- Azure App Service Kubernetes environments
- Azure CLI
- Kubernetes extensions
- Custom locations
- Log Analytics
- GitHub Actions
- Azure Functions

## Sources Consulted
- Microsoft Learn: Use Service Upgrade and Retirement recommendations - https://learn.microsoft.com/en-us/azure/advisor/advisor-how-to-use-service-upgrade-retirement-recommendations
- Microsoft Learn: Migration Checklist - Azure App Service on Arc-enabled Kubernetes to Azure Container Apps on Arc-enabled Kubernetes - https://learn.microsoft.com/en-us/azure/app-service/migrate-app-service-arc
- Microsoft Learn: Available extensions for Azure Arc-enabled Kubernetes clusters - https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/extensions-release
- Microsoft Learn: az appservice kube Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/appservice/kube?view=azure-cli-latest
- Microsoft Learn: Deploy to Azure App Service by using GitHub Actions - https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions

## Issues Found
- The post is centered on installing and using Azure App Service on Arc-enabled Kubernetes. Microsoft retirement guidance lists "Azure App Service on Arc-enabled Kubernetes" under retired services, with a retirement date of March 31, 2026. As of the validation date, May 30, 2026, this tutorial no longer describes a currently usable service path.
- Microsoft's current migration documentation directs existing App Service on Arc-enabled Kubernetes users to migrate workloads and remove the Application services extension before setting up Azure Container Apps on Arc-enabled Kubernetes. That makes the post's deployment-focused guidance outdated rather than correctable with small command edits.
- The current Azure Arc-enabled Kubernetes extensions catalog lists supported extensions such as Azure Container Apps on Azure Arc, but does not list the App Service extension used by the tutorial as a current available extension.
- The Azure CLI still has preview reference pages for `az appservice kube`, but that does not make the end-to-end tutorial valid after the service retirement.

## Review Notes
No README changes were made because fixing the post would require replacing its premise with a migration or Azure Container Apps on Arc tutorial, which is outside a technical correction pass.
