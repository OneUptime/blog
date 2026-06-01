# Validation Summary: Achieve Operational Excellence Using Azure Well-Architected Framework Principles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Well-Architected Framework
- Azure Operational Excellence
- Bicep
- Azure Resource Manager
- Azure Monitor
- Log Analytics
- Application Insights
- Azure CLI
- Azure App Service deployment slots
- Azure Kubernetes Service
- Azure Automation runbooks
- Service Level Objectives and error budgets

## Sources Consulted
- Microsoft Learn: Operational excellence quick links - https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/
- Microsoft Learn: Operational Excellence design principles - https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/principles
- Microsoft Learn: Architecture strategies for designing a monitoring system - https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/observability
- Microsoft Learn: Architecture strategies for enabling and implementing automation in a workload - https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/enable-automation
- Microsoft Learn: What is Bicep? - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview
- Microsoft Learn: Diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- Microsoft Learn: az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Microsoft Learn: az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Microsoft Learn: Azure App Service deployment best practices - https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: About service meshes in Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/servicemesh-about

## Issues Found
- The post described the Operational Excellence pillar as covering four main areas. Microsoft current guidance frames the pillar around DevOps culture, development standards, observability, automation, and safe deployment practices, with continuous improvement as an ongoing practice. Updated the sentence to match current Azure Well-Architected Framework guidance.
- The Bicep example was introduced as defining both a resource group and storage account, but the snippet only defines a resource group and calls a storage module. Updated the wording so the code description matches the shown Bicep.
- The App Service deployment slot wording said swaps provide "zero downtime." Microsoft documentation describes slot swaps as preventing or eliminating downtime, but actual behavior depends on plan tier, warm-up, and app configuration. Updated the wording to "without downtime."
- The AKS canary deployment wording implied AKS itself provides canary deployments as a direct native feature. Updated it to say AKS can run Kubernetes canary patterns through service meshes or traffic-routing deployment strategies.
- The monitoring section said to enable diagnostic settings for every resource. Azure diagnostic setting support and category groups vary by resource type. Updated it to "every supported resource" and changed the CLI example introduction accordingly.

## Review Notes
The Azure CLI examples match current Microsoft Learn command syntax for `az monitor diagnostic-settings create` and `az monitor metrics alert create`. The local environment did not have Azure CLI installed, so CLI verification used official Microsoft Learn documentation rather than local `az --help` output.
