# Validation Summary: How to Deploy Azure Container Apps Using Bicep Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Apps
- Azure Bicep
- Azure Resource Manager templates
- Azure Container Registry
- Azure Log Analytics
- Dapr components for Azure Container Apps
- Azure CLI deployments
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Microsoft.App/containerApps 2026-01-01 Bicep reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2026-01-01/containerapps
- Microsoft Learn: Microsoft.App/managedEnvironments 2026-01-01 Bicep reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2026-01-01/managedenvironments
- Microsoft Learn: Microsoft.App/managedEnvironments/daprComponents 2026-01-01 Bicep reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2026-01-01/managedenvironments/daprcomponents
- Microsoft Learn: Microsoft.ContainerRegistry/registries 2025-11-01 Bicep reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.containerregistry/2025-11-01/registries
- Microsoft Learn: az deployment group CLI reference, https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Azure/arm-deploy GitHub Action documentation, https://github.com/Azure/arm-deploy

## Issues Found
- The Container Apps snippets used `managedEnvironmentId`, which is marked deprecated in the current Microsoft.App containerApps schema. Changed those references to `environmentId`.
- The health probe examples used lowercase `liveness` and `readiness`, but the ARM schema lists `Liveness`, `Readiness`, and `Startup` as the accepted probe type values. Updated the examples to use the documented casing.
- The resource examples used older API versions, including a preview API for Azure Container Registry. Updated Microsoft.App resources to the current stable `2026-01-01` API and Azure Container Registry to the current stable `2025-11-01` API.
- The GitHub Actions workflow used older major versions of the Azure actions. Updated `azure/login` and `azure/arm-deploy` to the current documented v2 examples.

## Review Notes
The examples still use inline placeholder secrets for illustration, but the production tips correctly recommend Key Vault references instead of hardcoding secrets in source control.
